import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Typography,
} from 'antd';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef } from 'react';

import FileUpload from '@/views/energyCarbon/components/FileUpload';
import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';
import type { OrgTree } from '@/views/energyCarbon/platform/types';

import type { FileInfo } from '@/views/energyCarbon/components/FileUpload';
import { useLocalizedFormErrors } from '@/views/energyCarbon/hooks/useLocalizedFormErrors';
import { trimTrailingDecimalZeros } from '../../../../utils';
import { PRODUCTION_INDICATOR_TYPE } from '../../constant';
import {
  useAddProductionData,
  useEditProductionData,
  useProductionDataDetail,
  useProductionDocumentNo,
  useProductionIndicatorOptions,
} from '../../hooks';
import type {
  ProductionDataSaveReq,
  ProductionIndicatorOption,
} from '../../types';
import styles from './index.module.css';

export type ProductionDataDrawerTarget =
  | { kind: 'new'; defaultOrgId?: number }
  | { kind: 'edit'; id: number }
  | { kind: 'view'; id: number }
  | null;

interface Props {
  target: ProductionDataDrawerTarget;
  onClose: () => void;
}

interface FormValues {
  orgId: number;
  documentNo: string;
  period: [Dayjs, Dayjs];
  indicatorKey: string;
  quantity: string;
  dataSource?: string;
  remark?: string;
  attachments: FileInfo[];
}

/** 将组织权限树展开成带层级缩进的选项，同时保留真实组织 ID 供提交使用。 */
function flattenOrgOptions(
  nodes: OrgTree[],
  depth = 0,
): Array<{
  label: string;
  value: number;
  title: string;
}> {
  return nodes.flatMap(node => [
    {
      label: node.name,
      value: node.id,
      title: `${'　'.repeat(depth)}${node.name}`,
    },
    ...flattenOrgOptions(node.children ?? [], depth + 1),
  ]);
}

/** 将固定指标或具体产品编码为表单唯一键，避免不同来源选项值冲突。 */
function optionKey(option: ProductionIndicatorOption) {
  return option.indicatorType === PRODUCTION_INDICATOR_TYPE.PRODUCT
    ? `${option.indicatorType}:${option.productId}`
    : String(option.indicatorType);
}

/** 把表单指标唯一键还原为后端需要的指标类型和可选产品 ID。 */
function parseIndicatorKey(value: string) {
  const [typeText, productText] = value.split(':');
  return {
    indicatorType: Number(typeText) as ProductionDataSaveReq['indicatorType'],
    productId: productText ? Number(productText) : undefined,
  };
}

/**
 * 业务检索：生产数据填报 - 新增、编辑或查看生产数据单据
 * 生产数据新增、编辑和详情共用抽屉。
 * 产品名称、单位来自指标选项，表单不请求或展示产品系数。
 */
export default function ProductionDataFormDrawer({ target, onClose }: Props) {
  const { locale } = useLocale();
  const [form] = Form.useForm<FormValues>();
  useLocalizedFormErrors(form);
  const initializedTargetRef = useRef('');
  // 关闭动画期间保留最后一次操作目标，避免 target 清空后标题瞬间切换为详情态。
  const activeTargetRef = useRef<Exclude<
    ProductionDataDrawerTarget,
    null
  > | null>(null);
  if (target) {
    activeTargetRef.current = target;
  }
  const activeTarget = target ?? activeTargetRef.current;
  const isOpen = target !== null;
  const isView = activeTarget?.kind === 'view';
  const detailId =
    target?.kind === 'edit' || target?.kind === 'view' ? target.id : undefined;
  const { data: detail, isFetching: detailLoading } =
    useProductionDataDetail(detailId);
  const { data: indicatorOptions = [], isFetching: optionsLoading } =
    useProductionIndicatorOptions();
  const { data: orgTree = [] } = useDataPermissionOrgTree({
    enabled: isOpen,
  });
  // 组织权限树展开为下拉选项；指标选项则转换为固定指标或具体产品的唯一表单值。
  const orgOptions = useMemo(() => flattenOrgOptions(orgTree), [orgTree]);
  const selectOptions = useMemo(
    () =>
      indicatorOptions.map(option => ({
        label: (() => {
          const displayValue =
            option.indicatorType === PRODUCTION_INDICATOR_TYPE.PRODUCT
              ? I18N.template(I18N.energyCarbon.analysisProductLabel, {
                  val1: option.indicatorName,
                })
              : option.indicatorName;
          return (
            <Typography.Text ellipsis={{ tooltip: displayValue }}>
              {displayValue}
            </Typography.Text>
          );
        })(),
        value: optionKey(option),
      })),
    [locale, indicatorOptions],
  );
  const selectedIndicatorKey = Form.useWatch('indicatorKey', form);
  // 当前指标决定数量单位展示，提交时仍只发送指标类型和产品 ID。
  const selectedIndicator = indicatorOptions.find(
    option => optionKey(option) === selectedIndicatorKey,
  );
  const unitName = selectedIndicator?.unitName?.trim() || '-';
  // 单位区域按字符数逐级增长，长单位最多占 120px，避免挤压数量输入区域。
  const unitLength = Math.min(Math.max(Array.from(unitName).length, 1), 6);
  const { mutateAsync: generateDocumentNo, isLoading: generatingNo } =
    useProductionDocumentNo();
  const { mutateAsync: addData, isLoading: adding } = useAddProductionData();
  const { mutateAsync: editData, isLoading: editing } = useEditProductionData();

  useEffect(() => {
    // 同一目标重复渲染时不再次生成单据号或覆盖用户编辑内容。
    if (!target) {
      return;
    }
    const targetKey =
      target.kind === 'new' ? 'new' : `${target.kind}:${target.id}`;
    if (initializedTargetRef.current === targetKey) {
      return;
    }
    if (target.kind === 'new') {
      // 新增态使用默认可写组织，并在组织确定后主动占用该组织当前单据号。
      const orgId = target.defaultOrgId ?? orgOptions[0]?.value;
      if (!orgId) {
        return;
      }
      initializedTargetRef.current = targetKey;
      form.resetFields();
      form.setFieldValue('orgId', orgId);
      generateDocumentNo(orgId).then(documentNo => {
        form.setFieldValue('documentNo', documentNo);
      });
      return;
    }
    if (!detail) {
      return;
    }
    // 编辑和详情统一使用接口快照回填，历史月份、单位和附件不从当前主数据重算。
    form.resetFields();
    initializedTargetRef.current = targetKey;
    form.setFieldsValue({
      orgId: detail.orgId,
      documentNo: detail.documentNo,
      period: [
        dayjs(`${detail.startMonth}-01`),
        dayjs(`${detail.endMonth}-01`),
      ],
      indicatorKey:
        detail.indicatorType === PRODUCTION_INDICATOR_TYPE.PRODUCT
          ? `${detail.indicatorType}:${detail.productId}`
          : String(detail.indicatorType),
      quantity: String(detail.quantity),
      dataSource: detail.dataSource ?? undefined,
      remark: detail.remark ?? undefined,
      attachments: detail.attachments ?? [],
    });
  }, [detail, form, generateDocumentNo, orgOptions, target]);

  const handleOrgChange = (orgId: number) => {
    if (target?.kind !== 'new') {
      return;
    }
    // 新增态切换组织重新占用该组织当前秒单据号；编辑态保留用户可修改的原编号。
    generateDocumentNo(orgId).then(documentNo => {
      form.setFieldValue('documentNo', documentNo);
    });
  };

  const handleFinish = async (values: FormValues) => {
    // 表单唯一键拆回后端契约，并统一修剪可选文本后再区分新增或编辑提交。
    const indicator = parseIndicatorKey(values.indicatorKey);
    const data: ProductionDataSaveReq = {
      orgId: values.orgId,
      documentNo: values.documentNo.trim(),
      startMonth: values.period[0].format('YYYY-MM'),
      endMonth: values.period[1].format('YYYY-MM'),
      indicatorType: indicator.indicatorType,
      productId: indicator.productId,
      quantity: String(values.quantity),
      dataSource: values.dataSource?.trim() || undefined,
      remark: values.remark?.trim() || undefined,
      attachments: values.attachments ?? [],
    };
    if (target?.kind === 'edit') {
      await editData({ ...data, id: target.id });
    } else {
      await addData(data);
    }
    onClose();
  };

  const title =
    activeTarget?.kind === 'new'
      ? I18N.energyCarbon.analysisAddProductionData
      : activeTarget?.kind === 'edit'
      ? I18N.energyCarbon.analysisEditProductionData
      : I18N.energyCarbon.analysisProductionDataDetails;
  const formId = 'production-data-form';

  const handleAfterOpenChange = (visible: boolean) => {
    if (visible) return;
    // 抽屉完全关闭后再清空初始化标记和表单，关闭动画保留刚完成的新增或编辑内容。
    initializedTargetRef.current = '';
  };

  return (
    <Drawer
      open={isOpen}
      title={title}
      size='large'
      destroyOnClose
      loading={detailLoading}
      onClose={onClose}
      afterOpenChange={handleAfterOpenChange}
      footer={
        <FormDrawerFooter
          isView={Boolean(isView)}
          onClose={onClose}
          formId={formId}
          testIdPrefix='production-data-form'
          saveLoading={adding || editing}
        />
      }
    >
      <Form<FormValues>
        id={formId}
        form={form}
        layout='vertical'
        requiredMark={!isView}
        initialValues={{ attachments: [] }}
        onFinish={values => {
          handleFinish(values);
        }}
      >
        <Row gutter={FORM_CONFIG.gutter}>
          <Col xs={24} sm={12}>
            <Form.Item
              name='orgId'
              label={I18N.common.fields.organization}
              rules={[
                {
                  required: true,
                  message: I18N.common.validation.organizationRequired,
                },
              ]}
            >
              <Select
                showSearch
                optionFilterProp='title'
                options={orgOptions}
                optionRender={option => (
                  <Typography.Text ellipsis={{ tooltip: option.data.title }}>
                    {option.data.title}
                  </Typography.Text>
                )}
                placeholder={I18N.common.placeholder.select}
                disabled={isView}
                onChange={handleOrgChange}
                data-testid='production-data-form-org'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name='documentNo'
              label={I18N.energyCarbon.analysisReportNumber}
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.analysisReportNumberRequired,
                },
                {
                  pattern: /^SC-/,
                  message: I18N.energyCarbon.analysisProductionNumberPrefix,
                },
              ]}
            >
              <Input
                maxLength={100}
                placeholder={I18N.common.placeholder.input}
                disabled={isView}
                suffix={
                  generatingNo
                    ? I18N.energyCarbon.analysisGenerating
                    : undefined
                }
                data-testid='production-data-form-no'
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name='period'
              label={I18N.energyCarbon.analysisTimePeriod}
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.analysisTimePeriodRequired,
                },
              ]}
            >
              <DatePicker.RangePicker
                className={styles.fullWidth}
                picker='month'
                format='YYYY-MM'
                placeholder={[
                  I18N.common.placeholder.select,
                  I18N.common.placeholder.select,
                ]}
                disabled={isView}
                disabledDate={current => current.isAfter(dayjs(), 'month')}
                data-testid='production-data-form-period'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item
              name='indicatorKey'
              label={I18N.energyCarbon.analysisProductionIndicator}
              rules={[
                {
                  required: true,
                  message:
                    I18N.energyCarbon.analysisProductionIndicatorRequired,
                },
              ]}
            >
              <Select
                showSearch
                optionFilterProp='label'
                options={selectOptions}
                loading={optionsLoading}
                placeholder={I18N.common.placeholder.select}
                disabled={isView}
                data-testid='production-data-form-indicator'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label={I18N.common.fields.quantity} required>
              <Space.Compact className={styles.quantityGroup}>
                <Form.Item
                  name='quantity'
                  noStyle
                  rules={[
                    {
                      required: true,
                      message: I18N.common.validation.quantityRequired,
                    },
                    {
                      validator: async (_rule, value) => {
                        // 保留用户输入的负数并明确拦截，避免控件先静默改成 0 后绕过校验。
                        if (Number(value) < 0) {
                          throw new Error(
                            I18N.energyCarbon.analysisQuantityNonnegative,
                          );
                        }
                        const fraction = String(value ?? '').split('.')[1];
                        if (fraction && fraction.length > 4) {
                          throw new Error(
                            I18N.energyCarbon.analysisQuantityPrecision,
                          );
                        }
                      },
                    },
                  ]}
                >
                  <InputNumber
                    className={styles.quantityInput}
                    stringMode
                    formatter={(value, info) =>
                      info.userTyping
                        ? info.input
                        : trimTrailingDecimalZeros(String(value ?? ''))
                    }
                    placeholder={I18N.common.placeholder.input}
                    disabled={isView}
                    data-testid='production-data-form-quantity'
                  />
                </Form.Item>
                <Input
                  className={styles.quantityUnit}
                  value={unitName}
                  disabled
                  title={unitName}
                  data-unit-length={unitLength}
                  data-testid='production-data-form-unit'
                />
              </Space.Compact>
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name='dataSource' label={I18N.common.fields.dataSource}>
              <Input
                maxLength={100}
                placeholder={I18N.common.placeholder.input}
                disabled={isView}
                data-testid='production-data-form-source'
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name='remark' label={I18N.common.fields.remark}>
              <Input.TextArea
                rows={4}
                maxLength={500}
                placeholder={I18N.common.placeholder.input}
                disabled={isView}
                data-testid='production-data-form-remark'
              />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item
              name='attachments'
              label={I18N.energyCarbon.analysisSupportingMaterials}
            >
              <FileUpload
                maxCount={10}
                maxSizeMB={50}
                disabled={isView}
                uploadUrl='/energy/productionData/attachment/upload'
                data-testid='production-data-form-attachments'
              />
            </Form.Item>
          </Col>
          {isView && detail?.auditOpinion ? (
            <Col span={24}>
              <Form.Item label={I18N.common.audit.comment}>
                <Input.TextArea value={detail.auditOpinion} disabled rows={3} />
              </Form.Item>
            </Col>
          ) : null}
        </Row>
      </Form>
    </Drawer>
  );
}
