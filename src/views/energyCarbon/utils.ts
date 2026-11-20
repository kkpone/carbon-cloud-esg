import I18N from '@/lang/I18N';
import type { Dayjs } from 'dayjs';

import type { StatisticsPeriodType } from './energyStatistics/types';

type DecimalValue = string | number | null | undefined;

/** 能碳趋势查询统一周期上限，前后端均按包含首尾的自然周期数量校验。 */
export const ENERGY_CARBON_MAXIMUM_PERIOD_COUNT: Record<
  StatisticsPeriodType,
  number
> = {
  1: 31,
  2: 12,
  3: 8,
  4: 10,
};

/** 按统计周期返回与查询上限单位一致的跨度提示。 */
export function energyCarbonPeriodRangeMessage(
  periodType: StatisticsPeriodType,
) {
  if (periodType === 1) return I18N.energyCarbon.statisticsRangeTooLongByDay;
  if (periodType === 2) return I18N.energyCarbon.statisticsRangeTooLongByMonth;
  if (periodType === 3)
    return I18N.energyCarbon.statisticsRangeTooLongByQuarter;
  return I18N.energyCarbon.statisticsRangeTooLongByYear;
}

/** 计算包含首尾的日、月、季度或年度数量，供所有能碳趋势筛选统一拦截超范围请求。 */
export function energyCarbonPeriodCount(
  periodType: StatisticsPeriodType,
  start: Dayjs,
  end: Dayjs,
) {
  // 日、月和年按对应自然周期直接计算，得到包含开始与结束周期的查询数量。
  if (periodType === 1) {
    return (
      end.clone().startOf('day').diff(start.clone().startOf('day'), 'day') + 1
    );
  }
  if (periodType === 2) {
    return (
      end
        .clone()
        .startOf('month')
        .diff(start.clone().startOf('month'), 'month') + 1
    );
  }
  if (periodType === 4) return end.year() - start.year() + 1;

  // 季度转换为连续索引后计算差值，避免跨年范围漏算首尾季度。
  const startIndex = start.year() * 4 + Math.floor(start.month() / 3);
  const endIndex = end.year() * 4 + Math.floor(end.month() / 3);
  return endIndex - startIndex + 1;
}

/** 生成能碳柱状图统一分类轴、提示线、柱宽和超量分类浏览配置。 */
export function energyCarbonCategoryChartConfig(
  categories: string[],
  mutedTextColor: string,
) {
  // 连续周期必须绘制完整查询范围；非周期分类首屏固定十二项，剩余项通过图内滚轮浏览。
  const isPeriodAxis =
    categories.length > 0 &&
    categories.every(category =>
      /^\d{4}(?:-\d{2}(?:-\d{2})?|-Q[1-4])?$/.test(String(category)),
    );
  const visibleCategoryCount = isPeriodAxis ? categories.length : 12;
  const hasCategoryZoom =
    !isPeriodAxis && categories.length > visibleCategoryCount;

  // 分类越多柱体越窄、分类间隔越小，兼顾少量数据辨识度和大量数据密度。
  const barMaxWidth =
    categories.length > 8 ? 14 : categories.length > 4 ? 20 : 32;
  const barCategoryGap =
    categories.length > 8 ? '35%' : categories.length > 4 ? '45%' : '60%';

  // 返回可直接并入 ECharts option 的公共配置，两套统计协议只需补充各自数值轴和序列。
  return {
    barMaxWidth,
    barCategoryGap,
    gridBottom: 56,
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'line',
        lineStyle: { type: 'solid' },
      },
    },
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: {
        interval: isPeriodAxis ? 'auto' : 0,
        hideOverlap: isPeriodAxis,
        rotate: isPeriodAxis ? 28 : 32,
        align: isPeriodAxis ? undefined : 'right',
        formatter: isPeriodAxis
          ? undefined
          : (value: string) => {
              const label = String(value);
              return label.length > 9
                ? `${label.slice(0, 4)}…${label.slice(-4)}`
                : label;
            },
      },
    },
    graphic: hasCategoryZoom
      ? [
          {
            type: 'text',
            right: 16,
            bottom: 4,
            style: {
              text: I18N.template(I18N.energyCarbon.chartScrollHint, {
                val1: categories.length,
              }),
              fill: mutedTextColor,
              fontSize: 12,
            },
          },
        ]
      : undefined,
    dataZoom: hasCategoryZoom
      ? [
          {
            type: 'inside',
            startValue: 0,
            endValue: visibleCategoryCount - 1,
            zoomLock: true,
            filterMode: 'none',
            zoomOnMouseWheel: false,
            moveOnMouseWheel: true,
            moveOnMouseMove: true,
          },
        ]
      : undefined,
  };
}

/** 去掉小数末尾无意义的 0，同时保留有效小数位。 */
export function trimTrailingDecimalZeros(value: string): string {
  return value.replace(/(\.\d*?[1-9])0+$|\.0+$/, '$1');
}

/** 按业务最大小数位格式化台账数值，空值或非法值统一展示 "-"。 */
export function formatDecimalValue(
  value: DecimalValue,
  precision: number,
): string {
  if (value === null || value === undefined || value === '') return '-';
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return '-';
  return trimTrailingDecimalZeros(numberValue.toFixed(precision));
}
