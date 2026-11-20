import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  App,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tree,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import ReactECharts from 'echarts-for-react';
import { useEffect, useMemo, useRef } from 'react';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import EnergyCarbonCategoryChart from '@/views/energyCarbon/components/EnergyCarbonCategoryChart';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import {
  type FormAnalysisResponse,
  type BoundaryAnalysisResponse,
  type BoundaryAnalysisRow,
  type BoundaryType,
  type OverviewMetric,
  type OverviewResponse,
  type SinglePeriodAnalysisRequest,
  type SinglePeriodType,
  type StructureAnalysisResponse,
  type StructureAnalysisRow,
  type StructurePieItem,
} from '../../types';
import FormAnalysisResult from '../FormAnalysisResult';

import { useStatisticsScopeTree } from '../../../energyStatistics/hooks';
import type { StatisticsScopeNode } from '../../../energyStatistics/types';
import { getBoundaryTypeOptions } from '../../constant';
import { useEnergyAnalysisMutation } from '../../hooks';

import {
  boundaryAnalysisChartOption,
  displayAnalysisValue,
  findAnalysisScope,
  firstAnalysisOrganization,
  pickerByAnalysisPeriod,
  toAnalysisOrganizationScopeTree,
  toAnalysisTreeData,
} from '../../utils';

import { useLocalizedFormErrors } from '@/views/energyCarbon/hooks/useLocalizedFormErrors';
import styles from '../../index.module.css';

type SingleAnalysisKind = 'overview' | 'boundary' | 'structure' | 'form';

interface Props {
  kind: SingleAnalysisKind;
  title: string;
  permissionKey: string;
}

interface SearchValues {
  scopeKey: string;
  periodType: SinglePeriodType;
  periodDate: Dayjs;
  boundaryType?: BoundaryType;
}

const getPeriodOptions = () =>
  [
    { label: I18N.energyCarbon.energyConsumptionStatisticsByMonth, value: 2 },
    { label: I18N.energyCarbon.analysisByQuarter, value: 3 },
    { label: I18N.energyCarbon.energyConsumptionStatisticsByYear, value: 4 },
  ] satisfies Array<{ label: string; value: SinglePeriodType }>;

const getOverviewMetrics = () =>
  [
    ['comprehensiveEnergy', I18N.energyCarbon.analysisComprehensiveEnergy],
    ['energyConsumption', I18N.energyCarbon.analysisEnergyConsumption],
    ['mediumConsumption', I18N.energyCarbon.energyMedium],
    ['rawMaterialConsumption', I18N.energyCarbon.analysisRawMaterialEnergy],
    ['cleanEnergyRate', I18N.energyCarbon.analysisCleanEnergyRate],
    ['renewableEnergyRate', I18N.energyCarbon.analysisRenewableEnergyRate],
    ['energyEfficiency', I18N.energyCarbon.analysisEnergyEfficiency],
    ['outputValueIntensity', I18N.energyCarbon.analysisOutputValueIntensity],
    ['addedValueIntensity', I18N.energyCarbon.analysisAddedValueIntensity],
    [
      'standardProductIntensity',
      I18N.energyCarbon.analysisStandardProductIntensity,
    ],
  ] satisfies Array<[keyof OverviewResponse, string]>;

interface OverviewMetricRow {
  key: keyof OverviewResponse;
  label: string;
  metric: OverviewMetric;
}

type OverviewComparisonKey = 'yearOnYear' | 'monthOnMonth';

/** 按概览筛选器的统计维度格式化当前、同比和环比统计周期。 */
function formatOverviewPeriod(
  periodType: SinglePeriodType,
  periodDate: Dayjs,
  comparison?: OverviewComparisonKey,
) {
  // 碳云日期兼容层可能使用可变对象，表头推算不能改写筛选器里的日期。
  const period = periodDate.clone();
  const date =
    comparison === 'yearOnYear'
      ? period.subtract(1, 'year')
      : comparison === 'monthOnMonth'
      ? period.subtract(
          periodType === 2 ? 1 : periodType === 3 ? 3 : 1,
          periodType === 4 ? 'year' : 'month',
        )
      : period;
  if (periodType === 2) return date.format('YYYY-MM');
  if (periodType === 3) {
    return `${date.format('YYYY')}-Q${Math.floor(date.month() / 3) + 1}`;
  }
  return date.format('YYYY');
}

/** 指标单位并入指标名称，标准产品单位由概览接口返回并保留完整 Tooltip。 */
function formatOverviewMetricLabel(label: string, metric: OverviewMetric) {
  const unit = metric.unit?.trim();
  return unit
    ? I18N.template(I18N.energyCarbon.analysisLabelWithUnit, {
        val1: label,
        val2: unit,
      })
    : label;
}

const getBoundaryColumns = (): ColumnsType<BoundaryAnalysisRow> => [
  {
    title: I18N.energyCarbon.energyFormTime,
    dataIndex: 'period',
    render: displayAnalysisValue,
  },
  {
    title: I18N.energyCarbon.energyFormBoundary,
    dataIndex: 'boundaryName',
    width: '33.33%',
    ellipsis: { showTitle: false },
    render: value => {
      const displayValue = displayAnalysisValue(value);
      return (
        <Typography.Text ellipsis={{ tooltip: displayValue }}>
          {displayValue}
        </Typography.Text>
      );
    },
  },
  {
    title: I18N.energyCarbon.analysisComprehensiveEnergyTce,
    dataIndex: 'comprehensiveEnergy',
    align: 'right',
    render: displayAnalysisValue,
  },
  {
    title: I18N.energyCarbon.analysisCleanEnergyPercent,
    dataIndex: 'cleanEnergyRate',
    align: 'right',
    render: displayAnalysisValue,
  },
  {
    title: I18N.energyCarbon.analysisRenewableEnergyPercent,
    dataIndex: 'renewableEnergyRate',
    align: 'right',
    render: displayAnalysisValue,
  },
];

const getStructureColumns = (): ColumnsType<StructureAnalysisRow> => [
  {
    title: I18N.energyCarbon.energyFormTime,
    dataIndex: 'period',
    render: displayAnalysisValue,
  },
  {
    title: I18N.energyCarbon.energyFormBoundary,
    dataIndex: 'boundaryName',
    width: '24%',
    ellipsis: { showTitle: false },
    render: value => {
      const displayValue = displayAnalysisValue(value);
      return (
        <Typography.Text ellipsis={{ tooltip: displayValue }}>
          {displayValue}
        </Typography.Text>
      );
    },
  },
  {
    title: I18N.energyCarbon.energyName,
    dataIndex: 'energyName',
    width: '32%',
    ellipsis: { showTitle: false },
    render: value => {
      const displayValue = displayAnalysisValue(value);
      return (
        <Typography.Text
          ellipsis={{ tooltip: displayValue }}
          className={styles.singleLineCell}
        >
          {displayValue}
        </Typography.Text>
      );
    },
  },
  {
    title: I18N.energyCarbon.analysisConsumptionAmount,
    dataIndex: 'consumption',
    align: 'right',
    render: displayAnalysisValue,
  },
  {
    title: I18N.energyCarbon.measurementUnit,
    dataIndex: 'unit',
    render: displayAnalysisValue,
  },
  {
    title: I18N.energyCarbon.energyFormCoal,
    dataIndex: 'standardCoal',
    align: 'right',
    render: displayAnalysisValue,
  },
  {
    title: I18N.energyCarbon.energyFormRate,
    dataIndex: 'rate',
    align: 'right',
    render: displayAnalysisValue,
  },
];

/** 概览列表按需求展示能耗指标、当前周期值、同比和环比两行明细。 */
function getOverviewColumns(
  periodType: SinglePeriodType,
  periodDate?: Dayjs,
): ColumnsType<OverviewMetricRow> {
  const currentPeriod = periodDate
    ? formatOverviewPeriod(periodType, periodDate)
    : undefined;
  const yearOnYearPeriod = periodDate
    ? formatOverviewPeriod(periodType, periodDate, 'yearOnYear')
    : undefined;
  const monthOnMonthPeriod = periodDate
    ? formatOverviewPeriod(periodType, periodDate, 'monthOnMonth')
    : undefined;

  const columns: ColumnsType<OverviewMetricRow> = [
    {
      title: I18N.energyCarbon.analysisEnergyIndicator,
      dataIndex: 'label',
      width: 320,
      ellipsis: { showTitle: false },
      render: value => (
        <Typography.Text ellipsis={{ tooltip: value }}>{value}</Typography.Text>
      ),
    },
    {
      title: currentPeriod
        ? I18N.template(I18N.energyCarbon.analysisStatisticsPeriodValue, {
            val1: currentPeriod,
          })
        : I18N.energyCarbon.analysisStatisticsPeriod,
      width: 200,
      render: (_, row) => displayAnalysisValue(row.metric.value),
    },
    {
      title: yearOnYearPeriod
        ? I18N.template(I18N.energyCarbon.analysisYearOnYearPeriod, {
            val1: yearOnYearPeriod,
          })
        : I18N.energyCarbon.analysisYearOnYear,
      width: 240,
      render: (_, row) => (
        <OverviewComparison comparison={row.metric.yearOnYear} showRate />
      ),
    },
  ];
  // 年度没有可比较的上一自然周期，整列不展示；月度和季度分别比较上一月、上一季度。
  if (periodType !== 4) {
    columns.push({
      title: monthOnMonthPeriod
        ? I18N.template(I18N.energyCarbon.analysisPeriodOnPeriodPeriod, {
            val1: monthOnMonthPeriod,
          })
        : I18N.energyCarbon.analysisPeriodOnPeriod,
      width: 240,
      render: (_, row) => (
        <OverviewComparison comparison={row.metric.monthOnMonth} showRate />
      ),
    });
  }
  return columns;
}

const STRUCTURE_NAME_MAX_LENGTH = 16;

/** 图表名称保持单行，完整名称通过图表 Tooltip 查看。 */
function truncateStructureEnergyName(value: string) {
  if (value.length <= STRUCTURE_NAME_MAX_LENGTH) return value;
  return `${value.slice(0, 10)}…${value.slice(-5)}`;
}

/** 同比和环比分两行展示变化量、变化率。 */
function OverviewComparison({
  comparison,
  showRate,
}: {
  comparison: OverviewMetric['yearOnYear'];
  showRate: boolean;
}) {
  useLocale();
  if (!comparison) return <>-</>;
  return (
    <div>
      <div>
        {I18N.energyCarbon.analysisChangeAmount}
        {displayAnalysisValue(comparison.change)}
      </div>
      {showRate ? (
        <div>
          {I18N.energyCarbon.analysisChangeRate}
          {comparison.rate === null || comparison.rate === undefined
            ? '-'
            : `${displayAnalysisValue(comparison.rate)}%`}
        </div>
      ) : null}
    </div>
  );
}

/** 按固定顺序以列表展示十项指标，缺少查询结果时保留空状态。 */
function OverviewResult({
  data,
  loading,
  periodType,
  periodDate,
}: {
  data?: OverviewResponse;
  loading: boolean;
  periodType: SinglePeriodType;
  periodDate?: Dayjs;
}) {
  useLocale();
  if (!data)
    return <Empty description={I18N.energyCarbon.analysisNoStatistics} />;
  const dataSource = getOverviewMetrics().map(([key, label]) => ({
    key,
    label: formatOverviewMetricLabel(label, data[key]),
    metric: data[key],
  }));

  return (
    <Card
      title={I18N.energyCarbon.analysisEnergyDataList}
      className={styles.resultCard}
    >
      <Table<OverviewMetricRow>
        rowKey='key'
        columns={getOverviewColumns(periodType, periodDate)}
        dataSource={dataSource}
        loading={loading}
        pagination={false}
        scroll={{ x: 1000 }}
        data-testid='overview-analysis-table'
      />
    </Card>
  );
}

/** 展示边界 TOP10 柱线图和未截断全量表格。 */
function BoundaryResult({
  data,
  colors,
  mutedTextColor,
  loading,
}: {
  data?: BoundaryAnalysisResponse;
  colors: string[];
  mutedTextColor: string;
  loading: boolean;
}) {
  useLocale();
  return (
    <>
      <Card
        title={I18N.energyCarbon.analysisBoundaryTopTen}
        className={styles.resultCard}
      >
        {data?.chart.categories.length ? (
          <EnergyCarbonCategoryChart
            option={boundaryAnalysisChartOption(
              data.chart,
              colors,
              mutedTextColor,
              'boundary',
            )}
            className={styles.chart}
            dataTestId='boundary-analysis-chart'
          />
        ) : (
          <Empty description={I18N.energyCarbon.analysisNoStatistics} />
        )}
      </Card>
      <Card
        title={I18N.energyCarbon.analysisBoundaryEnergyData}
        className={styles.resultCard}
      >
        <Table<BoundaryAnalysisRow>
          rowKey={row => `${row.orgId}-${row.boundaryId}`}
          columns={getBoundaryColumns()}
          dataSource={data?.table ?? []}
          loading={loading}
          pagination={false}
          scroll={{ x: 900 }}
          data-testid='boundary-analysis-table'
        />
      </Card>
    </>
  );
}

/** 构造能耗结构饼图，使用 ECharts 分类色板区分不同能源。 */
function structurePieOption(pie: StructurePieItem[]): Record<string, unknown> {
  return {
    tooltip: {
      trigger: 'item',
      renderMode: 'richText',
      formatter: (params: { data: StructurePieItem & { value: number } }) => {
        const item = params.data;
        const lines = [
          item.energyName ?? '-',
          I18N.template(I18N.energyCarbon.analysisStandardCoalTooltip, {
            val1: displayAnalysisValue(item.standardCoal),
          }),
          I18N.template(I18N.energyCarbon.analysisShareTooltip, {
            val1: displayAnalysisValue(item.rate),
          }),
        ];
        if (!item.other) {
          lines.splice(
            1,
            0,
            I18N.template(I18N.energyCarbon.analysisConsumptionTooltip, {
              val1: displayAnalysisValue(item.consumption),
              val2: item.unit ?? '',
            }),
          );
        }
        return lines.join('\n');
      },
    },
    legend: {
      type: 'scroll',
      bottom: 0,
      formatter: (name: string) => truncateStructureEnergyName(name),
      data: pie.map(item => {
        const name = item.energyName ?? '-';
        return truncateStructureEnergyName(name) === name
          ? name
          : {
              name,
              tooltip: {
                show: true,
                formatter: () => name,
              },
            };
      }),
    },
    series: [
      {
        name: I18N.energyCarbon.analysisEnergyStructure,
        type: 'pie',
        radius: ['42%', '68%'],
        center: ['50%', '46%'],
        data: pie.map(item => ({
          ...item,
          name: item.energyName ?? '-',
          value: Number(item.standardCoal),
        })),
        label: {
          width: 160,
          overflow: 'truncate',
          ellipsis: '…',
          formatter: (params: { name: string; percent: number }) =>
            `${truncateStructureEnergyName(params.name)}\n${params.percent}%`,
        },
      },
    ],
  };
}

/** 展示结构摘要、仅正折标煤饼图和保留正零负值的全量表格。 */
function StructureResult({
  data,
  loading,
}: {
  data?: StructureAnalysisResponse;
  loading: boolean;
}) {
  useLocale();
  const largestEnergyName = displayAnalysisValue(
    data?.summary.largestEnergyName,
  );

  return (
    <>
      <div className={styles.summaryGrid}>
        <Card size='small'>
          <Statistic
            title={I18N.energyCarbon.analysisCleanEnergyRate}
            value={displayAnalysisValue(data?.summary.cleanEnergyRate)}
            suffix='%'
          />
        </Card>
        <Card size='small'>
          <Statistic
            title={I18N.energyCarbon.analysisRenewableEnergyRate}
            value={displayAnalysisValue(data?.summary.renewableEnergyRate)}
            suffix='%'
          />
        </Card>
        <Card size='small'>
          <div className={styles.summaryEnergyStatistic}>
            <div className={styles.summaryEnergyTitle}>
              {I18N.energyCarbon.analysisLargestEnergySource}
            </div>
            <div className={styles.summaryEnergyContent}>
              <Typography.Text
                ellipsis={{ tooltip: largestEnergyName }}
                className={styles.summaryEnergyName}
              >
                {largestEnergyName}
              </Typography.Text>
              {data?.summary.largestEnergyRate !== null &&
              data?.summary.largestEnergyRate !== undefined ? (
                <span className={styles.summaryEnergyRate}>
                  {displayAnalysisValue(data.summary.largestEnergyRate)}%
                </span>
              ) : null}
            </div>
          </div>
        </Card>
      </div>
      <Card
        title={I18N.energyCarbon.analysisEnergyStructure}
        className={styles.resultCard}
      >
        {data?.pie.length ? (
          <ReactECharts
            option={structurePieOption(data.pie)}
            notMerge
            className={styles.chart}
            data-testid='structure-analysis-chart'
          />
        ) : (
          <Empty
            description={I18N.energyCarbon.analysisNoPositiveStandardCoal}
          />
        )}
      </Card>
      <Card
        title={I18N.energyCarbon.analysisEnergyStructureDetails}
        className={styles.resultCard}
      >
        <Table<StructureAnalysisRow>
          rowKey={row =>
            `${row.period ?? ''}-${row.boundaryName ?? ''}-${row.energyId}-${
              row.unit ?? ''
            }`
          }
          columns={getStructureColumns()}
          dataSource={data?.table ?? []}
          loading={loading}
          pagination={false}
          scroll={{ x: 760 }}
          data-testid='structure-analysis-table'
        />
      </Card>
    </>
  );
}

/**
 * 业务检索：能源分析 - 按组织和单个自然周期查询概览、边界或能耗结构结果
 */
export default function SinglePeriodAnalysisPage({
  kind,
  title,
  permissionKey,
}: Props) {
  useLocale();
  // 初始化筛选、提示和主题；页面权限同时控制路由、查询按钮和默认请求。
  const [form] = Form.useForm<SearchValues>();
  useLocalizedFormErrors(form);
  const { message } = App.useApp();
  const { token } = theme.useToken();
  const canQuery = useMenuStore(state =>
    state.permissionKeys.has(permissionKey),
  );
  const initializedRef = useRef(false);

  // 概览页直接读取系统数据权限组织树，边界和结构分析继续读取带边界配置的统计范围树。
  const { data: statisticsScopeTree = [], isFetching: statisticsScopeLoading } =
    useStatisticsScopeTree({ enabled: kind !== 'overview' });
  const { data: organizationTree = [], isFetching: organizationTreeLoading } =
    useDataPermissionOrgTree({ enabled: kind === 'overview' });
  const scopeTree = useMemo(
    () =>
      kind === 'overview'
        ? toAnalysisOrganizationScopeTree(organizationTree)
        : statisticsScopeTree,
    [kind, organizationTree, statisticsScopeTree],
  );
  const scopeLoading =
    kind === 'overview' ? organizationTreeLoading : statisticsScopeLoading;
  const mutation = useEnergyAnalysisMutation(kind);
  const treeData = useMemo(
    () => toAnalysisTreeData(scopeTree, true),
    [scopeTree],
  );
  // 组织树首次加载时展开所有根组织，首屏展示一级和二级组织。
  const defaultExpandedKeys = useMemo(
    () => treeData.map(node => node.key),
    [treeData],
  );
  const scopeKey = Form.useWatch('scopeKey', form);
  const periodType = Form.useWatch('periodType', form) ?? 2;
  const periodDate = Form.useWatch('periodDate', form);
  const colors = [
    token.colorPrimary,
    token.colorSuccess,
    token.colorWarning,
    token.colorInfo,
    token.colorError,
  ];

  /** 校验组织和表单值，转换为后端单周期请求并刷新当前页面结果。 */
  const runQuery = (values: SearchValues, scopeNode?: StatisticsScopeNode) => {
    // 无按钮权限时不发请求；组织必须来自后端当前数据权限范围树。
    if (!canQuery) return;
    const scope = scopeNode ?? findAnalysisScope(scopeTree, values.scopeKey);
    if (!scope?.orgId || scope.scopeType !== 1) {
      message.warning(I18N.energyCarbon.organizationRequired);
      return;
    }
    if (kind === 'boundary' && !values.boundaryType) {
      message.warning(I18N.energyCarbon.analysisBoundaryTypeRequired);
      return;
    }

    // 单周期只提交组织、统计维度和选中日期，边界页额外提交统一分类。
    const request: SinglePeriodAnalysisRequest = {
      orgId: scope.orgId,
      periodType: values.periodType,
      periodDate: values.periodDate.format('YYYY-MM-DD'),
      boundaryType: kind === 'boundary' ? values.boundaryType : undefined,
    };
    mutation.mutate(request);
  };

  // 范围树首次就绪时选择首个组织和当月；边界分类默认读取该组织综合能耗配置。
  useEffect(() => {
    if (initializedRef.current || scopeTree.length === 0) return;
    const scope = firstAnalysisOrganization(scopeTree);
    if (!scope) return;
    const values: SearchValues = {
      scopeKey: scope.key,
      periodType: 2,
      periodDate: dayjs(),
      boundaryType: kind === 'boundary' ? scope.boundaryType ?? 1 : undefined,
    };
    initializedRef.current = true;
    form.setFieldsValue(values);
    if (canQuery) runQuery(values, scope);
  }, [canQuery, form, kind, scopeTree]);

  // 左侧组织树固定提供范围，右侧依次展示筛选和当前页面专属结果。
  return (
    <PageContainer title={title} permissionKey={permissionKey}>
      <div className={styles.workspace}>
        <Card
          title={I18N.energyCarbon.organization}
          className={styles.scopeCard}
        >
          <Spin spinning={scopeLoading}>
            {treeData.length ? (
              <Tree
                blockNode
                defaultExpandedKeys={defaultExpandedKeys}
                treeData={treeData}
                titleRender={node => {
                  const title =
                    typeof node.title === 'string' ? node.title : '';
                  return (
                    <Typography.Text
                      ellipsis={{ tooltip: title }}
                      className={styles.treeNodeTitle}
                    >
                      {title}
                    </Typography.Text>
                  );
                }}
                selectedKeys={scopeKey ? [scopeKey] : []}
                onSelect={(keys, info) => {
                  // 再次点击已选组织时继续使用当前节点，不把表单范围清空。
                  const nextKey = String(keys[0] ?? info.node.key);
                  const scope = findAnalysisScope(scopeTree, nextKey);
                  if (!scope?.orgId || scope.scopeType !== 1) return;
                  form.setFieldsValue({
                    scopeKey: nextKey,
                    boundaryType:
                      kind === 'boundary' ? scope.boundaryType ?? 1 : undefined,
                  });
                  // 形态分析点击组织后立即按当前周期刷新；原分析页交互不变。
                  if (kind === 'form') runQuery(form.getFieldsValue(), scope);
                }}
                className={styles.scopeTree}
                data-testid={`${kind}-analysis-org-tree`}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={I18N.energyCarbon.noAccessibleOrganizations}
              />
            )}
          </Spin>
        </Card>
        <div className={styles.content}>
          <Card className={styles.filterCard}>
            <Form<SearchValues>
              form={form}
              layout='inline'
              requiredMark={false}
              onFinish={values => runQuery(values)}
            >
              <Form.Item
                name='scopeKey'
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
                    // 切换维度只重置周期日期，组织和边界分类保持不变。
                    form.setFieldsValue({
                      periodType: value as SinglePeriodType,
                      periodDate: dayjs(),
                    });
                  }}
                  data-testid={`${kind}-analysis-period-type`}
                />
              </Form.Item>
              <Form.Item
                name='periodDate'
                label={I18N.energyCarbon.analysisStatisticsPeriod}
                rules={[
                  {
                    required: true,
                    message: I18N.energyCarbon.analysisStatisticsPeriodRequired,
                  },
                ]}
              >
                <DatePicker
                  picker={pickerByAnalysisPeriod(periodType)}
                  disabledDate={date => date.isAfter(dayjs(), 'day')}
                  allowClear={false}
                  data-testid={`${kind}-analysis-period-date`}
                />
              </Form.Item>
              {kind === 'boundary' ? (
                <Form.Item
                  name='boundaryType'
                  label={I18N.energyCarbon.boundaryCategory}
                  rules={[
                    {
                      required: true,
                      message: I18N.energyCarbon.analysisBoundaryTypeRequired,
                    },
                  ]}
                >
                  <Select
                    options={[...getBoundaryTypeOptions()]}
                    data-testid='boundary-analysis-type'
                  />
                </Form.Item>
              ) : null}
              <Form.Item>
                <Space>
                  <AuthButton permissionKey={permissionKey}>
                    <Button
                      type='primary'
                      htmlType='submit'
                      loading={mutation.isLoading}
                      data-testid={`${kind}-analysis-query`}
                    >
                      {I18N.common.actions.search}
                    </Button>
                  </AuthButton>
                  <Button
                    onClick={() => {
                      // 重置恢复首个组织、当月和组织默认边界分类；无查询权限时只更新筛选。
                      const scope = firstAnalysisOrganization(scopeTree);
                      if (!scope) return;
                      const values: SearchValues = {
                        scopeKey: scope.key,
                        periodType: 2,
                        periodDate: dayjs(),
                        boundaryType:
                          kind === 'boundary'
                            ? scope.boundaryType ?? 1
                            : undefined,
                      };
                      form.setFieldsValue(values);
                      if (canQuery) runQuery(values, scope);
                    }}
                    data-testid={`${kind}-analysis-reset`}
                  >
                    {I18N.common.actions.reset}
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>

          {kind === 'form' ? (
            <FormAnalysisResult
              data={mutation.data as FormAnalysisResponse | undefined}
              loading={mutation.isLoading}
            />
          ) : kind === 'overview' ? (
            <OverviewResult
              data={mutation.data as OverviewResponse | undefined}
              loading={mutation.isLoading}
              periodType={periodType}
              periodDate={periodDate}
            />
          ) : kind === 'boundary' ? (
            <BoundaryResult
              data={mutation.data as BoundaryAnalysisResponse | undefined}
              colors={colors}
              mutedTextColor={token.colorTextTertiary}
              loading={mutation.isLoading}
            />
          ) : (
            <StructureResult
              data={mutation.data as StructureAnalysisResponse | undefined}
              loading={mutation.isLoading}
            />
          )}
        </div>
      </div>
    </PageContainer>
  );
}
