import { Empty, Select } from 'antd';
import ReactECharts from 'echarts-for-react';

import I18N from '@src/lang/I18N';

import { DataOverviewEmission, OverviewOption } from '../../types';
import styles from './index.module.less';

interface EmissionChartProps {
  title: string;
  placeholder: string;
  value?: string;
  options: OverviewOption[];
  data: DataOverviewEmission[];
  loading?: boolean;
  singleSeries?: boolean;
  selectWidth?: number;
  onChange: (value: string) => void;
}

const CHART_COLORS = ['#0cbf9f', '#37b1ec', '#aa92ef', '#e57ea9', '#e48b4b'];

/** 数据概览排放柱状图。 */
const EmissionChart = ({
  title,
  placeholder,
  value,
  options,
  data,
  loading,
  singleSeries = false,
  selectWidth = 160,
  onChange,
}: EmissionChartProps) => {
  const labels = data.map(item => {
    const primary = singleSeries ? item.name : item.subName || item.name;
    return item.reportName ? `${primary}\n${item.reportName}` : primary;
  });
  const comparisonSeries = [
    {
      name: I18N.cbamOperationReport.directEmission,
      type: 'bar',
      barWidth: 16,
      barGap: '50%',
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: data.map(item => Number(item.directEmission || 0)),
    },
    {
      name: I18N.cbamOperationReport.indirectEmission,
      type: 'bar',
      barWidth: 16,
      barGap: '50%',
      itemStyle: { borderRadius: [4, 4, 0, 0] },
      data: data.map(item => Number(item.indirectEmission || 0)),
    },
  ];
  const totalSeries = data.map((item, index) => ({
    name: item.reportName || item.name,
    type: 'bar',
    barWidth: 16,
    barGap: '-100%',
    itemStyle: {
      color: CHART_COLORS[index % CHART_COLORS.length],
      borderRadius: [4, 4, 0, 0],
    },
    data: data.map((row, valueIndex) =>
      valueIndex === index ? Number(row.totalEmission || 0) : null,
    ),
  }));
  const chartOption = {
    color: CHART_COLORS,
    tooltip: { trigger: singleSeries ? 'item' : 'axis' },
    legend: {
      top: 0,
      left: 'center',
      icon: 'rect',
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 40,
      textStyle: { color: '#04252b', fontSize: 12, lineHeight: 20 },
    },
    grid: { left: 78, right: 0, top: 50, bottom: 60 },
    xAxis: {
      type: 'category',
      data: labels,
      axisLine: { lineStyle: { color: '#e7eaee' } },
      axisTick: { show: false },
      axisLabel: {
        interval: 0,
        overflow: 'truncate',
        width: 150,
        margin: 12,
        color: '#6c757d',
        fontSize: 12,
        lineHeight: 18,
      },
    },
    yAxis: {
      type: 'value',
      name: '嵌入排放量（tCO₂e）',
      nameLocation: 'middle',
      nameRotate: 90,
      nameGap: 54,
      nameTextStyle: { color: 'rgba(4, 37, 43, 0.6)', fontSize: 12 },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: {
        color: '#6c757d',
        fontSize: 12,
        formatter: (axisValue: number) => axisValue.toLocaleString(),
      },
      splitLine: { lineStyle: { color: '#e7eaee' } },
    },
    series: singleSeries ? totalSeries : comparisonSeries,
  };

  return (
    <section className={styles.card}>
      <header>
        <h3>
          <i />
          {title}
        </h3>
        <Select
          style={{ width: selectWidth }}
          value={value}
          options={options}
          placeholder={placeholder}
          onChange={onChange}
        />
      </header>
      {data.length || loading ? (
        <ReactECharts
          option={chartOption}
          showLoading={loading}
          className={styles.chart}
        />
      ) : (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      )}
    </section>
  );
};

export default EmissionChart;
