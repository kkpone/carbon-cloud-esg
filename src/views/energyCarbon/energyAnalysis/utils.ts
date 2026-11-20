import I18N from '@/lang/I18N';
import type { DataNode } from 'antd/es/tree';

import type { OrgTree } from '@/views/energyCarbon/platform/types';

import type {
  StatisticsChart,
  StatisticsPeriodType,
  StatisticsScopeNode,
} from '../energyStatistics/types';
import {
  energyCarbonCategoryChartConfig,
  trimTrailingDecimalZeros,
} from '../utils';

/** 将系统数据权限组织树转换为能源分析使用的组织范围节点。 */
export function toAnalysisOrganizationScopeTree(
  nodes: OrgTree[],
): StatisticsScopeNode[] {
  return nodes.map(node => ({
    key: `org:${node.id}`,
    name: node.name,
    scopeType: 1,
    orgId: node.id,
    selectable: true,
    children: toAnalysisOrganizationScopeTree(node.children ?? []),
  }));
}

/** 将服务端范围树转换为组织树或完整组织边界树。 */
export function toAnalysisTreeData(
  nodes: StatisticsScopeNode[],
  organizationOnly: boolean,
): DataNode[] {
  // 仅组织页面过滤边界分类和叶子，完整树则保留分类节点的不可选属性。
  const visibleNodes = organizationOnly
    ? nodes.filter(node => node.scopeType === 1)
    : nodes;
  return visibleNodes.map(node => ({
    key: node.key,
    title: node.name,
    selectable: node.selectable,
    children: toAnalysisTreeData(node.children ?? [], organizationOnly),
  }));
}

/** 深度查找用户点击的组织或具体边界节点。 */
export function findAnalysisScope(
  nodes: StatisticsScopeNode[],
  key: string,
): StatisticsScopeNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node;
    const child = findAnalysisScope(node.children ?? [], key);
    if (child) return child;
  }
  return undefined;
}

/** 默认选择首个当前可访问组织。 */
export function firstAnalysisOrganization(
  nodes: StatisticsScopeNode[],
): StatisticsScopeNode | undefined {
  for (const node of nodes) {
    if (node.scopeType === 1 && node.selectable) return node;
    const child = firstAnalysisOrganization(node.children ?? []);
    if (child) return child;
  }
  return undefined;
}

/** 统计空值显示短横线，数值去除末尾无效 0。 */
export function displayAnalysisValue(value: unknown) {
  if (value === null || value === undefined || value === '') return '-';
  return trimTrailingDecimalZeros(String(value));
}

/** 构造占比图例的半色标记，空半边用白色避免透明色被 ECharts 绘制成黑色。 */
function rateLegendGradient(color: string, showLeft: boolean) {
  const hiddenColor = '#ffffff';
  return {
    type: 'linear',
    x: 0,
    y: 0,
    x2: 1,
    y2: 0,
    colorStops: showLeft
      ? [
          { offset: 0, color },
          { offset: 0.5, color },
          { offset: 0.5, color: hiddenColor },
          { offset: 1, color: hiddenColor },
        ]
      : [
          { offset: 0, color: hiddenColor },
          { offset: 0.5, color: hiddenColor },
          { offset: 0.5, color },
          { offset: 1, color },
        ],
  };
}

/** 根据统计周期返回 Ant Design 日期选择粒度。 */
export function pickerByAnalysisPeriod(periodType: StatisticsPeriodType) {
  if (periodType === 2) return 'month' as const;
  if (periodType === 3) return 'quarter' as const;
  if (periodType === 4) return 'year' as const;
  return 'date' as const;
}

/** 根据当前最大值生成五段整数刻度，避免双轴统计图出现小数刻度。 */
function integerAnalysisAxisScale(maxValue: number) {
  // 将最大值向上归一到易读整数步长，得到稳定的五段正刻度范围。
  const safeMaximum = Math.max(Math.ceil(maxValue), 1);
  const roughInterval = safeMaximum / 5;
  const magnitude = 10 ** Math.floor(Math.log10(roughInterval));
  const normalizedInterval = roughInterval / magnitude;
  const factor =
    [1, 2, 3, 4, 5, 6, 8, 10].find(
      candidate => normalizedInterval <= candidate,
    ) ?? 10;
  const interval = Math.max(Math.ceil(factor * magnitude), 1);
  return {
    interval,
    maximum: interval * 5,
  };
}

/** 图表数值轴保留最多六位有效小数，避免效率小于 1 时多个刻度都显示为 0。 */
function formatAnalysisAxisValue(value: number) {
  return Number(value.toFixed(6)).toLocaleString('en-US', {
    maximumFractionDigits: 6,
  });
}

/** 将后端柱线图协议转换为能源分析 ECharts 配置。 */
export function analysisChartOption(
  chart: StatisticsChart,
  colors: string[],
  mutedTextColor: string,
): Record<string, unknown> {
  // BigDecimal 可能序列化为字符串，先统一转成数字并保留 null 断点，供轴范围和序列共同使用。
  const hasRightAxis = Boolean(chart.rightUnit);
  const normalizedSeries = chart.series.map(series => ({
    ...series,
    values: series.values.map(value => {
      if (value === null || value === '') return null;
      const numberValue = Number(value);
      return Number.isFinite(numberValue) ? numberValue : null;
    }),
  }));
  const barSeries = normalizedSeries.filter(
    series => Number(series.chartType) === 1,
  );
  const lineValues = normalizedSeries
    .filter(series => Number(series.chartType) === 2)
    .flatMap(series => series.values)
    .filter((value): value is number => typeof value === 'number');

  // 按每个分类的正负柱状累计值计算左轴边界，确保负能耗完整展示且不按绝对值改变排序。
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

  // 左轴生成整数刻度；利用率右轴默认按 20% 分五段，超过 100% 时继续按 20 的倍数扩展。
  const leftAxisScale = integerAnalysisAxisScale(leftPositiveMax * 1.1);
  const rightInterval = Math.max(20, Math.ceil(rightPositiveMax / 5 / 20) * 20);
  const rightMaximum = rightInterval * 5;

  // 左右轴使用相同负刻度段数对齐零点，右轴关闭网格线后只保留一套横向辅助线。
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

  // 分类轴、柱宽和超量浏览使用能碳模块公共规则，保证分析页面与能耗计算页面一致。
  const categoryConfig = energyCarbonCategoryChartConfig(
    chart.categories,
    mutedTextColor,
  );

  // 最后补充分析图专属双轴和序列；公共配置负责分类密度、周期完整性和提示交互。
  return {
    color: colors,
    tooltip: categoryConfig.tooltip,
    legend: { top: 0, type: 'scroll' },
    grid: {
      left: 24,
      right: hasRightAxis ? 32 : 24,
      top: 48,
      bottom: categoryConfig.gridBottom,
      containLabel: true,
    },
    xAxis: categoryConfig.xAxis,
    graphic: categoryConfig.graphic,
    yAxis: [
      {
        type: 'value',
        name: chart.leftUnit ?? '',
        min: hasRightAxis ? leftMinimum : undefined,
        max: hasRightAxis ? leftAxisScale.maximum : undefined,
        interval: hasRightAxis ? leftAxisScale.interval : undefined,
        axisLabel: {
          formatter: formatAnalysisAxisValue,
        },
      },
      ...(hasRightAxis
        ? [
            {
              type: 'value',
              name: chart.rightUnit ?? '',
              min: rightMinimum,
              max: rightMaximum,
              interval: rightInterval,
              splitLine: { show: false },
              axisLabel: {
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
      name: series.name ?? '-',
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
      lineStyle:
        Number(series.chartType) === 2
          ? { type: 'solid', width: 2 }
          : undefined,
      emphasis: { focus: 'series' },
    })),
  };
}

/** 将利用率换算为综合能耗占比对应的 tce 柱，与综合能耗共用左轴。 */
export function boundaryAnalysisChartOption(
  chart: StatisticsChart,
  colors: string[],
  mutedTextColor: string,
  mode?: 'boundary' | 'consumption',
): Record<string, unknown> {
  let rateNameIndex = 0;
  const displayChart = mode
    ? {
        ...chart,
        series: chart.series.map(item =>
          Number(item.chartType) === 2
            ? {
                ...item,
                name:
                  rateNameIndex++ === 0
                    ? I18N.energyCarbon.analysisCleanEnergyShare
                    : I18N.energyCarbon.analysisRenewableEnergyShare,
              }
            : item,
        ),
      }
    : chart;
  const option = analysisChartOption(displayChart, colors, mutedTextColor);
  const series = option.series as Array<Record<string, unknown>>;
  // REQ-006：仅消费量和边界页保留后端柱线、双轴；旧换算分支供其他调用保持兼容。
  if (mode) {
    let rateIndex = 0;
    return {
      ...option,
      legend: {
        ...(option.legend as Record<string, unknown>),
        formatter: (name: string) => {
          const source = displayChart.series.find(item => item.name === name);
          const unit =
            source?.unit ??
            (Number(source?.chartType) === 2
              ? chart.rightUnit
              : chart.leftUnit);
          return unit && !name.includes(`（${unit}）`)
            ? `${name}（${unit}）`
            : name;
        },
      },
      tooltip: {
        ...(option.tooltip as Record<string, unknown>),
        renderMode: 'richText',
        formatter: (params: unknown) => {
          const items = (Array.isArray(params) ? params : [params]) as Array<{
            axisValueLabel?: string;
            dataIndex: number;
            seriesIndex: number;
            seriesName?: string;
          }>;
          return [
            items[0]?.axisValueLabel ?? '',
            ...items.map(item => {
              const source = chart.series[item.seriesIndex];
              const unit =
                source?.unit ??
                (Number(source?.chartType) === 2
                  ? chart.rightUnit
                  : chart.leftUnit) ??
                '';
              return `${item.seriesName ?? '-'}：${displayAnalysisValue(
                source?.values[item.dataIndex],
              )}${unit ? ` ${unit}` : ''}`;
            }),
          ].join('\n');
        },
      },
      series: series.map(item => {
        if (item.type !== 'line') {
          return {
            ...item,
            stack: mode === 'consumption' ? 'energy-consumption' : item.stack,
          };
        }
        // 两页占比顺序由接口固定：清洁能源占比统一蓝色，可再生能源沿用第二色。
        const color =
          rateIndex++ === 0 ? '#1677ff' : colors[1] ?? mutedTextColor;
        return {
          ...item,
          yAxisIndex: 1,
          showSymbol: true,
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: { color },
          lineStyle: { color, width: 2, type: 'solid' },
          smooth: false,
        };
      }),
    };
  }
  const comprehensiveValues = (series.find(item => item.type === 'bar')?.data ??
    []) as Array<number | null>;
  const barWidth = energyCarbonCategoryChartConfig(
    chart.categories,
    mutedTextColor,
  ).barMaxWidth;
  let rateIndex = 0;
  let legendRateIndex = 0;
  const legendData = series.map(item => {
    if (item.type !== 'line') return String(item.name ?? '-');

    const currentRateIndex = legendRateIndex++;
    const rateColor =
      currentRateIndex === 0
        ? colors[2] ?? mutedTextColor
        : colors[1] ?? mutedTextColor;
    return {
      name: String(item.name ?? '-'),
      itemStyle: {
        // 图表柱体仍使用透明半边叠加；图例单独使用白色半边，避免出现黑色补色。
        color: rateLegendGradient(rateColor, currentRateIndex === 0),
      },
    };
  });

  // 综合能耗保留原 tce；利用率按“综合能耗 × 百分比”换算柱高，提示仍展示原百分比。
  return {
    ...option,
    legend: {
      ...(option.legend as Record<string, unknown>),
      data: legendData,
    },
    tooltip: {
      ...(option.tooltip as Record<string, unknown>),
      renderMode: 'richText',
      formatter: (params: unknown) => {
        const items = (Array.isArray(params) ? params : [params]) as Array<{
          axisValueLabel?: string;
          dataIndex: number;
          seriesIndex: number;
          seriesName?: string;
        }>;
        return [
          items[0]?.axisValueLabel ?? '',
          ...items.map(item => {
            const sourceSeries = chart.series[item.seriesIndex];
            const unit =
              sourceSeries?.unit ??
              (Number(sourceSeries?.chartType) === 1
                ? chart.leftUnit
                : chart.rightUnit) ??
              '';
            return `${item.seriesName ?? '-'}：${displayAnalysisValue(
              sourceSeries?.values[item.dataIndex],
            )}${unit ? ` ${unit}` : ''}`;
          }),
        ].join('\n');
      },
    },
    grid: {
      ...(option.grid as Record<string, unknown>),
      right: 24,
    },
    yAxis: [(option.yAxis as Array<Record<string, unknown>>)[0]],
    series: series.map((item, index) => {
      const isRate = item.type === 'line';
      const currentRateIndex = isRate ? rateIndex++ : -1;
      const rateColor =
        currentRateIndex === 0
          ? colors[2] ?? mutedTextColor
          : colors[1] ?? mutedTextColor;
      return {
        ...item,
        type: 'bar',
        yAxisIndex: 0,
        data: isRate
          ? (item.data as Array<number | null>).map((rate, dataIndex) => {
              const comprehensive = comprehensiveValues[dataIndex];
              return typeof rate !== 'number' ||
                typeof comprehensive !== 'number'
                ? null
                : (comprehensive * rate) / 100;
            })
          : item.data,
        barWidth,
        barMaxWidth: undefined,
        barGap: '-100%',
        lineStyle: isRate ? undefined : item.lineStyle,
        itemStyle: isRate
          ? {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 1,
                y2: 0,
                colorStops:
                  currentRateIndex === 0
                    ? [
                        { offset: 0, color: rateColor },
                        { offset: 0.5, color: rateColor },
                        { offset: 0.5, color: 'transparent' },
                        { offset: 1, color: 'transparent' },
                      ]
                    : [
                        { offset: 0, color: 'transparent' },
                        { offset: 0.5, color: 'transparent' },
                        { offset: 0.5, color: rateColor },
                        { offset: 1, color: rateColor },
                      ],
              },
            }
          : item.itemStyle,
        z: index + 1,
      };
    }),
  };
}
