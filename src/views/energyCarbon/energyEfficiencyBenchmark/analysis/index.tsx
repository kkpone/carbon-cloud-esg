import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import { EnergyForbidden } from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：能效对标分析 - 单周期逐指标比较组织实际值与年度基准
 * 路由：/energyCarbon/energyEfficiencyBenchmark/analysis
 */
import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Form,
  Input,
  Segmented,
  Space,
  Spin,
  Table,
  Tree,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { DataNode } from 'antd/es/tree';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { type Key, useEffect, useMemo, useRef, useState } from 'react';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import type { OrgTree } from '@/views/energyCarbon/platform/types';
import { formatDecimalValue } from '../../utils';

import { useLocalizedFormErrors } from '@/views/energyCarbon/hooks/useLocalizedFormErrors';
import { getBenchmarkAnalysisApi, getBenchmarkOptionsApi } from '../services';
import type {
  BenchmarkAnalysisRequest,
  BenchmarkAnalysisResponse,
  BenchmarkMetric,
  BenchmarkType,
} from '../types';
import styles from './index.module.css';

const PAGE_PERMISSION = '/energyCarbon/energyEfficiencyBenchmark/analysis';
const QUERY_PERMISSION = PAGE_PERMISSION;

const getPeriodOptions = () => [
  { label: I18N.energyCarbon.energyConsumptionStatisticsByMonth, value: 2 },
  { label: I18N.energyCarbon.analysisByQuarter, value: 3 },
  { label: I18N.energyCarbon.energyConsumptionStatisticsByYear, value: 4 },
];

interface FilterValues {
  orgId: number;
  periodType: 2 | 3 | 4;
  periodDate: Dayjs;
  metrics: BenchmarkMetric[];
  benchmarkTypes: BenchmarkType[];
}

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
      <BenchmarkAnalysisPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 读取数据权限组织树第一个可见组织，作为初始筛选。 */
function firstOrgId(nodes: OrgTree[]): number | undefined {
  return nodes[0]?.id;
}

/** 将数据权限组织转换为左侧选择树，按飞书口径优先展示组织简称。 */
function toOrgTreeData(nodes: OrgTree[]): DataNode[] {
  return nodes.map(node => {
    const displayName = node.orgAbbr?.trim() || node.name;
    return {
      key: String(node.id),
      title: (
        <Typography.Text
          ellipsis={{ tooltip: displayName }}
          className={styles.orgTreeNodeTitle}
        >
          <span data-testid={`benchmark-analysis-org-${node.id}`}>
            {displayName}
          </span>
        </Typography.Text>
      ),
      children: toOrgTreeData(node.children ?? []),
    };
  });
}

/** 收集根组织 ID，首次加载时默认展开到第二层。 */
function defaultExpandedOrgKeys(nodes: OrgTree[]): Key[] {
  return nodes.map(node => String(node.id));
}

/** 将页面所选日期归一为自然月、季度或年度首日，服务端据此确定统计年度和完整周期。 */
function periodDate(periodType: 2 | 3 | 4, value: Dayjs): string {
  if (periodType === 2) return value.startOf('month').format('YYYY-MM-DD');
  if (periodType === 3) {
    return value
      .month(Math.floor(value.month() / 3) * 3)
      .startOf('month')
      .format('YYYY-MM-DD');
  }
  return value.startOf('year').format('YYYY-MM-DD');
}

/** 统一标准产品指标的展示名称，避免租户标准产品名称作为指标名的一部分显示。 */
function displayMetricName(metric: BenchmarkMetric, label: string): string {
  return metric === 10
    ? I18N.energyCarbon.analysisStandardProductIntensity
    : label;
}

/** 标准产品强度单位直接拼接当前标准产品名称，不插入加号分隔符。 */
function displayMetricUnit(
  metric: BenchmarkMetric,
  unit: string | undefined,
  standardProductName: string | undefined,
): string | undefined {
  if (metric !== 10 || !unit || !standardProductName) return unit;
  return `${unit}${standardProductName}`;
}

/** 只有对标对象全部为目标值时，指标1-4才存在可填写的业务值。 */
function canSelectTargetOnlyMetrics(benchmarkTypes: BenchmarkType[]): boolean {
  return benchmarkTypes.length > 0 && benchmarkTypes.every(type => type === 3);
}

/** 按对标对象筛选默认指标，避免国家或行业条件残留不可用的指标1-4。 */
function getSelectableMetricValues(
  metrics: Array<{ value: BenchmarkMetric; available: boolean }>,
  benchmarkTypes: BenchmarkType[],
): BenchmarkMetric[] {
  const targetOnly = canSelectTargetOnlyMetrics(benchmarkTypes);
  return metrics
    .filter(item => item.available && (item.value > 4 || targetOnly))
    .map(item => item.value);
}

function BenchmarkAnalysisPage() {
  const { locale } = useLocale();
  const [form] = Form.useForm<FilterValues>();
  useLocalizedFormErrors(form);
  const [expandedOrgKeys, setExpandedOrgKeys] = useState<Key[]>([]);
  const autoQueryTriggered = useRef(false);
  const { token } = theme.useToken();
  const periodType = Form.useWatch('periodType', form) ?? 2;
  const selectedOrgId = Form.useWatch('orgId', form);
  const selectedBenchmarkTypes = Form.useWatch('benchmarkTypes', form) ?? [];
  const canQuery = useMenuStore(state =>
    state.permissionKeys.has(QUERY_PERMISSION),
  );
  // 组织选项只来自当前数据权限树；组织范围由服务端再次校验，页面不扩大可见范围。
  const { data: orgTree = [], isLoading: orgTreeLoading } =
    useDataPermissionOrgTree();
  const orgTreeData = useMemo(() => toOrgTreeData(orgTree), [orgTree]);
  const { data: options } = useQuery({
    queryKey: ['benchmark-data', 'options'],
    queryFn: () =>
      getBenchmarkOptionsApi().then(response => response.data.data),
  });
  const analysisMutation = useMutation({
    mutationFn: (data: BenchmarkAnalysisRequest) =>
      getBenchmarkAnalysisApi(data).then(response => response.data.data),
  });

  useEffect(() => {
    if (!orgTree.length || !options || !canQuery || autoQueryTriggered.current)
      return;
    const defaultBenchmarkTypes = options.types.map(
      item => item.value as BenchmarkType,
    );
    const currentBenchmarkTypes =
      form.getFieldValue('benchmarkTypes') ?? defaultBenchmarkTypes;
    const defaultValues = {
      orgId: form.getFieldValue('orgId') ?? firstOrgId(orgTree),
      periodType: form.getFieldValue('periodType') ?? 2,
      periodDate: form.getFieldValue('periodDate') ?? dayjs(),
      metrics:
        form.getFieldValue('metrics') ??
        getSelectableMetricValues(options.metrics, currentBenchmarkTypes),
      benchmarkTypes: currentBenchmarkTypes,
    };
    // 仅在组织树和指标选项就绪后补默认值，保留用户已选条件，避免异步回填覆盖筛选。
    form.setFieldsValue(defaultValues);
    setExpandedOrgKeys(defaultExpandedOrgKeys(orgTree));
    if (
      defaultValues.orgId !== undefined &&
      defaultValues.metrics.length > 0 &&
      defaultValues.benchmarkTypes.length > 0
    ) {
      autoQueryTriggered.current = true;
      // 默认筛选条件就绪后自动提交一次，首屏无需用户再次点击“查询”。
      form.submit();
    }
  }, [canQuery, form, options, orgTree]);

  const submit = (values: FilterValues) => {
    // 请求携带归一后的自然周期和后端选项编码；指标缺失值由响应保留为 null。
    analysisMutation.mutate({
      orgId: values.orgId,
      periodType: values.periodType,
      periodDate: periodDate(values.periodType, values.periodDate),
      metrics: values.metrics,
      benchmarkTypes: values.benchmarkTypes,
    });
  };

  const resetFilters = () => {
    // 重置回默认周期、全部可用指标和全部对标对象；组织继续保留左侧当前选择。
    const benchmarkTypes =
      options?.types.map(item => item.value as BenchmarkType) ?? [];
    form.setFieldsValue({
      orgId: selectedOrgId ?? firstOrgId(orgTree),
      periodType: 2,
      periodDate: dayjs(),
      metrics: options
        ? getSelectableMetricValues(options.metrics, benchmarkTypes)
        : [],
      benchmarkTypes,
    });
    analysisMutation.reset();
  };

  const selectOrganization = (orgId: number) => {
    // 切换组织先清除旧结果，避免新请求返回前仍把上个组织数据展示为当前组织。
    form.setFieldValue('orgId', orgId);
    analysisMutation.reset();
    if (!canQuery) return;

    // 沿用当前周期、指标和对标对象；表单校验通过后立即刷新右侧分析结果。
    form.submit();
  };

  const result = analysisMutation.data;
  const targetOnlyBenchmarkTypes = canSelectTargetOnlyMetrics(
    selectedBenchmarkTypes,
  );
  const metricOptions =
    options?.metrics.map(item => ({
      label: displayMetricName(item.value, item.label),
      value: item.value,
      disabled:
        !item.available || (item.value <= 4 && !targetOnlyBenchmarkTypes),
    })) ?? [];
  const metricRowSize = Math.ceil(metricOptions.length / 2);
  const tableColumns = useMemo<
    ColumnsType<BenchmarkAnalysisResponse['metrics'][number]>
  >(
    () => [
      {
        title: I18N.energyCarbon.analysisEfficiencyIndicator,
        dataIndex: 'metricName',
        width: 220,
        fixed: 'left',
        ellipsis: { showTitle: false },
        render: (_value, row) => {
          const displayValue = displayMetricName(
            row.metric,
            row.metricName || '-',
          );
          return (
            <Typography.Text ellipsis={{ tooltip: displayValue }}>
              {displayValue}
            </Typography.Text>
          );
        },
      },
      {
        title:
          result?.organizationName ||
          I18N.energyCarbon.analysisOrganizationActualValue,
        dataIndex: 'organizationValue',
        width: 160,
        render: (value, row) => {
          const unit = displayMetricUnit(
            row.metric,
            row.unit,
            options?.standardProductName,
          );
          return `${formatDecimalValue(value, 6)}${
            value === null || value === undefined || !unit ? '' : ` ${unit}`
          }`;
        },
      },
      ...selectedBenchmarkTypes.map((type: BenchmarkType) => ({
        title:
          options?.types.find(item => item.value === type)?.label ??
          String(type),
        width: 180,
        render: (
          _value: unknown,
          row: BenchmarkAnalysisResponse['metrics'][number],
        ) => {
          const benchmark = row.benchmarkValues.find(
            item => item.benchmarkType === type,
          );
          // 对标记录缺失或指标不适用时 value 为空，展示为“-”而不是误报为0。
          return formatDecimalValue(benchmark?.value, 6);
        },
      })),
    ],
    [
      locale,
      options?.standardProductName,
      options?.types,
      result?.organizationName,
      selectedBenchmarkTypes,
    ],
  );

  return (
    <PageContainer
      title={I18N.energyCarbon.analysisBenchmarkAnalysis}
      permissionKey={PAGE_PERMISSION}
    >
      <div className={styles.workspace}>
        <Card
          size='small'
          title={I18N.energyCarbon.organizationList}
          className={styles.orgCard}
        >
          <Spin spinning={orgTreeLoading}>
            {orgTreeData.length ? (
              <Tree
                blockNode
                treeData={orgTreeData}
                selectedKeys={selectedOrgId ? [String(selectedOrgId)] : []}
                expandedKeys={expandedOrgKeys}
                onExpand={setExpandedOrgKeys}
                onSelect={(_keys, info) => {
                  const orgId = Number(info.node.key);
                  if (Number.isFinite(orgId)) selectOrganization(orgId);
                }}
                className={styles.orgTree}
                data-testid='benchmark-analysis-org-tree'
              />
            ) : !orgTreeLoading ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={I18N.energyCarbon.noAccessibleOrganizations}
              />
            ) : null}
          </Spin>
        </Card>
        <div className={styles.content}>
          <Card size='small'>
            <Form
              form={form}
              layout='inline'
              requiredMark={false}
              onFinish={submit}
              className={styles.filterForm}
              onValuesChange={changedValues => {
                if (!('benchmarkTypes' in changedValues)) return;
                const nextBenchmarkTypes =
                  changedValues.benchmarkTypes as BenchmarkType[];
                // 国家或行业条件变更后清除指标1-4，只有目标值条件允许再次选择这些指标。
                if (!canSelectTargetOnlyMetrics(nextBenchmarkTypes)) {
                  const currentMetrics = form.getFieldValue('metrics') as
                    | BenchmarkMetric[]
                    | undefined;
                  const retainedMetrics = (currentMetrics ?? []).filter(
                    metric => metric > 4,
                  );
                  if (
                    retainedMetrics.length !== (currentMetrics ?? []).length
                  ) {
                    form.setFieldValue('metrics', retainedMetrics);
                  }
                }
              }}
            >
              <Form.Item
                name='orgId'
                hidden
                rules={[
                  {
                    required: true,
                    message: I18N.energyCarbon.organizationRequired,
                  },
                ]}
              >
                <Input type='hidden' />
              </Form.Item>
              <div className={styles.filterRow}>
                <Form.Item
                  name='periodType'
                  label={I18N.energyCarbon.analysisStatisticsDimension}
                  rules={[
                    {
                      required: true,
                      message:
                        I18N.energyCarbon.analysisStatisticsDimensionRequired,
                    },
                  ]}
                >
                  <Segmented
                    options={getPeriodOptions()}
                    className={styles.periodType}
                    onChange={value => {
                      form.setFieldsValue({
                        periodType: value as 2 | 3 | 4,
                        periodDate: dayjs(),
                      });
                    }}
                    data-testid='benchmark-analysis-period-type'
                  />
                </Form.Item>
                <Form.Item
                  name='periodDate'
                  label={I18N.energyCarbon.analysisStatisticsPeriod}
                  rules={[
                    {
                      required: true,
                      message:
                        I18N.energyCarbon.analysisStatisticsPeriodRequired,
                    },
                  ]}
                >
                  <DatePicker
                    className={styles.periodDate}
                    picker={
                      periodType === 2
                        ? 'month'
                        : periodType === 3
                        ? 'quarter'
                        : 'year'
                    }
                    allowClear={false}
                    data-testid='benchmark-analysis-period-date'
                  />
                </Form.Item>
              </div>
              <div className={styles.filterRow}>
                <Form.Item
                  name='metrics'
                  label={I18N.energyCarbon.analysisEfficiencyIndicator}
                  className={styles.optionItem}
                  rules={[
                    {
                      required: true,
                      message: I18N.energyCarbon.analysisIndicatorRequired,
                    },
                  ]}
                >
                  <Checkbox.Group
                    className={`${styles.optionGroup} ${styles.metricsGroup}`}
                    data-testid='benchmark-analysis-metrics'
                  >
                    {[
                      metricOptions.slice(0, metricRowSize),
                      metricOptions.slice(metricRowSize),
                    ].map(row => (
                      <div className={styles.metricRow} key={row[0]?.value}>
                        {row.map(item => (
                          <Checkbox
                            key={item.value}
                            value={item.value}
                            disabled={item.disabled}
                          >
                            {item.label}
                          </Checkbox>
                        ))}
                      </div>
                    ))}
                  </Checkbox.Group>
                </Form.Item>
              </div>
              <div className={styles.filterRow}>
                <Form.Item
                  name='benchmarkTypes'
                  label={I18N.energyCarbon.analysisBenchmarkTarget}
                  className={styles.optionItem}
                  rules={[
                    {
                      required: true,
                      message:
                        I18N.energyCarbon.analysisBenchmarkTargetRequired,
                    },
                  ]}
                >
                  <Checkbox.Group
                    className={styles.optionGroup}
                    options={options?.types.map(item => ({
                      label: item.label,
                      value: item.value as BenchmarkType,
                    }))}
                    data-testid='benchmark-analysis-targets'
                  />
                </Form.Item>
              </div>
              <div className={styles.filterActions}>
                <Form.Item>
                  <Space>
                    <AuthButton permissionKey={QUERY_PERMISSION}>
                      <Button
                        type='primary'
                        htmlType='submit'
                        loading={analysisMutation.isLoading}
                        data-testid='benchmark-analysis-query'
                      >
                        {I18N.common.actions.search}
                      </Button>
                    </AuthButton>
                    <Button
                      htmlType='button'
                      onClick={resetFilters}
                      data-testid='benchmark-analysis-reset'
                    >
                      {I18N.common.actions.reset}
                    </Button>
                  </Space>
                </Form.Item>
              </div>
            </Form>
          </Card>

          {!result ? (
            <Card>
              <Empty description={I18N.energyCarbon.analysisSelectConditions} />
            </Card>
          ) : (
            <Space direction='vertical' size={16} className={styles.resultList}>
              <div className={styles.chartGrid}>
                {result.metrics.map(metric => {
                  const categories = [
                    result.organizationName,
                    ...metric.benchmarkValues.map(
                      item => item.benchmarkTypeName,
                    ),
                  ];
                  const unit = displayMetricUnit(
                    metric.metric,
                    metric.unit,
                    options?.standardProductName,
                  );
                  const metricTitle = `${displayMetricName(
                    metric.metric,
                    metric.metricName,
                  )}${unit ? `（${unit}）` : ''}`;
                  // 图表保留 null 点位，使缺失实际台账或不适用基准不参与数值绘制。
                  const values = [
                    metric.organizationValue ?? null,
                    ...metric.benchmarkValues.map(item => item.value ?? null),
                  ];
                  return (
                    <Card
                      key={metric.metric}
                      size='small'
                      title={
                        <Typography.Text ellipsis={{ tooltip: metricTitle }}>
                          {metricTitle}
                        </Typography.Text>
                      }
                    >
                      <ReactECharts
                        style={{ height: 280 }}
                        option={{
                          tooltip: {
                            trigger: 'axis',
                            valueFormatter: (value: unknown) =>
                              value === null || value === undefined
                                ? '-'
                                : String(value),
                          },
                          grid: { left: 56, right: 24, top: 24, bottom: 48 },
                          xAxis: {
                            type: 'category',
                            data: categories,
                            axisLabel: {
                              interval: 0,
                              rotate: categories.length > 3 ? 20 : 0,
                            },
                          },
                          yAxis: { type: 'value' },
                          // 使用 Ant Design token 主色，保持图表与当前系统主题一致。
                          series: [
                            {
                              type: 'bar',
                              barMaxWidth: 42,
                              data: values,
                              itemStyle: { color: token.colorPrimary },
                              label: {
                                show: true,
                                position: 'top',
                                formatter: ({ value }: { value?: unknown }) =>
                                  value === null || value === undefined
                                    ? '-'
                                    : String(value),
                              },
                            },
                          ],
                        }}
                      />
                    </Card>
                  );
                })}
              </div>
              <Card
                size='small'
                title={
                  <Typography.Text
                    ellipsis={{
                      tooltip: `${result.organizationName} · ${result.period}`,
                    }}
                  >{`${result.organizationName} · ${result.period}`}</Typography.Text>
                }
              >
                <Table
                  rowKey='metric'
                  columns={tableColumns}
                  dataSource={result.metrics}
                  pagination={false}
                  scroll={{ x: 800 }}
                />
              </Card>
            </Space>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
