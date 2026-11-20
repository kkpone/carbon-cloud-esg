import { AnalysisText } from '@/views/carbonFootprint3/components/AnalysisText';
import { Alert, Empty } from 'antd';
import EChartsReact from 'echarts-for-react';
import I18N from '@src/lang/I18N';
import { MonteCarloState } from '../../types';
import styles from './index.module.less';

export function SimulationResults({ state }: { state: MonteCarloState }) {
  const { result } = state;
  const statistics = [
    { label: I18N.carbonFootprint3.mcMean, value: result?.mean },
    { label: I18N.carbonFootprint3.mcMedian, value: result?.median },
    {
      label: I18N.carbonFootprint3.mcStandardDeviation,
      value: result?.standardDeviation,
    },
    {
      label: I18N.carbonFootprint3.mcLowerConfidence,
      value: result?.lowerConfidence,
    },
    {
      label: I18N.carbonFootprint3.mcUpperConfidence,
      value: result?.upperConfidence,
    },
  ];
  return (
    <div className={styles.results}>
      {state.stale && (
        <Alert
          type='warning'
          showIcon
          message={I18N.carbonFootprint3.mcDetailsChanged}
        />
      )}
      {state.failed && (
        <Alert
          type='error'
          showIcon
          message={I18N.carbonFootprint3.mcCalculationFailed}
        />
      )}
      {!result ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <>
          <div className={styles.statistics}>
            {statistics.map(item => (
              <div className={styles.statistic} key={item.label}>
                <div className={styles.label}>
                  <AnalysisText value={`${item.label}（kgCO₂e）`} multiline />
                </div>
                <strong>
                  <AnalysisText value={Number(item.value).toFixed(4)} />
                </strong>
              </div>
            ))}
          </div>
          <div className={styles.histogram}>
            <EChartsReact
              className={styles.chart}
              option={{
                color: ['#0cbf9f'],
                textStyle: {
                  fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
                  color: '#04252b',
                  fontSize: 12,
                },
                grid: {
                  top: 40,
                  right: 24,
                  bottom: 52,
                  left: 24,
                  containLabel: true,
                },
                tooltip: { trigger: 'axis', confine: true },
                xAxis: {
                  type: 'category',
                  name: I18N.carbonFootprint3.mcCarbonFootprint,
                  nameLocation: 'middle',
                  nameGap: 38,
                  nameTextStyle: { color: '#04252b', fontSize: 14 },
                  axisTick: { show: false },
                  axisLine: { lineStyle: { color: '#e5e7eb' } },
                  data: result.histogram.map(
                    bin =>
                      `${Number(bin.lower).toFixed(4)}–${Number(
                        bin.upper,
                      ).toFixed(4)}`,
                  ),
                  axisLabel: {
                    color: '#999ea4',
                    hideOverlap: true,
                    interval: Math.max(
                      0,
                      Math.floor(result.histogram.length / 5),
                    ),
                    formatter: (value: string) => value.split('–')[0],
                  },
                },
                yAxis: {
                  type: 'value',
                  name: I18N.carbonFootprint3.mcProbability,
                  nameTextStyle: {
                    color: '#04252b',
                    fontSize: 14,
                    align: 'left',
                  },
                  axisLabel: { color: '#999ea4', formatter: '{value}%' },
                  splitLine: { lineStyle: { color: '#f0f2f5' } },
                },
                series: [
                  {
                    type: 'bar',
                    barCategoryGap: '35%',
                    barMaxWidth: 24,
                    itemStyle: { borderRadius: [3, 3, 0, 0] },
                    data: result.histogram.map(bin => Number(bin.probability)),
                  },
                ],
              }}
            />
          </div>
        </>
      )}
    </div>
  );
}
