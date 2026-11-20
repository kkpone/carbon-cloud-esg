import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：用能预算管理 - 按组织维护基准及规划比例并查看年度趋势
 * 路由：/energyCarbon/energyBudgetManagement/budget
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Empty,
  Form,
  InputNumber,
  Row,
  Space,
  Spin,
  Table,
  Tree,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import dayjs, { type Dayjs } from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { type Key, useEffect, useMemo, useRef, useState } from 'react';

import { z } from 'zod';

import I18N from '@/lang/I18N';
import AuthButton from '@/views/energyCarbon/components/AuthButton';
import FormDrawerFooter from '@/views/energyCarbon/components/FormDrawerFooter';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { FORM_CONFIG } from '@/views/energyCarbon/platform/config';
import type { OrgTree } from '@/views/energyCarbon/platform/types';
import { formatDecimalValue } from '../../utils';

import styles from './index.module.css';
import { getEnergyBudgetDetailApi, saveEnergyBudgetApi } from './services';
import type { EnergyBudgetSave, EnergyBudgetYearValue } from './types';

const PAGE_PERMISSION = '/energyCarbon/energyBudgetManagement/budget';
const SAVE_PERMISSION = `${PAGE_PERMISSION}/save`;
const BUDGET_FORM_ID = 'energy-budget-form';

const searchSchema = z.object({
  orgId: z.coerce.number().int().positive().optional(),
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
      <EnergyBudgetPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 在当前数据权限组织树中定位路由选中的组织，避免预算详情请求越过可见范围。 */
function findOrg(nodes: OrgTree[], id?: number): OrgTree | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findOrg(node.children ?? [], id);
    if (found) return found;
  }
  return undefined;
}

/** 收集组织树根节点 ID，首屏展示一级和二级组织。 */
function getDefaultExpandedOrgKeys(nodes: OrgTree[]): Key[] {
  return nodes.map(node => String(node.id));
}

/** 输入时保留原文本，失焦后只去掉百分比末尾无意义的 0。 */
function formatPercentage(
  value: string | number | undefined,
  info: { userTyping: boolean; input: string },
) {
  return info.userTyping
    ? info.input
    : String(value ?? '').replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
}

/** 将数据权限组织树转换为预算页左侧选择树，子节点保持原组织层级。 */
function treeData(nodes: OrgTree[]): DataNode[] {
  return nodes.map(node => ({
    key: String(node.id),
    title: node.orgAbbr?.trim() || node.name,
    children: treeData(node.children ?? []),
  }));
}

function EnergyBudgetPage() {
  const { locale } = useLocale();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { orgId } = useEnergySearch(searchSchema);
  const [form] = Form.useForm<EnergyBudgetSave>();
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
  const [expandedKeys, setExpandedKeys] = useState<Key[]>([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  // 预算详情和保存都限定在当前数据权限组织范围，切换组织只刷新对应详情。
  const { data: orgs = [], isLoading: orgLoading } = useDataPermissionOrgTree();
  const selectedOrg = useMemo(() => findOrg(orgs, orgId), [orgId, orgs]);

  useEffect(() => {
    if (!orgs.length) return;
    setExpandedKeys(getDefaultExpandedOrgKeys(orgs));
    if (!selectedOrg) {
      navigate({
        to: '/energyCarbon/energyBudgetManagement/budget',
        replace: true,
        search: { orgId: orgs[0].id },
      });
    }
  }, [navigate, orgs, selectedOrg]);

  const { data: detail, isFetching } = useQuery({
    queryKey: ['energy-budget', orgId],
    queryFn: () =>
      getEnergyBudgetDetailApi(orgId as number).then(
        response => response.data.data,
      ),
    enabled: orgId !== undefined && selectedOrg !== undefined,
  });
  useEffect(() => {
    if (!settingsOpen) {
      form.resetFields();
      return;
    }

    form.resetFields();
    if (!detail?.baseYear) return;
    form.setFieldsValue({
      orgId: detail.orgId,
      baseYear: detail.baseYear,
      forecastYear: detail.forecastYear,
      outputValueGrowthRate: detail.outputValueGrowthRate,
      intensityReductionRate: detail.intensityReductionRate,
    });
  }, [detail, form, settingsOpen]);

  const saveMutation = useMutation({
    mutationFn: saveEnergyBudgetApi,
    onSuccess: () => {
      message.success(I18N.common.feedback.saveSuccess);
      queryClient.invalidateQueries({ queryKey: ['energy-budget', orgId] });
      // 保存成功后关闭设置抽屉，页面趋势由当前组织的查询失效后刷新。
      setSettingsOpen(false);
    },
  });
  const submit = (values: EnergyBudgetSave) => {
    // 路由中的组织 ID 是当前页面上下文，覆盖表单值以避免切换组织后的旧值写入错误组织。
    saveMutation.mutate({ ...values, orgId: orgId as number });
  };

  const columns: ColumnsType<EnergyBudgetYearValue> = [
    { title: I18N.energyCarbon.year, dataIndex: 'year', width: 100 },
    {
      title: I18N.energyCarbon.organizationName,
      dataIndex: 'orgName',
      width: 180,
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
      title: I18N.energyCarbon.assetActualEnergyUnit,
      dataIndex: 'actualEnergy',
      render: value => formatDecimalValue(value, 6),
    },
    {
      title: I18N.energyCarbon.assetTargetEnergyUnit,
      dataIndex: 'targetEnergy',
      render: value => formatDecimalValue(value, 6),
    },
    {
      title: I18N.energyCarbon.assetForecastEnergyUnit,
      dataIndex: 'forecastEnergy',
      render: value => formatDecimalValue(value, 6),
    },
  ];

  return (
    <PageContainer
      title={I18N.energyCarbon.assetBudgetManagement}
      permissionKey={PAGE_PERMISSION}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px minmax(0, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        <Card
          size='small'
          title={I18N.energyCarbon.organization}
          style={{
            position: 'sticky',
            top: 16,
            maxHeight: 'calc(100vh - 160px)',
            overflow: 'auto',
          }}
        >
          <Spin spinning={orgLoading}>
            {orgs.length ? (
              <Tree
                treeData={treeData(orgs)}
                selectedKeys={orgId ? [String(orgId)] : []}
                expandedKeys={expandedKeys}
                onExpand={setExpandedKeys}
                onSelect={keys => {
                  const nextId = Number(keys[0]);
                  if (Number.isFinite(nextId))
                    navigate({
                      to: '/energyCarbon/energyBudgetManagement/budget',
                      search: { orgId: nextId },
                    });
                }}
              />
            ) : (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </Spin>
        </Card>
        <Space direction='vertical' size={16} className={styles.resultList}>
          <Card
            size='small'
            title={I18N.energyCarbon.assetEnergyTrend}
            loading={isFetching}
            extra={
              <AuthButton permissionKey={SAVE_PERMISSION}>
                <Button
                  type='primary'
                  disabled={!orgId || selectedOrg?.orgStatus === 1}
                  onClick={() => setSettingsOpen(true)}
                  data-testid='energy-budget-settings-button'
                >
                  {I18N.energyCarbon.assetEnergyBudgetSettings}
                </Button>
              </AuthButton>
            }
          >
            {detail?.years.length ? (
              <ReactECharts
                style={{ height: 360 }}
                option={{
                  tooltip: {
                    trigger: 'axis',
                    // 基准年规划值为 null 时，补齐 Tooltip 中的两项并按统一空值规则显示 "-"。
                    formatter: (params: unknown) => {
                      const items = (
                        Array.isArray(params) ? params : [params]
                      ) as Array<{
                        dataIndex?: number;
                        marker?: string;
                        seriesName?: string;
                      }>;
                      const dataIndex = items[0]?.dataIndex;
                      const yearValue =
                        dataIndex === undefined
                          ? undefined
                          : detail.years[dataIndex];
                      if (!yearValue) return '';
                      const markers = new Map(
                        items.map(item => [item.seriesName, item.marker]),
                      );
                      return [
                        String(yearValue.year),
                        `${
                          markers.get(I18N.energyCarbon.assetActualEnergy) ?? ''
                        }${
                          I18N.energyCarbon.assetActualEnergy
                        } ${formatDecimalValue(yearValue.actualEnergy, 6)}`,
                        `${
                          markers.get(I18N.energyCarbon.assetTargetEnergy) ?? ''
                        }${
                          I18N.energyCarbon.assetTargetEnergy
                        } ${formatDecimalValue(yearValue.targetEnergy, 6)}`,
                        `${
                          markers.get(I18N.energyCarbon.assetForecastEnergy) ??
                          ''
                        }${
                          I18N.energyCarbon.assetForecastEnergy
                        } ${formatDecimalValue(yearValue.forecastEnergy, 6)}`,
                      ].join('<br/>');
                    },
                  },
                  legend: {
                    bottom: 8,
                    data: [
                      I18N.energyCarbon.assetActualEnergy,
                      I18N.energyCarbon.assetTargetEnergy,
                      I18N.energyCarbon.assetForecastEnergy,
                    ],
                  },
                  // 为年份标签预留独立底部空间，避免与底部图例重叠。
                  grid: {
                    left: 72,
                    right: 24,
                    top: 48,
                    bottom: 76,
                    containLabel: true,
                  },
                  xAxis: {
                    type: 'category',
                    data: detail.years.map(item => item.year),
                  },
                  yAxis: { type: 'value', name: 'tce' },
                  series: [
                    // 实际台账缺失保留 null，图表断线；目标和预测线由预算公式逐年生成。
                    {
                      name: I18N.energyCarbon.assetActualEnergy,
                      type: 'line',
                      connectNulls: false,
                      data: detail.years.map(item => item.actualEnergy ?? null),
                    },
                    {
                      name: I18N.energyCarbon.assetTargetEnergy,
                      type: 'line',
                      data: detail.years.map(item => item.targetEnergy),
                    },
                    {
                      name: I18N.energyCarbon.assetForecastEnergy,
                      type: 'line',
                      data: detail.years.map(item => item.forecastEnergy),
                    },
                  ],
                }}
              />
            ) : (
              <Empty description={I18N.energyCarbon.assetBudgetTrendEmpty} />
            )}
          </Card>
          <Card size='small' title={I18N.energyCarbon.assetAnnualBudgetDetails}>
            <Table
              rowKey='year'
              columns={columns}
              dataSource={detail?.years ?? []}
              loading={isFetching}
              pagination={false}
              scroll={{ x: 900 }}
            />
          </Card>
        </Space>
        {/* 预算设置只在右侧抽屉编辑，主页面保留趋势和年度明细。 */}
        <Drawer
          open={settingsOpen}
          placement='right'
          size='large'
          title={I18N.template(I18N.energyCarbon.assetBudgetSettings, {
            organization: detail?.orgName ? ` · ${detail.orgName}` : '',
          })}
          onClose={() => setSettingsOpen(false)}
          loading={isFetching}
          destroyOnClose
          data-testid='energy-budget-settings-drawer'
          footer={
            <FormDrawerFooter
              isView={false}
              onClose={() => setSettingsOpen(false)}
              testIdPrefix='energy-budget-form'
              formId={BUDGET_FORM_ID}
              saveLoading={saveMutation.isLoading}
            />
          }
        >
          <Form
            id={BUDGET_FORM_ID}
            form={form}
            layout='vertical'
            className={styles.budgetForm}
            onFinish={submit}
          >
            <Row gutter={FORM_CONFIG.gutter}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name='baseYear'
                  label={I18N.energyCarbon.assetBaseYear}
                  rules={[
                    {
                      required: true,
                      message: I18N.energyCarbon.assetBaseYearRequired,
                    },
                    {
                      validator: (_rule, value) =>
                        value < currentYear
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error(I18N.energyCarbon.assetBaseYearRange),
                            ),
                    },
                  ]}
                  getValueProps={(value?: number) => ({
                    value: value ? dayjs(`${value}-01-01`) : undefined,
                  })}
                  getValueFromEvent={(value?: Dayjs) => value?.year()}
                >
                  <DatePicker
                    picker='year'
                    format='YYYY'
                    allowClear
                    placeholder={I18N.common.placeholder.select}
                    className={styles.yearPicker}
                    data-testid='energy-budget-form-base-year'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name='forecastYear'
                  label={I18N.energyCarbon.assetForecastYear}
                  rules={[
                    {
                      required: true,
                      message: I18N.energyCarbon.assetForecastYearRequired,
                    },
                    {
                      validator: (_rule, value) =>
                        value >= currentYear && value <= 2060
                          ? Promise.resolve()
                          : Promise.reject(
                              new Error(
                                I18N.energyCarbon.budgetForecastYearRange,
                              ),
                            ),
                    },
                  ]}
                  getValueProps={(value?: number) => ({
                    value: value ? dayjs(`${value}-01-01`) : undefined,
                  })}
                  getValueFromEvent={(value?: Dayjs) => value?.year()}
                >
                  <DatePicker
                    picker='year'
                    format='YYYY'
                    allowClear
                    placeholder={I18N.common.placeholder.select}
                    className={styles.yearPicker}
                    disabledDate={date =>
                      date.year() < currentYear || date.year() > 2060
                    }
                    data-testid='energy-budget-form-forecast-year'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name='outputValueGrowthRate'
                  label={I18N.energyCarbon.assetAnnualOutputGrowth}
                  rules={[
                    {
                      required: true,
                      message:
                        I18N.energyCarbon.assetAnnualOutputGrowthRequired,
                    },
                  ]}
                >
                  <InputNumber<string>
                    stringMode
                    min='0'
                    max='100'
                    precision={6}
                    formatter={formatPercentage}
                    placeholder={I18N.common.placeholder.input}
                    className={styles.fullWidth}
                    data-testid='energy-budget-form-growth-rate'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name='intensityReductionRate'
                  label={I18N.energyCarbon.assetAnnualIntensityReduction}
                  rules={[
                    {
                      required: true,
                      message:
                        I18N.energyCarbon.assetAnnualIntensityReductionRequired,
                    },
                  ]}
                >
                  <InputNumber<string>
                    stringMode
                    min='0'
                    max='100'
                    precision={6}
                    formatter={formatPercentage}
                    placeholder={I18N.common.placeholder.input}
                    className={styles.fullWidth}
                    data-testid='energy-budget-form-reduction-rate'
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Drawer>
      </div>
    </PageContainer>
  );
}
