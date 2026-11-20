import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  Cascader,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  InputNumber,
  Radio,
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
import { getOrgBoundaryTypeName } from '@/views/energyCarbon/orgBoundary/constant';
import type { OrgBoundaryType } from '@/views/energyCarbon/orgBoundary/types';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';
import type { OrgTree } from '@/views/energyCarbon/platform/types';

import { trimTrailingDecimalZeros } from '../../../../utils';
import { getEnergyFlowDirectionOptions } from '../../constant';
import {
  useAddEnergyConsumption,
  useBoundaryOptions,
  useEditEnergyConsumption,
  useEnergyConsumptionDetail,
  useNextDocumentNo,
  useResourceOptions,
} from '../../hooks';
import type {
  EnergyConsumptionDataType,
  EnergyConsumptionDetailItem,
  EnergyConsumptionSaveReq,
  EnergyFlowDirection,
  OptionItem,
} from '../../types';

import { useLocalizedFormErrors } from '@/views/energyCarbon/hooks/useLocalizedFormErrors';
import { useEnergyEnum } from '../../../../hooks/useEnergyEnum';
import styles from './index.module.css';

const FORM_ID = 'energy-consumption-form';

export type EnergyConsumptionDrawerTarget =
  | { kind: 'new' }
  | { kind: 'edit'; id: number }
  | { kind: 'view'; id: number }
  | null;

interface DetailFormValues {
  period: [Dayjs, Dayjs];
  boundaryPath: [number, number];
  dataType: EnergyConsumptionDataType;
  flowDirection: EnergyFlowDirection;
  relatedBoundaryId: number;
  energyId: number;
  energyUnitName?: string;
  quantity: string;
  cost?: string;
  dataSource?: string;
  remark?: string;
  productIds: number[];
  equipmentIds: number[];
  measuringInstrumentIds: number[];
}

interface FormValues {
  orgId: number;
  documentNo: string;
  attachments: EnergyConsumptionSaveReq['attachments'];
  details: DetailFormValues[];
}

interface Props {
  target: EnergyConsumptionDrawerTarget;
  orgTree: OrgTree[];
  defaultOrgId?: number;
  onClose: () => void;
}

interface DetailFieldsProps {
  fieldName: number;
  form: ReturnType<typeof Form.useForm<FormValues>>[0];
  disabled: boolean;
  boundaryOptions: ReturnType<typeof useBoundaryOptions>['data'];
  snapshot?: EnergyConsumptionDetailItem;
}

/** 将组织权限树展开成带层级缩进的表单选项，并保留停用状态供新增时禁选。 */
function toFlatOrgOptions(
  nodes: OrgTree[],
  depth = 0,
): Array<{
  label: string;
  value: number;
  disabled: boolean;
  title: string;
}> {
  return nodes.flatMap(node => [
    {
      label: node.name,
      value: node.id,
      disabled: node.orgStatus === 1,
      title: `${'　'.repeat(depth)}${node.name}`,
    },
    ...toFlatOrgOptions(node.children ?? [], depth + 1),
  ]);
}

/** 将详情快照转换成禁用选择器可回显的单个选项，避免主数据删除后名称丢失。 */
function snapshotOption(
  id: number | undefined,
  name: string | undefined,
  code?: string | null,
): OptionItem[] {
  return id === undefined ? [] : [{ id, name: name ?? '-', code }];
}

/** 单条能耗填报字段，按统计边界、数据类型、流向逐级刷新后续选项。 */
function DetailFields({
  fieldName,
  form,
  disabled,
  boundaryOptions,
  snapshot,
}: DetailFieldsProps) {
  useLocale();
  const boundaryPath = Form.useWatch(
    ['details', fieldName, 'boundaryPath'],
    form,
  );
  const dataType = Form.useWatch(['details', fieldName, 'dataType'], form);
  const flowDirection = Form.useWatch(
    ['details', fieldName, 'flowDirection'],
    form,
  );
  const energyId = Form.useWatch(['details', fieldName, 'energyId'], form);
  const boundaryId = boundaryPath?.[1] as number | undefined;
  const dataTypes = useEnergyEnum('energyConsumptionDataType');
  const changedBoundaryRef = useRef<number | undefined>(undefined);
  const { data: resources, isFetching: resourcesFetching } = useResourceOptions(
    boundaryId,
    !disabled,
  );
  useEffect(() => {
    // 只在用户切换边界后按该边界响应剔除失效产品，历史查看保留原快照。
    if (disabled || !resources || changedBoundaryRef.current !== boundaryId)
      return;
    const allowed = new Set(resources.products.map(item => item.id));
    const selected = form.getFieldValue([
      'details',
      fieldName,
      'productIds',
    ]) as number[] | undefined;
    form.setFieldValue(
      ['details', fieldName, 'productIds'],
      (selected ?? []).filter(id => allowed.has(id)),
    );
    changedBoundaryRef.current = undefined;
  }, [boundaryId, disabled, fieldName, form, resources]);
  const boundaryCascaderOptions = useMemo(
    () =>
      (boundaryOptions?.boundaries ?? []).map(group => ({
        value: group.type,
        label: group.typeName,
        children: group.children.map(item => ({
          value: item.id,
          label: item.name,
        })),
      })),
    [boundaryOptions?.boundaries],
  );
  const selectedEnergy = resources?.energies.find(item => item.id === energyId);
  const energyUnitName = disabled
    ? snapshot?.energyUnitName
    : selectedEnergy?.unitName;
  const option = (items: OptionItem[] | undefined) =>
    items?.map(item => {
      const displayValue = item.code
        ? `${item.name}（${item.code}）`
        : item.name;
      return {
        value: item.id,
        label: (
          <Typography.Text ellipsis={{ tooltip: displayValue }}>
            {displayValue}
          </Typography.Text>
        ),
      };
    }) ?? [];
  const viewBoundaryOptions = snapshot
    ? [
        {
          value: snapshot.boundaryType ?? 0,
          label: getOrgBoundaryTypeName(
            snapshot.boundaryType as OrgBoundaryType,
          ),
          children: [
            {
              value: snapshot.boundaryId,
              label: snapshot.boundaryName ?? '-',
            },
          ],
        },
      ]
    : [];
  const relatedOptions = disabled
    ? snapshotOption(snapshot?.relatedBoundaryId, snapshot?.relatedBoundaryName)
    : resources?.relatedBoundaries;
  const energyOptions = disabled
    ? snapshotOption(snapshot?.energyId, snapshot?.energyName)
    : resources?.energies;
  const productOptions = disabled
    ? snapshot?.products?.map(item => ({ ...item }))
    : resources?.products;
  // 产品继续使用租户级资源；设备和器具必须随当前统计边界刷新，避免跨边界选择。
  // REQ-002：产品现改为当前统计边界资源；详情仍取原产品快照。
  const equipmentOptions = disabled
    ? snapshot?.equipments?.map(item => ({ ...item }))
    : resources?.equipments;
  const instrumentOptions = disabled
    ? snapshot?.measuringInstruments?.map(item => ({ ...item }))
    : resources?.measuringInstruments;

  return (
    <Row gutter={FORM_CONFIG.gutter}>
      <Col span={24}>
        <Form.Item
          name={[fieldName, 'period']}
          label={I18N.energyCarbon.analysisTimePeriod}
          rules={[
            {
              required: true,
              message: I18N.energyCarbon.analysisTimePeriodRequired,
            },
          ]}
        >
          <DatePicker.RangePicker
            disabled={disabled}
            maxDate={dayjs()}
            className={styles.fullWidth}
            data-testid={`energy-consumption-period-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name={[fieldName, 'boundaryPath']}
          label={I18N.energyCarbon.analysisStatisticsBoundary}
          rules={[
            {
              required: true,
              message: I18N.energyCarbon.analysisStatisticsBoundaryRequired,
            },
          ]}
        >
          <Cascader
            disabled={disabled}
            options={disabled ? viewBoundaryOptions : boundaryCascaderOptions}
            placeholder={I18N.common.placeholder.select}
            // 级联路径压成单行，长边界名称只在控件内省略，避免撑高右侧字段。
            displayRender={labels => {
              const display = labels.join(' / ');
              return (
                <Typography.Text ellipsis={{ tooltip: display }}>
                  {display}
                </Typography.Text>
              );
            }}
            onChange={path => {
              changedBoundaryRef.current = path?.[1] as number | undefined;
              form.setFieldsValue({
                details: form
                  .getFieldValue('details')
                  .map((item: DetailFormValues, index: number) =>
                    index === fieldName
                      ? {
                          ...item,
                          dataType: undefined,
                          flowDirection: undefined,
                          relatedBoundaryId: undefined,
                          energyId: undefined,
                          energyUnitName: undefined,
                          // 设备和计量器具属于统计边界资源，切换边界后必须重新选择，避免提交旧边界资源。
                          equipmentIds: [],
                          measuringInstrumentIds: [],
                        }
                      : item,
                  ),
              });
            }}
            data-testid={`energy-consumption-boundary-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name={[fieldName, 'dataType']}
          label={I18N.common.fields.dataType}
          rules={[
            {
              required: true,
              message: I18N.energyCarbon.analysisDataTypeRequired,
            },
          ]}
        >
          <Select
            disabled={disabled || !boundaryId}
            options={(dataTypes.data ?? [])
              .map(item => ({ value: Number(item.code), label: item.name }))
              .sort(
                (a, b) =>
                  [5, 1, 2, 3, 4].indexOf(a.value) -
                  [5, 1, 2, 3, 4].indexOf(b.value),
              )}
            placeholder={I18N.common.placeholder.select}
            onChange={(nextDataType: EnergyConsumptionDataType) => {
              const currentFlowDirection = form.getFieldValue([
                'details',
                fieldName,
                'flowDirection',
              ]) as EnergyFlowDirection | undefined;
              const legalFlowDirections =
                getEnergyFlowDirectionOptions(nextDataType);
              if (
                currentFlowDirection !== undefined &&
                !legalFlowDirections.some(
                  item => item.value === currentFlowDirection,
                )
              ) {
                form.setFieldValue(
                  ['details', fieldName, 'flowDirection'],
                  undefined,
                );
              }
              form.setFieldValue(
                ['details', fieldName, 'relatedBoundaryId'],
                undefined,
              );
              form.setFieldValue(['details', fieldName, 'energyId'], undefined);
            }}
            data-testid={`energy-consumption-data-type-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name={[fieldName, 'flowDirection']}
          label={I18N.common.shared.exchangeDirection}
          rules={[
            {
              required: true,
              message: I18N.energyCarbon.analysisFlowDirectionRequired,
            },
          ]}
        >
          <Radio.Group
            disabled={disabled || !dataType}
            options={getEnergyFlowDirectionOptions(dataType)}
            onChange={() => {
              // 流向变化会改变关联边界和能源的可选语义，先清空依赖字段避免提交旧值。
              form.setFieldValue(
                ['details', fieldName, 'relatedBoundaryId'],
                undefined,
              );
              form.setFieldValue(['details', fieldName, 'energyId'], undefined);
            }}
            data-testid={`energy-consumption-flow-direction-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name={[fieldName, 'relatedBoundaryId']}
          label={
            flowDirection === 1
              ? I18N.energyCarbon.analysisSourceBoundary
              : flowDirection === 2
              ? I18N.energyCarbon.analysisDestinationBoundary
              : I18N.energyCarbon.analysisRelatedBoundary
          }
          rules={[
            {
              required: true,
              message: I18N.energyCarbon.analysisRelatedBoundaryRequired,
            },
          ]}
        >
          <Select
            disabled={disabled || !flowDirection}
            loading={resourcesFetching}
            options={option(relatedOptions)}
            placeholder={I18N.common.placeholder.select}
            data-testid={`energy-consumption-related-boundary-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name={[fieldName, 'energyId']}
          label={I18N.energyCarbon.energyName}
          rules={[
            {
              required: true,
              message: I18N.energyCarbon.analysisEnergyRequired,
            },
          ]}
        >
          <Select
            disabled={disabled || !flowDirection}
            loading={resourcesFetching}
            options={option(energyOptions)}
            placeholder={I18N.common.placeholder.select}
            data-testid={`energy-consumption-energy-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item label={I18N.common.fields.quantity} required>
          <Space.Compact className={styles.numberGroup}>
            <Form.Item
              name={[fieldName, 'quantity']}
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
                  },
                },
              ]}
            >
              <InputNumber
                stringMode
                precision={3}
                // 数量最多保留 3 位小数，失焦展示时去掉末尾无意义的 0。
                formatter={(value, info) =>
                  info.userTyping
                    ? info.input
                    : trimTrailingDecimalZeros(String(value ?? ''))
                }
                disabled={disabled}
                placeholder={I18N.common.placeholder.input}
                className={styles.numberInput}
                data-testid={`energy-consumption-quantity-${fieldName}`}
              />
            </Form.Item>
            <Input
              className={styles.numberUnit}
              value={energyUnitName ?? '-'}
              disabled
              title={energyUnitName ?? '-'}
              data-testid={`energy-consumption-quantity-unit-${fieldName}`}
            />
          </Space.Compact>
        </Form.Item>
      </Col>
      <Col xs={24} sm={12}>
        <Form.Item
          name={[fieldName, 'cost']}
          label={I18N.energyCarbon.analysisValueYuan}
          rules={[
            {
              validator: async (_rule, value) => {
                // 先校验非负范围，再校验小数精度；任一不满足都阻止提交。
                if (Number(value) < 0) {
                  throw new Error(I18N.energyCarbon.analysisValueNonnegative);
                }
                const fraction = String(value ?? '').split('.')[1];
                if (fraction && fraction.length > 3) {
                  throw new Error(I18N.energyCarbon.analysisValuePrecision);
                }
              },
            },
          ]}
        >
          <InputNumber
            stringMode
            formatter={(value, info) =>
              info.userTyping
                ? info.input
                : trimTrailingDecimalZeros(String(value ?? ''))
            }
            disabled={disabled}
            placeholder={I18N.common.placeholder.input}
            className={styles.fullWidth}
            data-testid={`energy-consumption-cost-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item
          name={[fieldName, 'productIds']}
          label={I18N.energyCarbon.relatedProduct}
        >
          <Select
            mode='multiple'
            disabled={disabled}
            loading={resourcesFetching}
            options={option(productOptions)}
            placeholder={I18N.common.placeholder.select}
            data-testid={`energy-consumption-products-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item
          name={[fieldName, 'equipmentIds']}
          label={I18N.energyCarbon.energyEquipment}
        >
          <Select
            mode='multiple'
            disabled={disabled}
            loading={resourcesFetching}
            options={option(equipmentOptions)}
            placeholder={I18N.common.placeholder.select}
            data-testid={`energy-consumption-equipments-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item
          name={[fieldName, 'measuringInstrumentIds']}
          label={I18N.energyCarbon.measuringInstrument}
        >
          <Select
            mode='multiple'
            disabled={disabled}
            loading={resourcesFetching}
            options={option(instrumentOptions)}
            placeholder={I18N.common.placeholder.select}
            data-testid={`energy-consumption-instruments-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item
          name={[fieldName, 'dataSource']}
          label={I18N.common.fields.dataSource}
        >
          <Input
            disabled={disabled}
            maxLength={100}
            placeholder={I18N.common.placeholder.input}
            data-testid={`energy-consumption-source-${fieldName}`}
          />
        </Form.Item>
      </Col>
      <Col span={24}>
        <Form.Item
          name={[fieldName, 'remark']}
          label={I18N.common.fields.remark}
        >
          <Input.TextArea
            disabled={disabled}
            maxLength={500}
            rows={3}
            placeholder={I18N.common.placeholder.input}
            data-testid={`energy-consumption-remark-${fieldName}`}
          />
        </Form.Item>
      </Col>
    </Row>
  );
}

/** 业务检索：能耗数据填报 - 新增、编辑或查看能耗单据及明细 */
export default function EnergyConsumptionFormDrawer({
  target,
  orgTree,
  defaultOrgId,
  onClose,
}: Props) {
  useLocale();
  // 关闭动画期间保留最后一次操作目标，避免 target 清空后标题和表单瞬间切回新增空态。
  const activeTargetRef = useRef<Exclude<
    EnergyConsumptionDrawerTarget,
    null
  > | null>(null);
  if (target) {
    activeTargetRef.current = target;
  }
  const activeTarget = target ?? activeTargetRef.current;
  const open = target !== null;
  const isView = activeTarget?.kind === 'view';
  const isEdit = activeTarget?.kind === 'edit';
  const detailId =
    activeTarget && activeTarget.kind !== 'new' ? activeTarget.id : undefined;
  const [form] = Form.useForm<FormValues>();
  useLocalizedFormErrors(form);
  const selectedOrgId = Form.useWatch('orgId', form);
  const { data: detail, isFetching: detailLoading } =
    useEnergyConsumptionDetail(detailId);
  const { data: boundaryOptions, isFetching: boundaryLoading } =
    useBoundaryOptions(selectedOrgId, open && !isView);
  const { mutateAsync: allocateDocumentNo, isLoading: allocating } =
    useNextDocumentNo();
  const { mutate: add, isLoading: adding } = useAddEnergyConsumption();
  const { mutate: edit, isLoading: editing } = useEditEnergyConsumption();
  const orgOptions = useMemo(() => toFlatOrgOptions(orgTree), [orgTree]);

  useEffect(() => {
    if (!open) {
      return;
    }
    // 每次重新打开先清除上一目标的字段值和校验状态，再按新增或详情上下文完整回填。
    form.resetFields();
    if (detail) {
      form.setFieldsValue({
        orgId: detail.orgId,
        documentNo: detail.documentNo,
        attachments: detail.attachments ?? [],
        details: detail.details.map(item => ({
          period: [dayjs(item.startDate), dayjs(item.endDate)],
          boundaryPath: [item.boundaryType ?? 0, item.boundaryId],
          // 详情接口枚举按字符串返回，转为数字后才能匹配下拉选项。
          dataType: Number(item.dataType) as EnergyConsumptionDataType,
          flowDirection: Number(item.flowDirection) as EnergyFlowDirection,
          relatedBoundaryId: item.relatedBoundaryId,
          energyId: item.energyId,
          energyUnitName: item.energyUnitName,
          quantity: String(item.quantity),
          cost:
            item.cost === null || item.cost === undefined
              ? undefined
              : String(item.cost),
          dataSource: item.dataSource ?? undefined,
          remark: item.remark ?? undefined,
          productIds: item.products?.map(resource => resource.id) ?? [],
          equipmentIds: item.equipments?.map(resource => resource.id) ?? [],
          measuringInstrumentIds:
            item.measuringInstruments?.map(resource => resource.id) ?? [],
        })),
      });
      return;
    }
    if (target?.kind === 'new') {
      form.setFieldsValue({
        attachments: [],
        details: [
          {
            productIds: [],
            equipmentIds: [],
            measuringInstrumentIds: [],
          },
        ],
      });
      if (defaultOrgId) {
        form.setFieldValue('orgId', defaultOrgId);
        allocateDocumentNo(defaultOrgId).then(documentNo =>
          form.setFieldValue('documentNo', documentNo),
        );
      }
    }
  }, [allocateDocumentNo, defaultOrgId, detail, form, open, target?.kind]);

  const handleOrgChange = (orgId: number) => {
    const currentDetail = form.getFieldValue('details')?.[0];
    form.setFieldValue('details', [
      {
        productIds: currentDetail?.productIds ?? [],
        equipmentIds: currentDetail?.equipmentIds ?? [],
        measuringInstrumentIds: currentDetail?.measuringInstrumentIds ?? [],
      },
    ]);
    allocateDocumentNo(orgId).then(documentNo =>
      form.setFieldValue('documentNo', documentNo),
    );
  };

  const handleFinish = (values: FormValues) => {
    const detail = values.details[0];
    const request: EnergyConsumptionSaveReq = {
      orgId: values.orgId,
      documentNo: values.documentNo.trim(),
      attachments: values.attachments ?? [],
      startDate: detail.period[0].format('YYYY-MM-DD'),
      endDate: detail.period[1].format('YYYY-MM-DD'),
      boundaryId: detail.boundaryPath[1],
      dataType: detail.dataType,
      flowDirection: detail.flowDirection,
      relatedBoundaryId: detail.relatedBoundaryId,
      energyId: detail.energyId,
      quantity: String(detail.quantity),
      cost: detail.cost === undefined ? undefined : String(detail.cost),
      dataSource: detail.dataSource?.trim() || undefined,
      remark: detail.remark?.trim() || undefined,
      productIds: detail.productIds ?? [],
      equipmentIds: detail.equipmentIds ?? [],
      measuringInstrumentIds: detail.measuringInstrumentIds ?? [],
    };
    if (isEdit && detailId) {
      edit({ ...request, id: detailId }, { onSuccess: onClose });
      return;
    }
    add(request, { onSuccess: onClose });
  };

  return (
    <Drawer
      title={
        isView
          ? I18N.energyCarbon.analysisEnergyDataDetails
          : isEdit
          ? I18N.energyCarbon.analysisEditEnergyData
          : I18N.energyCarbon.analysisAddEnergyData
      }
      open={open}
      onClose={onClose}
      destroyOnClose
      size='large'
      data-testid='energy-consumption-form-drawer'
      footer={
        <FormDrawerFooter
          isView={Boolean(isView)}
          onClose={onClose}
          testIdPrefix='energy-consumption-form'
          formId={FORM_ID}
          saveLoading={
            adding || editing || allocating || detailLoading || boundaryLoading
          }
        />
      }
    >
      <Form<FormValues>
        id={FORM_ID}
        form={form}
        layout='vertical'
        requiredMark={!isView}
        disabled={detailLoading}
        onFinish={handleFinish}
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
                disabled={Boolean(isView || isEdit)}
                showSearch
                optionFilterProp='title'
                options={orgOptions}
                optionRender={option => (
                  <Typography.Text ellipsis={{ tooltip: option.data.title }}>
                    {option.data.title}
                  </Typography.Text>
                )}
                placeholder={I18N.common.placeholder.select}
                onChange={handleOrgChange}
                data-testid='energy-consumption-org'
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
                  message: I18N.energyCarbon.analysisDocumentNumberRequired,
                },
                {
                  pattern: /^NH-/,
                  message: I18N.energyCarbon.analysisEnergyNumberPrefix,
                },
              ]}
            >
              <Input
                disabled={isView}
                maxLength={100}
                placeholder={I18N.common.placeholder.input}
                data-testid='energy-consumption-document-no'
              />
            </Form.Item>
          </Col>
        </Row>

        <Form.List
          name='details'
          rules={[
            {
              validator: async (_rule, details) => {
                if (!details?.length) {
                  throw new Error(
                    I18N.energyCarbon.analysisEnergyDetailsRequired,
                  );
                }
                if (details.length !== 1) {
                  throw new Error(I18N.energyCarbon.analysisSingleEnergyDetail);
                }
              },
            },
          ]}
        >
          {(fields, _operations, { errors }) => (
            <>
              {fields.map((field, index) => (
                <DetailFields
                  key={field.key}
                  fieldName={field.name}
                  form={form}
                  disabled={Boolean(isView)}
                  boundaryOptions={boundaryOptions}
                  snapshot={detail?.details[index]}
                />
              ))}
              <Form.ErrorList errors={errors} />
            </>
          )}
        </Form.List>

        {isView && detail?.auditOpinion ? (
          <Form.Item
            label={I18N.energyCarbon.analysisLatestReviewComment}
            className={styles.auditOpinion}
          >
            <Input.TextArea disabled value={detail.auditOpinion} rows={3} />
          </Form.Item>
        ) : null}

        <Form.Item
          name='attachments'
          label={I18N.energyCarbon.analysisSupportingMaterials}
        >
          <FileUpload
            disabled={isView}
            maxCount={10}
            maxSizeMB={50}
            data-testid='energy-consumption-attachments'
          />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
