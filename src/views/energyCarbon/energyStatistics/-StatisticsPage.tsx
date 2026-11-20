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
  Table,
  Tree,
  Typography,
  theme,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useEffect, useMemo, useRef } from 'react';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import EnergyCarbonCategoryChart from '@/views/energyCarbon/components/EnergyCarbonCategoryChart';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';

import { boundaryAnalysisChartOption } from '../energyAnalysis/utils';
import {
  ENERGY_CARBON_MAXIMUM_PERIOD_COUNT,
  energyCarbonCategoryChartConfig,
  energyCarbonPeriodCount,
  energyCarbonPeriodRangeMessage,
  trimTrailingDecimalZeros,
} from '../utils';
import {
  useStatisticsMutation,
  useStatisticsOptions,
  useStatisticsScopeTree,
} from './hooks';
import type {
  IntensityIndicatorType,
  StatisticsChart,
  StatisticsPageKind,
  StatisticsPeriodType,
  StatisticsRequest,
  StatisticsScopeNode,
} from './types';

import { useLocalizedFormErrors } from '@/views/energyCarbon/hooks/useLocalizedFormErrors';
import styles from './index.module.css';

const getPeriodOptions = () =>
  [
    { label: I18N.energyCarbon.analysisByDay, value: 1 },
    { label: I18N.energyCarbon.energyConsumptionStatisticsByMonth, value: 2 },
    { label: I18N.energyCarbon.analysisByQuarter, value: 3 },
    { label: I18N.energyCarbon.energyConsumptionStatisticsByYear, value: 4 },
  ] satisfies Array<{ label: string; value: StatisticsPeriodType }>;

const getIntensityIndicatorOptions = () =>
  [
    { label: I18N.energyCarbon.analysisOutputValue, value: 1 },
    { label: I18N.energyCarbon.analysisAddedValue, value: 2 },
    { label: I18N.energyCarbon.standardProduct, value: 3 },
    { label: I18N.energyCarbon.analysisProduct, value: 4 },
  ] satisfies Array<{ label: string; value: IntensityIndicatorType }>;

interface StatisticsPageProps {
  kind: StatisticsPageKind;
  title: string;
  permissionKey: string;
}

interface SearchValues {
  scopeKey: string;
  periodType: StatisticsPeriodType;
  period: [Dayjs, Dayjs];
  energyId?: number;
  indicatorType?: IntensityIndicatorType;
  productId?: number;
}

const getConsumptionChartLabels = (): Record<string, string> => ({
  能源: I18N.energyCarbon.analysisEnergyConsumption,
  能源消费量: I18N.energyCarbon.analysisEnergyConsumption,
});

/** 将服务端统计范围树转换成树组件数据，组织节点直接展示全称。 */
function toScopeTreeData(
  nodes: StatisticsScopeNode[],
  organizationOnly = false,
): Array<{
  key: string;
  value: string;
  title: string;
  selectable: boolean;
  children: ReturnType<typeof toScopeTreeData>;
}> {
  // 强度计算只接受组织范围，过滤边界分组和具体边界后保留完整组织层级。
  const visibleNodes = organizationOnly
    ? nodes.filter(node => node.scopeType === 1)
    : nodes;
  return visibleNodes.map(node => ({
    key: node.key,
    value: node.key,
    title: node.name,
    selectable: node.selectable,
    children: toScopeTreeData(node.children ?? [], organizationOnly),
  }));
}

/** 按 key 深度查找统计范围节点。 */
function findScopeNode(
  nodes: StatisticsScopeNode[],
  key: string,
): StatisticsScopeNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node;
    const child = findScopeNode(node.children ?? [], key);
    if (child) return child;
  }
  return undefined;
}

/** 默认优先选择第一个组织节点，避免默认进入具体边界。 */
function firstOrganizationNode(
  nodes: StatisticsScopeNode[],
): StatisticsScopeNode | undefined {
  for (const node of nodes) {
    if (node.selectable && node.scopeType === 1) return node;
    const child = firstOrganizationNode(node.children ?? []);
    if (child) return child;
  }
  return undefined;
}

/** 根据页面和周期生成不包含未来周期的默认范围。 */
function defaultPeriod(
  kind: StatisticsPageKind,
  periodType: StatisticsPeriodType,
  energySelected = false,
): [Dayjs, Dayjs] {
  // 能耗查询未选择具体能源时只允许单周期，默认直接使用当前自然周期。
  const current = dayjs();
  if (kind === 'energy' && !energySelected) {
    return [current.clone(), current.clone()];
  }

  // 其他情况按统计维度生成连续默认范围；消费量按年默认覆盖近10年。
  // 碳云构建会将 dayjs 兼容为可变日期对象，计算开始时间时不能改写结束时间。
  if (periodType === 1) return [current.clone().subtract(6, 'day'), current];
  if (periodType === 2) return [current.clone().subtract(5, 'month'), current];
  if (periodType === 3) return [current.clone().subtract(9, 'month'), current];
  if (kind === 'consumption')
    return [current.clone().subtract(9, 'year'), current];
  return [current.clone().subtract(4, 'year'), current];
}

/** DatePicker 的展示粒度与统计周期保持一致。 */
function pickerByPeriod(periodType: StatisticsPeriodType) {
  if (periodType === 2) return 'month' as const;
  if (periodType === 3) return 'quarter' as const;
  if (periodType === 4) return 'year' as const;
  return 'date' as const;
}

/** 空值显示短横线，数值去除末尾无效0。 */
function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'number' || typeof value === 'string') {
    return trimTrailingDecimalZeros(String(value));
  }
  return String(value);
}

/** 名称列单行显示；只有实际溢出形成省略号时才提供完整名称。 */
function renderEllipsisValue(value: unknown) {
  const display = displayValue(value);
  return (
    <Typography.Text ellipsis={{ tooltip: display }}>{display}</Typography.Text>
  );
}

/** 根据统计页面返回对应表格列。 */
function columnsByKind(
  kind: StatisticsPageKind,
): ColumnsType<Record<string, unknown>> {
  if (kind === 'energy') {
    return [
      {
        title: I18N.energyCarbon.energyFormTime,
        dataIndex: 'period',
        width: 120,
      },
      {
        title: I18N.energyCarbon.energyName,
        dataIndex: 'energyName',
        width: 180,
        ellipsis: { showTitle: false },
        render: renderEllipsisValue,
      },
      {
        title: I18N.energyCarbon.analysisConsumptionAmount,
        dataIndex: 'consumption',
        align: 'right',
        render: displayValue,
      },
      {
        title: I18N.energyCarbon.measurementUnit,
        dataIndex: 'unit',
        width: 110,
        render: displayValue,
      },
      {
        title: I18N.energyCarbon.energyFormCoal,
        dataIndex: 'standardCoal',
        align: 'right',
        render: displayValue,
      },
      {
        title: I18N.energyCarbon.energyFormBoundary,
        dataIndex: 'boundaryName',
        width: 180,
        ellipsis: { showTitle: false },
        render: renderEllipsisValue,
      },
    ];
  }
  if (kind === 'consumption') {
    return [
      {
        title: I18N.energyCarbon.energyFormTime,
        dataIndex: 'period',
        width: 120,
      },
      {
        title: I18N.energyCarbon.analysisComprehensiveEnergyTce,
        dataIndex: 'totalConsumption',
        align: 'right',
        render: displayValue,
      },
      {
        title: I18N.energyCarbon.analysisEnergyConsumptionTce,
        dataIndex: 'energyConsumption',
        align: 'right',
        render: displayValue,
      },
      {
        title: I18N.energyCarbon.analysisMediumConsumptionTce,
        dataIndex: 'mediumConsumption',
        align: 'right',
        render: displayValue,
      },
      {
        title: I18N.energyCarbon.analysisRawMaterialTce,
        dataIndex: 'rawMaterialConsumption',
        align: 'right',
        render: displayValue,
      },
      {
        title: I18N.energyCarbon.analysisCleanEnergyPercent,
        dataIndex: 'cleanEnergyRate',
        align: 'right',
        render: displayValue,
      },
      {
        title: I18N.energyCarbon.analysisRenewableEnergyPercent,
        dataIndex: 'renewableEnergyRate',
        align: 'right',
        render: displayValue,
      },
      {
        title: I18N.energyCarbon.energyFormBoundary,
        dataIndex: 'boundaryName',
        width: 180,
        ellipsis: { showTitle: false },
        render: renderEllipsisValue,
      },
    ];
  }
  return [
    {
      title: I18N.energyCarbon.energyFormTime,
      dataIndex: 'period',
      width: 120,
    },
    {
      title: I18N.energyCarbon.analysisProductionOperationIndicator,
      dataIndex: 'indicatorName',
      width: 180,
      ellipsis: { showTitle: false },
      render: renderEllipsisValue,
    },
    {
      title: I18N.common.fields.quantity,
      dataIndex: 'quantity',
      align: 'right',
      render: displayValue,
    },
    {
      title: I18N.energyCarbon.analysisQuantityUnit,
      dataIndex: 'unit',
      width: 120,
      render: displayValue,
    },
    {
      title: I18N.energyCarbon.analysisUnitComprehensiveEnergy,
      dataIndex: 'intensity',
      align: 'right',
      render: displayValue,
    },
    {
      title: I18N.energyCarbon.organizationName,
      dataIndex: 'organizationName',
      width: 180,
      ellipsis: { showTitle: false },
      render: renderEllipsisValue,
    },
  ];
}

/** 根据当前最大值生成整数刻度和易读上限，结果用于避免坐标轴出现浮点尾数。 */
function integerAxisScale(maxValue: number) {
  // 先按五段正刻度计算原始步长，再向上归一到易读的整数倍数量级。
  const safeMaximum = Math.max(Math.ceil(maxValue), 1);
  const roughInterval = safeMaximum / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughInterval));
  const normalizedInterval = roughInterval / magnitude;
  const factor =
    [1, 2, 3, 4, 5, 6, 8, 10].find(
      candidate => normalizedInterval <= candidate,
    ) ?? 10;

  // 步长至少为 1，固定五段正刻度，使左右轴能用相同段数准确对齐零点。
  const interval = Math.max(Math.ceil(factor * magnitude), 1);
  return {
    interval,
    maximum: interval * 5,
  };
}

/** 图表数值轴保留最多六位有效小数，避免强度小于 1 时多个刻度都显示为 0。 */
function formatStatisticsAxisValue(value: number) {
  return Number(value.toFixed(6)).toLocaleString('en-US', {
    maximumFractionDigits: 6,
  });
}

/** 补齐图例业务名称和单位，避免图表只展示服务端返回的简称。 */
function formatChartSeriesName(
  series: StatisticsChart['series'][number],
  kind: StatisticsPageKind,
) {
  const rawName = series.name?.trim() || '-';
  const name =
    kind === 'consumption'
      ? getConsumptionChartLabels()[rawName] ?? rawName
      : rawName;
  const unit = series.unit?.trim();
  return !unit || name === '-' || name.includes(`（${unit}）`)
    ? name
    : `${name}（${unit}）`;
}

/** 将服务端图表协议转换成 ECharts 配置。 */
function chartOption(
  chart: StatisticsChart,
  colors: string[],
  mutedTextColor: string,
  kind: StatisticsPageKind,
): Record<string, unknown> {
  // 消费量页先保留接口原始数值和百分比，再复用边界分析的换算逻辑将全部系列叠加到同一柱位。
  if (kind === 'consumption') {
    const consumptionChart = {
      ...chart,
      series: chart.series.map(series => ({
        ...series,
        name: formatChartSeriesName(series, kind),
      })),
    };
    const option = boundaryAnalysisChartOption(
      consumptionChart,
      colors,
      mutedTextColor,
      'consumption',
    );
    const tooltip = option.tooltip as Record<string, unknown>;
    const baseFormatter = tooltip.formatter as
      | ((params: unknown) => string)
      | undefined;

    // 综合能耗只追加到 Tooltip；图例和绘图系列保持原五项，避免重复绘制总量柱。
    return {
      ...option,
      tooltip: {
        ...tooltip,
        formatter: (params: unknown) => {
          const items = (Array.isArray(params) ? params : [params]) as Array<{
            dataIndex: number;
          }>;
          const dataIndex = items[0]?.dataIndex;
          const comprehensiveValues = consumptionChart.series
            .filter(series => Number(series.chartType) === 1)
            .map(series => Number(series.values[dataIndex]))
            .filter(Number.isFinite);
          const comprehensiveValue = comprehensiveValues.reduce(
            (total, value) => total + value,
            0,
          );
          const baseLines = (baseFormatter?.(params) ?? '').split('\n');
          const unit = chart.leftUnit?.trim() || 'tce';
          const display = comprehensiveValues.length
            ? trimTrailingDecimalZeros(comprehensiveValue.toFixed(6))
            : '-';
          return [
            baseLines[0] ?? '',
            I18N.template(
              I18N.energyCarbon.analysisComprehensiveEnergyTooltip,
              {
                val1: unit,
                val2: display,
                val3: display === '-' ? '' : ` ${unit}`,
              },
            ),
            ...baseLines.slice(1),
          ].join('\n');
        },
      },
    };
  }

  // 先根据返回单位确定是否启用右轴，保证柱线混合图使用正确的数值轴。
  const hasRightAxis = Boolean(chart.rightUnit);

  // 接口中的 BigDecimal 可能序列化为字符串，统一转成数字后再计算轴范围和绘制正负值。
  const normalizedSeries = chart.series.map(series => ({
    ...series,
    values: series.values.map(value => {
      if (value === null || value === '') return null;
      const numericValue = Number(value);
      return Number.isFinite(numericValue) ? numericValue : null;
    }),
  }));
  const barSeries = normalizedSeries.filter(
    series => Number(series.chartType) === 1,
  );
  const lineValues = normalizedSeries
    .filter(series => Number(series.chartType) === 2)
    .flatMap(series => series.values)
    .filter((value): value is number => typeof value === 'number');

  // 双轴图按每个周期的正负柱状累计值计算左轴范围，避免堆积柱遗漏真实上下界。
  const leftPositiveMax = Math.max(
    0,
    ...chart.categories.map((_, index) =>
      barSeries.reduce((total, series) => {
        const value = series.values[index];
        return total + (typeof value === 'number' && value > 0 ? value : 0);
      }, 0),
    ),
  );
  const leftNegativeMin = Math.min(
    0,
    ...chart.categories.map((_, index) =>
      barSeries.reduce((total, series) => {
        const value = series.values[index];
        return total + (typeof value === 'number' && value < 0 ? value : 0);
      }, 0),
    ),
  );
  const rightPositiveMax = Math.max(0, ...lineValues);
  const rightNegativeMin = Math.min(0, ...lineValues);

  // 左轴动态生成五段整数正刻度，最大值随当前柱状数据向上扩展。
  const leftAxisScale = integerAxisScale(leftPositiveMax * 1.1);

  // 百分比轴默认按 20 一档展示五段正刻度，超过 100 时按 20 的倍数动态放大步长。
  const rightInterval = Math.max(20, Math.ceil(rightPositiveMax / 5 / 20) * 20);
  const rightMaximum = rightInterval * 5;

  // 两轴按相同负刻度段数扩展范围：负值完整显示、零点对齐，零线和底线不会重叠。
  const negativeIntervalCount = Math.max(
    leftNegativeMin < 0
      ? Math.ceil(Math.abs(leftNegativeMin) / leftAxisScale.interval)
      : 0,
    rightNegativeMin < 0
      ? Math.ceil(Math.abs(rightNegativeMin) / rightInterval)
      : 0,
  );
  const leftMinimum = -negativeIntervalCount * leftAxisScale.interval;
  const rightMinimum = -negativeIntervalCount * rightInterval;

  // 分类轴、柱宽和超量浏览使用能碳模块公共规则，保证查询、计算和分析页面保持一致。
  const categoryConfig = energyCarbonCategoryChartConfig(
    chart.categories,
    mutedTextColor,
  );

  // 再组装各页面专属图例、数值轴和序列；公共配置负责分类密度和周期完整性。
  return {
    color: colors,
    tooltip: categoryConfig.tooltip,
    legend: {
      top: 0,
      type: 'plain',
    },
    grid: {
      left: 24,
      right: hasRightAxis ? 32 : 24,
      top: 44,
      bottom: categoryConfig.gridBottom,
      containLabel: true,
    },
    xAxis: categoryConfig.xAxis,
    graphic: categoryConfig.graphic,
    yAxis: [
      {
        type: 'value',
        name: chart.leftUnit || '',
        min: hasRightAxis ? leftMinimum : undefined,
        max: hasRightAxis ? leftAxisScale.maximum : undefined,
        interval: hasRightAxis ? leftAxisScale.interval : undefined,
        axisLabel: {
          formatter: formatStatisticsAxisValue,
        },
      },
      ...(hasRightAxis
        ? [
            {
              type: 'value',
              name: chart.rightUnit || '',
              min: rightMinimum,
              max: rightMaximum,
              interval: rightInterval,
              axisLabel: {
                // 右轴负范围只用于和左轴零点对齐；利用率没有负值时不展示人工负刻度。
                formatter: (value: number) =>
                  value < 0 && rightNegativeMin >= 0
                    ? ''
                    : String(Math.round(value)),
              },
            },
          ]
        : []),
    ],
    dataZoom: categoryConfig.dataZoom,
    series: normalizedSeries.map(series => ({
      name: formatChartSeriesName(series, kind),
      type: Number(series.chartType) === 2 ? 'line' : 'bar',
      yAxisIndex: hasRightAxis && Number(series.chartType) === 2 ? 1 : 0,
      stack: series.stack,
      data: series.values,
      barMaxWidth:
        Number(series.chartType) === 1 ? categoryConfig.barMaxWidth : undefined,
      barCategoryGap:
        Number(series.chartType) === 1
          ? categoryConfig.barCategoryGap
          : undefined,
      barGap: Number(series.chartType) === 1 ? '20%' : undefined,
      connectNulls: false,
      smooth: false,
      emphasis: { focus: 'series' },
    })),
  };
}

/**
 * 业务检索：能耗统计 - 按统计范围、周期和业务筛选项查询并展示趋势与明细
 */
export default function StatisticsPage({
  kind,
  title,
  permissionKey,
}: StatisticsPageProps) {
  const { locale } = useLocale();
  // 初始化搜索表单、提示和主题上下文，为筛选交互、结果反馈及图表配色提供基础状态。
  const [form] = Form.useForm<SearchValues>();
  useLocalizedFormErrors(form);
  const { message } = App.useApp();
  const { token } = theme.useToken();

  // 读取页面权限、统计范围和可选项；页面权限同时控制查询入口，接口结果驱动筛选项内容。
  const canQuery = useMenuStore(state =>
    state.permissionKeys.has(permissionKey),
  );
  const initializedRef = useRef(false);
  const { data: scopeTree = [], isFetching: scopeLoading } =
    useStatisticsScopeTree();
  const { data: options, isFetching: optionsLoading } = useStatisticsOptions();
  const statisticsMutation = useStatisticsMutation(kind);

  // 监听范围、周期、能源和强度指标；这些值分别控制树选中态、日期控件及产品筛选项显隐。
  const scopeKey = Form.useWatch('scopeKey', form);
  const periodType = Form.useWatch('periodType', form) ?? 2;
  const energyId = Form.useWatch('energyId', form);
  const indicatorType = Form.useWatch('indicatorType', form);

  // 按页面类型缓存表格列，并转换左侧树；强度页只保留组织节点。
  const columns = useMemo(() => columnsByKind(kind), [locale, kind]);
  const treeData = useMemo(
    () => toScopeTreeData(scopeTree, kind === 'intensity'),
    [kind, scopeTree],
  );
  // 三个统计页首次加载时展开所有根组织，首屏展示一级和二级组织。
  const defaultExpandedKeys = useMemo(
    () => treeData.map(node => node.key),
    [treeData],
  );

  /** 校验查询条件并将表单值转换成后端统一请求，成功后刷新趋势图和明细表。 */
  const runQuery = (values: SearchValues, scopeNode?: StatisticsScopeNode) => {
    // 先校验页面权限和统计范围，避免无权限或无有效组织的数据请求进入后端。
    if (!canQuery) {
      message.warning(I18N.energyCarbon.analysisNoQueryPermission);
      return;
    }
    const scope = scopeNode ?? findScopeNode(scopeTree, values.scopeKey);
    if (!scope?.scopeType || !scope.orgId) {
      message.warning(I18N.energyCarbon.analysisValidStatisticsScopeRequired);
      return;
    }

    // 再校验周期跨度和页面专属条件，限制查询量并拦截缺少必要筛选项的请求。
    const count = energyCarbonPeriodCount(
      values.periodType,
      values.period[0],
      values.period[1],
    );
    if (count > ENERGY_CARBON_MAXIMUM_PERIOD_COUNT[values.periodType]) {
      message.warning(energyCarbonPeriodRangeMessage(values.periodType));
      return;
    }
    if (kind === 'energy' && !values.energyId && count !== 1) {
      message.warning(I18N.energyCarbon.analysisSinglePeriodWithoutEnergy);
      return;
    }
    if (
      kind === 'intensity' &&
      values.indicatorType === 4 &&
      !values.productId
    ) {
      message.warning(I18N.energyCarbon.analysisProductIntensityRequired);
      return;
    }

    // 最后按页面类型组装请求参数并发起查询，返回结果由 mutation 统一更新图表和表格。
    const request: StatisticsRequest = {
      scopeType: scope.scopeType,
      orgId: scope.orgId,
      boundaryId: scope.boundaryId,
      periodType: values.periodType,
      startDate: values.period[0].format('YYYY-MM-DD'),
      endDate: values.period[1].format('YYYY-MM-DD'),
      energyId: kind === 'energy' ? values.energyId : undefined,
      indicatorType: kind === 'intensity' ? values.indicatorType : undefined,
      productId:
        kind === 'intensity' && values.indicatorType === 4
          ? values.productId
          : undefined,
    };
    statisticsMutation.mutate(request);
  };

  // 范围树首次就绪时初始化默认组织、周期和日期；有权限时同步执行首屏查询。
  useEffect(() => {
    if (initializedRef.current || scopeTree.length === 0) return;
    const scope = firstOrganizationNode(scopeTree);
    if (!scope) return;
    const initialPeriodType: StatisticsPeriodType = 2;
    const values: SearchValues = {
      scopeKey: scope.key,
      periodType: initialPeriodType,
      period: defaultPeriod(kind, initialPeriodType),
      indicatorType: kind === 'intensity' ? 1 : undefined,
    };
    initializedRef.current = true;
    form.setFieldsValue(values);
    if (canQuery) runQuery(values, scope);
  }, [canQuery, form, kind, scopeTree]);

  // 将最近一次查询结果拆分为图表与表格数据；无结果时保持空状态展示。
  const chart = statisticsMutation.data?.chart;
  const sourceTableData =
    (statisticsMutation.data?.table as
      | Array<Record<string, unknown>>
      | undefined) ?? [];
  // 消费量趋势保持接口自然顺序，明细使用独立副本按周期倒序，避免修改原数组后同步反转图表。
  const tableData =
    kind === 'consumption'
      ? [...sourceTableData].sort((left, right) =>
          String(right.period ?? '').localeCompare(String(left.period ?? '')),
        )
      : sourceTableData;
  const colors = [
    token.colorPrimary,
    token.colorSuccess,
    token.colorWarning,
    token.colorInfo,
    token.colorError,
  ];

  // 右侧依次渲染筛选区、趋势图和明细表；三个统计页统一由左侧树提供统计范围。
  const statisticsContent = (
    <>
      <Card className={styles.searchCard}>
        <Form<SearchValues>
          form={form}
          layout='inline'
          className={
            kind === 'intensity' && indicatorType === 4
              ? `${styles.searchForm} ${styles.intensityProductForm}`
              : styles.searchForm
          }
          requiredMark={false}
          onFinish={values => runQuery(values)}
        >
          {/* 统计范围由左侧树维护，隐藏字段只负责表单校验和提交当前选中节点。 */}
          <Form.Item
            name='scopeKey'
            hidden
            rules={[
              {
                required: true,
                message: I18N.energyCarbon.analysisStatisticsScopeRequired,
              },
            ]}
          >
            <Input type='hidden' />
          </Form.Item>
          {/* 周期切换按能源选择状态重算单时间或时间段的业务默认值。 */}
          <Form.Item
            name='periodType'
            label={I18N.energyCarbon.analysisStatisticsDimension}
            className={
              kind === 'intensity' ? styles.intensityDimensionItem : undefined
            }
            rules={[
              {
                required: true,
                message: I18N.energyCarbon.analysisPeriodRequired,
              },
            ]}
          >
            <Segmented
              block
              options={
                kind === 'intensity'
                  ? getPeriodOptions().filter(item => item.value !== 1)
                  : getPeriodOptions()
              }
              className={
                kind === 'intensity'
                  ? `${styles.periodTypeField} ${styles.intensityPeriodTypeField}`
                  : styles.periodTypeField
              }
              onChange={value => {
                const nextPeriodType = value as StatisticsPeriodType;
                form.setFieldValue(
                  'period',
                  defaultPeriod(
                    kind,
                    nextPeriodType,
                    kind === 'energy' &&
                      Boolean(form.getFieldValue('energyId')),
                  ),
                );
              }}
              data-testid={`${kind}-statistics-period-type`}
            />
          </Form.Item>
          {kind === 'energy' ? (
            <Form.Item name='energyId' className={styles.optionField}>
              <Select
                allowClear
                showSearch
                optionFilterProp='label'
                loading={optionsLoading}
                options={(options?.energies ?? []).map(item => ({
                  label: (
                    <Typography.Text ellipsis={{ tooltip: item.name || '-' }}>
                      {item.name || '-'}
                    </Typography.Text>
                  ),
                  value: item.id,
                }))}
                placeholder={I18N.energyCarbon.energyName}
                className={styles.filterSelect}
                onChange={(value?: number) => {
                  form.setFieldValue(
                    'period',
                    defaultPeriod(kind, periodType, Boolean(value)),
                  );
                }}
                data-testid='energy-statistics-energy'
              />
            </Form.Item>
          ) : null}
          {kind === 'intensity' ? (
            <>
              <Form.Item
                name='indicatorType'
                className={styles.indicatorFilterItem}
                rules={[
                  {
                    required: true,
                    message:
                      I18N.energyCarbon.analysisOperationIndicatorRequired,
                  },
                ]}
              >
                <Select
                  options={getIntensityIndicatorOptions()}
                  placeholder={
                    I18N.energyCarbon.analysisProductionOperationIndicator
                  }
                  className={styles.filterSelect}
                  onChange={(value: IntensityIndicatorType) => {
                    if (value !== 4) form.setFieldValue('productId', undefined);
                  }}
                  data-testid='intensity-statistics-indicator'
                />
              </Form.Item>
              {indicatorType === 4 ? (
                <Form.Item
                  name='productId'
                  className={styles.productFilterItem}
                  rules={[
                    {
                      required: true,
                      message: I18N.energyCarbon.analysisProductRequired,
                    },
                  ]}
                >
                  <Select
                    showSearch
                    optionFilterProp='label'
                    popupMatchSelectWidth={320}
                    loading={optionsLoading}
                    options={(options?.products ?? []).map(item => ({
                      label: (
                        <Typography.Text
                          ellipsis={{ tooltip: item.name || '-' }}
                        >
                          {item.name || '-'}
                        </Typography.Text>
                      ),
                      title: item.name || '-',
                      value: item.id,
                    }))}
                    placeholder={I18N.energyCarbon.analysisProduct}
                    className={styles.filterSelect}
                    data-testid='intensity-statistics-product'
                  />
                </Form.Item>
              ) : null}
            </>
          ) : null}
          {/* 未选择能源时只选一个自然周期；选择能源后改为起止时间段。 */}
          {kind === 'energy' && !energyId ? (
            <Form.Item
              key='single-period'
              name='period'
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.analysisStatisticsPeriodRequired,
                },
              ]}
              getValueProps={(value?: [Dayjs, Dayjs]) => ({
                value: value?.[0],
              })}
              normalize={(value?: Dayjs) =>
                value ? [value, value] : undefined
              }
            >
              <DatePicker
                picker={pickerByPeriod(periodType)}
                allowClear={false}
                disabledDate={current =>
                  current.clone().endOf('day').isAfter(dayjs().endOf('day'))
                }
                className={styles.periodField}
                data-testid='energy-statistics-period'
              />
            </Form.Item>
          ) : (
            <Form.Item
              key='range-period'
              name='period'
              className={
                kind === 'intensity' ? styles.intensityPeriodItem : undefined
              }
              rules={[
                {
                  required: true,
                  message: I18N.energyCarbon.analysisStatisticsPeriodRequired,
                },
              ]}
            >
              <DatePicker.RangePicker
                picker={pickerByPeriod(periodType)}
                allowClear={false}
                disabledDate={current =>
                  current.clone().endOf('day').isAfter(dayjs().endOf('day'))
                }
                className={styles.periodField}
                data-testid={`${kind}-statistics-period`}
              />
            </Form.Item>
          )}
          {/* 查询按当前条件刷新结果；重置保留当前范围并恢复本页面默认筛选值。 */}
          <Form.Item
            className={
              kind === 'energy'
                ? styles.energyActionItem
                : kind === 'consumption'
                ? styles.consumptionActionItem
                : kind === 'intensity'
                ? styles.intensityActionItem
                : undefined
            }
          >
            <Space>
              <AuthButton permissionKey={permissionKey}>
                <Button
                  type='primary'
                  htmlType='submit'
                  loading={statisticsMutation.isLoading}
                  data-testid={`${kind}-statistics-query`}
                >
                  {I18N.common.actions.search}
                </Button>
              </AuthButton>
              <Button
                onClick={() => {
                  const nextPeriodType: StatisticsPeriodType = 2;
                  const values: SearchValues = {
                    scopeKey: form.getFieldValue('scopeKey'),
                    periodType: nextPeriodType,
                    period: defaultPeriod(kind, nextPeriodType),
                    energyId: undefined,
                    indicatorType: kind === 'intensity' ? 1 : undefined,
                    productId: undefined,
                  };
                  form.setFieldsValue(values);
                  if (canQuery) runQuery(values);
                }}
                data-testid={`${kind}-statistics-reset`}
              >
                {I18N.common.actions.reset}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Card
        title={
          kind === 'energy'
            ? I18N.energyCarbon.analysisEnergyAnalysis
            : kind === 'consumption'
            ? I18N.energyCarbon.analysisConsumptionTrend
            : I18N.energyCarbon.analysisIntensityTrend
        }
        className={styles.chartCard}
      >
        {chart && chart.categories.length > 0 ? (
          <EnergyCarbonCategoryChart
            option={chartOption(chart, colors, token.colorTextTertiary, kind)}
            className={styles.chart}
            dataTestId={`${kind}-statistics-chart`}
          />
        ) : (
          <Empty description={I18N.energyCarbon.analysisNoStatistics} />
        )}
      </Card>

      <Card
        title={
          kind === 'energy'
            ? I18N.energyCarbon.analysisEnergyDetails
            : kind === 'consumption'
            ? I18N.energyCarbon.analysisConsumptionDetails
            : I18N.energyCarbon.analysisIntensityDetails
        }
        className={styles.tableCard}
      >
        <Table<Record<string, unknown>>
          rowKey={
            kind === 'energy'
              ? record =>
                  JSON.stringify([
                    record.period,
                    record.energyName,
                    record.unit,
                    record.boundaryName,
                  ])
              : kind === 'consumption'
              ? record => JSON.stringify([record.period, record.boundaryName])
              : record =>
                  JSON.stringify([
                    record.period,
                    record.indicatorName,
                    record.unit,
                    record.organizationName,
                  ])
          }
          columns={columns}
          dataSource={tableData}
          loading={statisticsMutation.isLoading}
          pagination={false}
          scroll={{
            x: kind === 'energy' ? 760 : kind === 'consumption' ? 1200 : 800,
          }}
          data-testid={`${kind}-statistics-table`}
        />
      </Card>
    </>
  );

  // 三个统计页统一使用左树右内容布局，组织节点均展示服务端返回的组织全称。
  return (
    <PageContainer title={title} permissionKey={permissionKey}>
      <div
        className={
          kind === 'energy'
            ? `${styles.statisticsWorkspace} ${styles.energyStatisticsWorkspace}`
            : kind === 'consumption'
            ? `${styles.statisticsWorkspace} ${styles.consumptionStatisticsWorkspace}`
            : `${styles.statisticsWorkspace} ${styles.intensityStatisticsWorkspace}`
        }
      >
        <Card
          title={
            kind === 'intensity'
              ? I18N.energyCarbon.organization
              : I18N.energyCarbon.analysisOrganizationBoundary
          }
          className={styles.scopeTreeCard}
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
                    <Typography.Text ellipsis={{ tooltip: title }}>
                      {title}
                    </Typography.Text>
                  );
                }}
                selectedKeys={scopeKey ? [scopeKey] : []}
                onSelect={(keys, info) => {
                  // 已选节点再次点击时 Ant Design 会返回空 keys，继续使用当前点击节点完成刷新。
                  const nextScopeKey = String(keys[0] ?? info.node.key);
                  const scope = findScopeNode(scopeTree, nextScopeKey);
                  if (
                    !scope?.selectable ||
                    (kind === 'intensity' && scope.scopeType !== 1)
                  ) {
                    return;
                  }

                  // 树节点切换只替换统计范围；沿用当前周期和页面条件立即刷新右侧结果。
                  form.setFieldValue('scopeKey', nextScopeKey);
                  if (canQuery) {
                    runQuery(
                      {
                        ...form.getFieldsValue(),
                        scopeKey: nextScopeKey,
                      },
                      scope,
                    );
                  }
                }}
                className={styles.scopeTree}
                data-testid={`${kind}-statistics-scope-tree`}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  kind === 'intensity'
                    ? I18N.energyCarbon.noAccessibleOrganizations
                    : I18N.energyCarbon.analysisNoAccessibleBoundaries
                }
              />
            )}
          </Spin>
        </Card>
        <div className={styles.statisticsContent}>{statisticsContent}</div>
      </div>
    </PageContainer>
  );
}
