/* eslint-disable @typescript-eslint/no-unused-vars */
import I18N from '@src/lang/I18N';
import * as echarts from 'echarts';
import { isNil } from 'lodash-es';
import { FC, memo, useEffect, useRef, useState } from 'react';

import Empty from './Empty';
import { Org } from '../../AccountingList/type';
import styles from '../index.module.less';
import { getChildOrgEmissions } from '../service';

type ChildOrgChartProps = {
  type: number;
  year?: number;
  org?: Org;
  computationId?: number;
};

const MIN_X_AXIS_LABEL_WIDTH = 1;
const CHART_HORIZONTAL_RESERVED_WIDTH = 80;
const X_AXIS_LABEL_GAP = 8;

const getEstimatedXAxisLabelWidth = (
  chartWidth: number,
  dataLength: number,
) => {
  if (dataLength === 0) {
    return MIN_X_AXIS_LABEL_WIDTH;
  }

  const availableWidth = Math.max(
    chartWidth - CHART_HORIZONTAL_RESERVED_WIDTH,
    0,
  );
  const labelWidth = Math.floor(availableWidth / dataLength) - X_AXIS_LABEL_GAP;

  return Math.max(MIN_X_AXIS_LABEL_WIDTH, labelWidth);
};

const getMeasuredXAxisLabelWidth = (
  chart: echarts.ECharts,
  orgNames: string[],
  fallbackWidth: number,
) => {
  if (orgNames.length < 2) {
    return fallbackWidth;
  }

  const firstLabelPosition = chart.convertToPixel(
    { xAxisIndex: 0 },
    orgNames[0],
  );
  const secondLabelPosition = chart.convertToPixel(
    { xAxisIndex: 0 },
    orgNames[1],
  );

  if (
    typeof firstLabelPosition !== 'number' ||
    typeof secondLabelPosition !== 'number'
  ) {
    return fallbackWidth;
  }

  return Math.max(
    MIN_X_AXIS_LABEL_WIDTH,
    Math.floor(Math.abs(secondLabelPosition - firstLabelPosition)) -
      X_AXIS_LABEL_GAP,
  );
};

const ChildOrgChart: FC<ChildOrgChartProps> = ({
  year,
  org,
  type,
  computationId,
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<echarts.ECharts | null>(null);

  const [chartWidth, setChartWidth] = useState(0);

  const [childOrgEmissions, setChildOrgEmissions] = useState<
    {
      orgName: string;
      categoryData: { category: string; emissionQuantity: number }[];
    }[]
  >([]);

  useEffect(() => {
    const chartDom = chartContainerRef.current;
    if (chartDom === null) {
      return () => {};
    }

    chartRef.current = echarts.init(chartDom, undefined, {
      width: 'auto',
      height: 'auto',
    });
    const observer = new ResizeObserver(entries => {
      chartRef.current?.resize();
      const width = entries[0]?.contentRect.width;
      if (!isNil(width)) {
        setChartWidth(Math.floor(width));
      }
    });
    observer.observe(chartDom);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isNil(year) && (!isNil(org) || !isNil(computationId))) {
      getChildOrgEmissions({
        period: year.toString(),
        type,
        orgId: org?.id,
        computationId,
      }).then(({ data }) => {
        setChildOrgEmissions(data.data);
      });
    }
  }, [year, org, type, computationId]);

  useEffect(() => {
    const colors = [
      '#2FCCAA',
      '#08A28B',
      '#026961',
      '#3491FA',
      '#FBA93E',
      '#E56665',
      '#7EC0DF',
      '#4EA271',
    ];

    const categorySeries: Record<string, number[]>[] = [];
    const orgNames = childOrgEmissions.map(emission => emission.orgName);
    const estimatedXAxisLabelWidth = getEstimatedXAxisLabelWidth(
      chartWidth,
      childOrgEmissions.length,
    );

    (childOrgEmissions || []).forEach(({ categoryData }) => {
      (categoryData || []).forEach(({ category, emissionQuantity }) => {
        categorySeries[category] = [
          ...(categorySeries[category] || []),
          Number(emissionQuantity),
        ];
      });
    });

    const option: echarts.EChartsOption = {
      grid: {
        containLabel: true,
        left: '40px',
        right: '20px',
        bottom: '20px',
      },
      colors,
      legend: {
        show: true,
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: [
        {
          type: 'category',
          axisTick: { show: false },
          axisLine: { show: false },
          axisLabel: {
            interval: 0,
            hideOverlap: false,
            width: estimatedXAxisLabelWidth,
            overflow: 'truncate',
          },
          data: orgNames,
        },
      ],
      yAxis: [
        {
          type: 'value',
          name: I18N.enterpriseCarbonAccount2.unitTCo2,
        },
      ],
      series: Object.keys(categorySeries).map((category, index) => ({
        name: category,
        type: 'bar' as const,
        stack: 'total',
        barMaxWidth: 16,
        color: colors[index],
        data: categorySeries[category],
      })),
    };

    const chart = chartRef.current;
    chart?.setOption(option, { notMerge: true });

    if (chart) {
      const measuredXAxisLabelWidth = getMeasuredXAxisLabelWidth(
        chart,
        orgNames,
        estimatedXAxisLabelWidth,
      );
      chart.setOption({
        xAxis: [
          {
            axisLabel: {
              width: measuredXAxisLabelWidth,
            },
          },
        ],
      });
    }
  }, [chartWidth, childOrgEmissions]);

  return (
    <div className={styles.columnChart}>
      <div className={styles.columnChartHeader}>
        <div className={styles['title-s-b']}>
          {I18N.enterpriseCarbonAccount2.subOrganizationEmissions}
        </div>
      </div>
      <div className={styles.columnChartContent}>
        {childOrgEmissions.length === 0 && (
          <Empty className={styles.floatEmpty} />
        )}
        <div ref={chartContainerRef} className={styles.columnChartContent} />
      </div>
    </div>
  );
};

export default memo(ChildOrgChart);
