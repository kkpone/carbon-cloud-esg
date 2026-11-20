import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：碳配额测算 - 按组织和行业维护政策测算明细
 * 路由：/energyCarbon/carbonAssetManagement/quota
 */
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Table,
  Tag,
  TreeSelect,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { z } from 'zod';

import I18N from '@/lang/I18N';
import AuthButton from '@/views/energyCarbon/components/AuthButton';
import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { createTableActionsColumn } from '@/views/energyCarbon/components/TableActions';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import {
  FORM_CONFIG,
  TABLE_DEFAULT_PAGE_SIZE,
} from '@/views/energyCarbon/platform/config';
import { confirmDelete } from '@/views/energyCarbon/platform/confirmDelete';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';
import { formatDecimalValue, trimTrailingDecimalZeros } from '../../utils';

import styles from './index.module.css';
import {
  addCarbonQuotaApi,
  deleteCarbonQuotaApi,
  editCarbonQuotaApi,
  getCarbonQuotaDetailApi,
  getCarbonQuotaPageApi,
} from './services';
import type {
  CarbonQuotaDetail,
  CarbonQuotaIndustry,
  CarbonQuotaRecord,
  CarbonQuotaSave,
  PowerUnitType,
} from './types';

const PAGE_PERMISSION = '/energyCarbon/carbonAssetManagement/quota';
const QUOTA_FORM_ID = 'carbon-quota-form';
/** 回显和失焦时去小数尾零，输入期间保留原内容与既有精度限制。 */
function formatQuotaInputNumber(
  value: string | undefined,
  info: { userTyping: boolean; input: string },
): string {
  return info.userTyping
    ? info.input
    : trimTrailingDecimalZeros(String(value ?? ''));
}
const BUTTON_PERMISSION = {
  ADD: `${PAGE_PERMISSION}/add`,
  DETAIL: `${PAGE_PERMISSION}/detail`,
  EDIT: `${PAGE_PERMISSION}/edit`,
  DELETE: `${PAGE_PERMISSION}/delete`,
} as const;
const getIndustryOptions = () => [
  { label: I18N.energyCarbon.assetPowerFacilities, value: 1 },
  { label: I18N.energyCarbon.assetSteel, value: 2 },
  { label: I18N.energyCarbon.assetCementClinker, value: 3 },
  { label: I18N.energyCarbon.assetAluminiumSmelting, value: 4 },
];
const getUnitOptions = () => [
  { label: I18N.energyCarbon.assetCoalUnitAbove300Mw, value: 1 },
  { label: I18N.energyCarbon.assetCoalUnitUpTo300Mw, value: 2 },
  { label: I18N.energyCarbon.assetUnconventionalCoalUnit, value: 3 },
  { label: I18N.energyCarbon.assetGasUnit, value: 4 },
];
const getDetailNameLabels = (): Record<CarbonQuotaIndustry, string> => ({
  1: I18N.energyCarbon.assetUnitName,
  2: I18N.energyCarbon.assetSteelEnterpriseName,
  3: I18N.energyCarbon.assetClinkerLineName,
  4: I18N.energyCarbon.assetAluminiumProcessName,
});

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  orgId: z.coerce.number().int().positive().optional(),
  industry: z.coerce.number().int().min(1).max(4).optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <CarbonQuotaPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

type DrawerTarget =
  | { mode: 'add'; orgId?: number }
  | { mode: 'edit' | 'view'; id: number }
  | null;

/** 维护碳配额行业明细；发电与非发电行业使用互斥字段矩阵，计算结果只在详情展示。 */
function QuotaFormDrawer({
  target,
  onClose,
}: {
  target: DrawerTarget;
  onClose: () => void;
}) {
  const { locale } = useLocale();
  const { message } = App.useApp();
  const [form] = Form.useForm<CarbonQuotaSave>();
  const validationLocale = useRef(locale);
  useEffect(() => {
    if (validationLocale.current === locale) return;
    validationLocale.current = locale;
    // 切换语言只刷新已显示的校验错误，不重置表单或触发未报错字段的校验。
    const invalidFields = form
      .getFieldsError()
      .filter(({ errors }) => errors.length > 0)
      .map(({ name }) => name);
    if (invalidFields.length)
      form.validateFields(invalidFields).catch(() => undefined);
  }, [form, locale]);
  const [displayTarget, setDisplayTarget] = useState<Exclude<
    DrawerTarget,
    null
  > | null>(target);
  const activeTarget = target ?? displayTarget;
  const industry = Form.useWatch('industry', form);
  const details = Form.useWatch('details', form) ?? [];
  const isView = activeTarget?.mode === 'view';
  const detailId =
    activeTarget && 'id' in activeTarget ? activeTarget.id : undefined;
  const queryClient = useQueryClient();
  // 组织选择只来自当前数据权限树，后端仍会校验租户归属和组织状态。
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree, { disableInactive: true }),
    [orgTree],
  );
  const { data: detail, isFetching } = useQuery({
    queryKey: ['carbon-quota', 'detail', detailId],
    queryFn: () =>
      getCarbonQuotaDetailApi(detailId as number).then(
        response => response.data.data,
      ),
    enabled: detailId !== undefined,
  });
  const saveMutation = useMutation({
    mutationFn: async (values: CarbonQuotaSave) => {
      if (activeTarget?.mode === 'edit') {
        await editCarbonQuotaApi({ ...values, id: activeTarget.id });
      } else {
        await addCarbonQuotaApi(values);
      }
    },
    onSuccess: async () => {
      // 编辑后先等待当前详情和列表完成重取，再关闭抽屉，立即查看时不会命中旧详情缓存。
      const detailKey =
        activeTarget?.mode === 'edit'
          ? ['carbon-quota', 'detail', activeTarget.id]
          : undefined;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['carbon-quota', 'list'] }),
        detailKey
          ? queryClient.invalidateQueries({ queryKey: detailKey })
          : Promise.resolve(),
      ]);
      message.success(
        activeTarget?.mode === 'edit'
          ? I18N.common.feedback.saveSuccess
          : I18N.common.feedback.addSuccess,
      );
      onClose();
    },
  });

  // 新增非发电统一2026；历史详情null仍显示旧系数输入，不提交算法标识。
  const use2026 =
    industry !== 1 &&
    (activeTarget?.mode === 'add' || detail?.algorithmVersion === 2026);
  const formulaFields =
    industry === 2
      ? [
          { name: 'annualEmission', label: I18N.energyCarbon.steelEmission },
          { name: 'ironEmission', label: I18N.energyCarbon.steelIronEmission },
          {
            name: 'sinterEmission',
            label: I18N.energyCarbon.steelSinterEmission,
          },
          {
            name: 'ironOutput',
            label: I18N.energyCarbon.steelIronOutput,
            positive: true,
          },
          {
            name: 'industryBalance',
            label: I18N.energyCarbon.steelBalance,
            positive: true,
          },
        ]
      : industry === 3
      ? [
          { name: 'annualEmission', label: I18N.energyCarbon.cementEmission },
          {
            name: 'productEmissionIntensity',
            label: I18N.energyCarbon.cementIntensity,
          },
          {
            name: 'industryBalance',
            label: I18N.energyCarbon.cementBalance,
            positive: true,
          },
        ]
      : [
          {
            name: 'annualEmission',
            label: I18N.energyCarbon.aluminiumEmission,
          },
          {
            name: 'productEmissionIntensity',
            label: I18N.energyCarbon.aluminiumIntensity,
          },
          {
            name: 'industryBalance',
            label: I18N.energyCarbon.aluminiumBalance,
            positive: true,
          },
        ];

  const submit = (values: CarbonQuotaSave) => {
    saveMutation.mutate(values);
  };

  useEffect(() => {
    if (target) setDisplayTarget(target);
  }, [target]);

  useEffect(() => {
    if (!activeTarget) return;
    // 新增按行业政策默认年份起步；编辑只回填输入字段，不把服务端计算结果提交回去。
    if (activeTarget.mode === 'add') {
      form.resetFields();
      form.setFieldsValue({
        orgId: activeTarget.orgId,
        industry: 1,
        quotaYear: 2024,
        details: [{} as CarbonQuotaSave['details'][number]],
      });
    } else if (detail) {
      form.setFieldsValue({
        orgId: detail.orgId,
        quotaYear: detail.quotaYear,
        industry: detail.industry,
        details: detail.details.map(
          ({
            detailName,
            powerUnitType,
            generation,
            heatSupply,
            loadRate,
            annualEmission,
            intensityCorrectionFactor,
            ironEmission,
            sinterEmission,
            ironOutput,
            productEmissionIntensity,
            industryBalance,
          }) => ({
            detailName,
            powerUnitType,
            generation,
            heatSupply,
            loadRate,
            annualEmission,
            intensityCorrectionFactor:
              detail.algorithmVersion === 2026
                ? undefined
                : intensityCorrectionFactor,
            ironEmission,
            sinterEmission,
            ironOutput,
            productEmissionIntensity,
            industryBalance,
          }),
        ),
      });
    }
  }, [activeTarget, detail, form]);

  const currentYear = new Date().getFullYear();
  const detailColumns: ColumnsType<CarbonQuotaDetail> = [
    {
      title: I18N.common.fields.name,
      dataIndex: 'detailName',
      width: 150,
      ellipsis: { showTitle: false },
      render: value => {
        const displayValue = value || '-';
        return (
          <Typography.Text ellipsis={{ tooltip: displayValue }}>
            {displayValue}
          </Typography.Text>
        );
      },
    },
    {
      title: I18N.energyCarbon.assetUnitType,
      dataIndex: 'powerUnitTypeName',
      width: 210,
      render: value => value || '-',
    },
    {
      title: I18N.energyCarbon.assetPeakCorrectionFactor,
      dataIndex: 'peakCorrectionFactor',
      render: value => formatDecimalValue(value, 6),
    },
    {
      title: I18N.energyCarbon.assetGenerationQuota,
      dataIndex: 'generationQuota',
      render: value => formatDecimalValue(value, 6),
    },
    {
      title: I18N.energyCarbon.assetHeatQuota,
      dataIndex: 'heatQuota',
      render: value => formatDecimalValue(value, 6),
    },
    {
      title: I18N.energyCarbon.assetDetailQuota,
      dataIndex: 'quotaAmount',
      render: value => formatDecimalValue(value, 6),
    },
  ];

  return (
    <Drawer
      open={target !== null}
      width={920}
      title={
        activeTarget?.mode === 'add'
          ? I18N.energyCarbon.assetAddQuotaEstimate
          : activeTarget?.mode === 'edit'
          ? I18N.energyCarbon.assetEditQuotaEstimate
          : I18N.energyCarbon.assetQuotaEstimateDetails
      }
      onClose={onClose}
      afterOpenChange={open => {
        if (!open) setDisplayTarget(null);
      }}
      loading={isFetching}
      footer={
        <FormDrawerFooter
          isView={isView}
          onClose={onClose}
          testIdPrefix='carbon-quota-form'
          formId={QUOTA_FORM_ID}
          saveLoading={saveMutation.isLoading}
        />
      }
    >
      <Form
        id={QUOTA_FORM_ID}
        form={form}
        layout='vertical'
        requiredMark={!isView}
        disabled={isView}
        onFinish={submit}
      >
        <Row gutter={FORM_CONFIG.gutter}>
          <Col xs={24} sm={8}>
            <Form.Item
              name='orgId'
              label={I18N.common.fields.organization}
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.organizationRequired,
                },
              ]}
            >
              <TreeSelect
                treeData={orgTreeData}
                treeDefaultExpandAll
                showSearch
                treeNodeFilterProp='title'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name='industry'
              label={I18N.energyCarbon.assetIndustry}
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.assetIndustryRequired,
                },
              ]}
            >
              <Select
                options={getIndustryOptions()}
                onChange={(value: CarbonQuotaIndustry) => {
                  // 行业切换会改变字段矩阵和年份政策范围，旧明细不能跨行业保留。
                  form.setFieldValue(
                    'quotaYear',
                    value === 1 ? 2024 : currentYear,
                  );
                  form.setFieldValue('details', [{}]);
                }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name='quotaYear'
              label={I18N.energyCarbon.year}
              rules={[
                { required: true, message: I18N.energyCarbon.yearRequired },
              ]}
              getValueProps={(value?: number) => ({
                value: value ? dayjs(`${value}-01-01`) : undefined,
              })}
              getValueFromEvent={(value?: Dayjs) => value?.year()}
            >
              <DatePicker
                picker='year'
                format='YYYY'
                minDate={dayjs('2000-01-01')}
                maxDate={dayjs(`${industry === 1 ? 2026 : currentYear}-12-31`)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.List
          name='details'
          rules={[
            {
              validator: async (_rule, value) =>
                value?.length
                  ? Promise.resolve()
                  : Promise.reject(
                      new Error(I18N.energyCarbon.assetDetailRequired),
                    ),
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <div className={styles.detailList}>
              {fields.map((field, index) => {
                // React key 只传给明细卡片，其余 Form.List 字段再展开到 Form.Item，避免 key 被属性展开重复传递。
                const { key: fieldKey, ...fieldProps } = field;
                const unitType = details[index]?.powerUnitType as
                  | PowerUnitType
                  | undefined;
                return (
                  <CardLike
                    key={fieldKey}
                    title={I18N.template(I18N.energyCarbon.assetDetailNumber, {
                      number: index + 1,
                    })}
                    onRemove={
                      !isView && fields.length > 1
                        ? () => remove(field.name)
                        : undefined
                    }
                  >
                    <Row
                      gutter={FORM_CONFIG.gutter}
                      className={
                        use2026 &&
                        (industry === 2 || industry === 3 || industry === 4)
                          ? styles.alignedDetailRow
                          : undefined
                      }
                    >
                      <Col xs={24} sm={8}>
                        <Form.Item
                          {...fieldProps}
                          name={[field.name, 'detailName']}
                          label={getDetailNameLabels()[industry ?? 1]}
                          rules={[
                            {
                              required: true,
                              whitespace: true,
                              message: I18N.energyCarbon.assetNameRequired,
                            },
                          ]}
                        >
                          <Input maxLength={100} />
                        </Form.Item>
                      </Col>
                      {industry === 1 ? (
                        <>
                          <Col xs={24} sm={8}>
                            <Form.Item
                              {...fieldProps}
                              name={[field.name, 'powerUnitType']}
                              label={I18N.energyCarbon.assetUnitType}
                              rules={[
                                {
                                  required: true,
                                  message:
                                    I18N.energyCarbon.assetUnitTypeRequired,
                                },
                              ]}
                            >
                              <Select
                                options={getUnitOptions()}
                                onChange={() =>
                                  form.setFieldValue(
                                    ['details', index, 'loadRate'],
                                    undefined,
                                  )
                                }
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Form.Item
                              {...fieldProps}
                              name={[field.name, 'generation']}
                              label={I18N.energyCarbon.assetGeneration}
                              rules={[
                                {
                                  required: true,
                                  message:
                                    I18N.energyCarbon.assetGenerationRequired,
                                },
                              ]}
                            >
                              <InputNumber<string>
                                formatter={formatQuotaInputNumber}
                                stringMode
                                min='0'
                                precision={3}
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Form.Item
                              {...fieldProps}
                              name={[field.name, 'heatSupply']}
                              label={I18N.energyCarbon.assetHeatSupply}
                              rules={[
                                {
                                  required: true,
                                  message:
                                    I18N.energyCarbon.assetHeatSupplyRequired,
                                },
                              ]}
                            >
                              <InputNumber<string>
                                formatter={formatQuotaInputNumber}
                                stringMode
                                min='0'
                                precision={2}
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          </Col>
                          {/* 仅常规燃煤机组需要负荷率；切换机组类型时回调会清除旧值。 */}
                          {unitType === 1 || unitType === 2 ? (
                            <Col xs={24} sm={8}>
                              <Form.Item
                                {...fieldProps}
                                name={[field.name, 'loadRate']}
                                label={I18N.energyCarbon.assetLoadFactor}
                                rules={[
                                  {
                                    required: true,
                                    message:
                                      I18N.energyCarbon.assetLoadFactorRequired,
                                  },
                                ]}
                              >
                                <InputNumber<string>
                                  formatter={formatQuotaInputNumber}
                                  stringMode
                                  precision={6}
                                  style={{ width: '100%' }}
                                />
                              </Form.Item>
                            </Col>
                          ) : null}
                        </>
                      ) : use2026 ? (
                        formulaFields.map(input => (
                          <Col xs={24} sm={8} key={input.name}>
                            <Form.Item
                              {...fieldProps}
                              name={[field.name, input.name]}
                              label={input.label}
                              rules={[
                                { required: true },
                                {
                                  validator: (_rule, value) =>
                                    !input.positive || Number(value) > 0
                                      ? Promise.resolve()
                                      : Promise.reject(
                                          new Error(
                                            I18N.energyCarbon.positiveRequired,
                                          ),
                                        ),
                                },
                              ]}
                            >
                              <InputNumber<string>
                                formatter={formatQuotaInputNumber}
                                stringMode
                                min='0'
                                precision={
                                  input.name === 'annualEmission' ? 3 : 10
                                }
                                placeholder={I18N.common.placeholder.input}
                                data-testid={`carbon-quota-${input.name}-${field.name}`}
                              />
                            </Form.Item>
                          </Col>
                        ))
                      ) : (
                        <>
                          <Col xs={24} sm={8}>
                            <Form.Item
                              {...fieldProps}
                              name={[field.name, 'annualEmission']}
                              label={
                                I18N.energyCarbon.assetVerifiedAnnualEmissions
                              }
                              rules={[
                                {
                                  required: true,
                                  message:
                                    I18N.energyCarbon
                                      .assetAnnualEmissionsRequired,
                                },
                              ]}
                            >
                              <InputNumber<string>
                                formatter={formatQuotaInputNumber}
                                stringMode
                                min='0'
                                precision={3}
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Form.Item
                              {...fieldProps}
                              name={[field.name, 'intensityCorrectionFactor']}
                              label={
                                I18N.energyCarbon.assetEmissionIntensityFactor
                              }
                              rules={[
                                {
                                  required: true,
                                  message:
                                    I18N.energyCarbon
                                      .assetEmissionIntensityFactorRequired,
                                },
                                {
                                  validator: (_rule, value) =>
                                    Number(value) > -1 && Number(value) < 1
                                      ? Promise.resolve()
                                      : Promise.reject(
                                          new Error(
                                            I18N.energyCarbon.assetEmissionIntensityFactorRange,
                                          ),
                                        ),
                                },
                              ]}
                            >
                              <InputNumber<string>
                                formatter={formatQuotaInputNumber}
                                stringMode
                                precision={6}
                                style={{ width: '100%' }}
                              />
                            </Form.Item>
                          </Col>
                        </>
                      )}
                    </Row>
                  </CardLike>
                );
              })}
              {!isView ? (
                <Button
                  type='dashed'
                  icon={<PlusOutlined />}
                  onClick={() => add({})}
                >
                  {I18N.energyCarbon.assetAddDetail}
                </Button>
              ) : null}
              <Form.ErrorList errors={errors} />
            </div>
          )}
        </Form.List>
      </Form>
      {isView && detail ? (
        <div className={styles.viewResults}>
          <Descriptions bordered size='small' column={1}>
            <Descriptions.Item
              label={I18N.energyCarbon.assetEstimatedAllowance}
            >
              {formatDecimalValue(detail.quotaAmount, 6)} tCO₂e
            </Descriptions.Item>
          </Descriptions>
          <Table
            rowKey='id'
            size='small'
            columns={detailColumns}
            dataSource={detail.details}
            pagination={false}
            scroll={{ x: 900 }}
          />
        </div>
      ) : null}
    </Drawer>
  );
}

function CardLike({
  title,
  onRemove,
  children,
}: {
  title: string;
  onRemove?: () => void;
  children: ReactNode;
}) {
  useLocale();
  return (
    <div className={styles.detailCard}>
      <div className={styles.detailCardHeader}>
        <span>{title}</span>
        {onRemove ? (
          <Button
            type='text'
            danger
            icon={<MinusCircleOutlined />}
            onClick={onRemove}
          >
            {I18N.common.actions.delete}
          </Button>
        ) : null}
      </div>
      {children}
    </div>
  );
}

function CarbonQuotaPage() {
  useLocale();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { page, pageSize, orgId, industry } = useEnergySearch(searchSchema);
  const [form] = Form.useForm<{
    orgId?: number;
    industry?: CarbonQuotaIndustry;
  }>();
  const [drawerTarget, setDrawerTarget] = useState<DrawerTarget>(null);
  const queryClient = useQueryClient();
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree, { disableInactive: true }),
    [orgTree],
  );
  const { data, isLoading } = useQuery({
    queryKey: ['carbon-quota', 'list', { page, pageSize, orgId, industry }],
    queryFn: () =>
      getCarbonQuotaPageApi({
        pageNum: page,
        pageSize,
        orgId,
        industry: industry as CarbonQuotaIndustry | undefined,
      }).then(response => response.data.data),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCarbonQuotaApi,
    onSuccess: () => {
      message.success(I18N.common.feedback.deleteSuccess);
      queryClient.invalidateQueries({ queryKey: ['carbon-quota', 'list'] });
    },
  });
  useEffect(
    () =>
      form.setFieldsValue({
        orgId,
        industry: industry as CarbonQuotaIndustry | undefined,
      }),
    [form, industry, orgId],
  );

  const columns: ColumnsType<CarbonQuotaRecord> = [
    {
      title: I18N.common.table.index,
      width: 72,
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: I18N.common.fields.organization,
      dataIndex: 'orgName',
      width: 200,
      ellipsis: { showTitle: false },
      render: value => {
        const displayValue = value || '-';
        return (
          <Typography.Text ellipsis={{ tooltip: displayValue }}>
            {displayValue}
          </Typography.Text>
        );
      },
    },
    { title: I18N.energyCarbon.year, dataIndex: 'quotaYear', width: 90 },
    {
      title: I18N.energyCarbon.assetIndustry,
      dataIndex: 'industryName',
      width: 120,
      render: value => <Tag>{value}</Tag>,
    },
    {
      title: I18N.energyCarbon.assetEstimatedAllowanceUnit,
      dataIndex: 'quotaAmount',
      width: 200,
      render: value => formatDecimalValue(value, 6),
    },
    {
      title: I18N.common.table.updateBy,
      dataIndex: 'updateByName',
      width: 120,
      render: value => value || '-',
    },
    {
      title: I18N.common.table.updateTime,
      dataIndex: 'updateTime',
      width: 180,
      render: value => value || '-',
    },
    createTableActionsColumn<CarbonQuotaRecord>({
      title: I18N.energyCarbon.actionsColumn,
      fixed: 'right',
      actions: [
        permissionKeys.has(BUTTON_PERMISSION.EDIT) && {
          key: 'edit',
          label: I18N.common.actions.edit,
          permissionKey: BUTTON_PERMISSION.EDIT,
          testId: record => `carbon-quota-edit-${record.id}`,
          onClick: record => setDrawerTarget({ mode: 'edit', id: record.id }),
        },
        permissionKeys.has(BUTTON_PERMISSION.DELETE) && {
          key: 'delete',
          label: I18N.common.actions.delete,
          permissionKey: BUTTON_PERMISSION.DELETE,
          danger: true,
          loading: deleteMutation.isLoading,
          testId: record => `carbon-quota-delete-${record.id}`,
          onClick: record =>
            confirmDelete({
              itemName: I18N.energyCarbon.assetQuotaEstimation,
              itemValue: `${record.orgName || '-'}-${record.quotaYear}`,
              onOk: () => deleteMutation.mutate(record.id),
            }),
        },
        permissionKeys.has(BUTTON_PERMISSION.DETAIL) && {
          key: 'view',
          label: I18N.common.actions.view,
          permissionKey: BUTTON_PERMISSION.DETAIL,
          testId: record => `carbon-quota-view-${record.id}`,
          onClick: record => setDrawerTarget({ mode: 'view', id: record.id }),
        },
      ],
    }),
  ];

  return (
    <PageContainer
      title={I18N.energyCarbon.assetQuotaEstimation}
      permissionKey={PAGE_PERMISSION}
      extra={
        <AuthButton permissionKey={BUTTON_PERMISSION.ADD}>
          <Button
            type='primary'
            data-testid='carbon-quota-create'
            onClick={() => setDrawerTarget({ mode: 'add', orgId })}
          >
            {I18N.energyCarbon.assetAddQuotaEstimate}
          </Button>
        </AuthButton>
      }
    >
      <ListSearchForm
        form={form}
        requiredMark={false}
        onFinish={values => {
          navigate({
            to: '/energyCarbon/carbonAssetManagement/quota',
            search: {
              page: 1,
              pageSize,
              orgId: values.orgId,
              industry: values.industry,
            },
          });
        }}
      >
        <Form.Item name='orgId'>
          <TreeSelect
            allowClear
            treeData={orgTreeData}
            treeDefaultExpandAll
            showSearch
            treeNodeFilterProp='title'
            placeholder={I18N.common.fields.organization}
            style={{ width: 240 }}
            data-testid='carbon-quota-search-org'
          />
        </Form.Item>
        <Form.Item name='industry'>
          <Select
            allowClear
            options={getIndustryOptions()}
            placeholder={I18N.energyCarbon.assetIndustry}
            style={{ width: 160 }}
            data-testid='carbon-quota-search-industry'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='carbon-quota-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              data-testid='carbon-quota-reset'
              onClick={() => {
                form.resetFields();
                navigate({
                  to: '/energyCarbon/carbonAssetManagement/quota',
                  search: { page: 1, pageSize },
                });
              }}
            >
              {I18N.common.actions.reset}
            </Button>
          </Space>
        </Form.Item>
      </ListSearchForm>
      <Table
        rowKey='id'
        columns={columns}
        dataSource={data?.records ?? []}
        loading={isLoading || deleteMutation.isLoading}
        // max-content 保持操作列按 TableActions 的实际按钮宽度收口，避免宽屏下固定列被额外拉伸。
        scroll={{ x: 'max-content' }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (nextPage, nextPageSize) => {
            navigate({
              to: '/energyCarbon/carbonAssetManagement/quota',
              search: {
                page: nextPage,
                pageSize: nextPageSize,
                orgId,
                industry,
              },
            });
          },
        }}
      />
      <QuotaFormDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
      />
    </PageContainer>
  );
}
