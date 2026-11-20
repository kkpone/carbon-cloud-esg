import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { withTableColumnEmptyRender } from '@/views/energyCarbon/platform/tableColumn';
import { Card, Empty, Table } from 'antd';
import ReactECharts from 'echarts-for-react';
import styles from '../../index.module.css';
import type { FormAnalysisResponse, FormAnalysisRow } from '../../types';
import { displayAnalysisValue } from '../../utils';

interface Props {
  data?: FormAnalysisResponse;
  loading: boolean;
}

/** 按审核形态编码取当前语言名称，图例、悬浮提示和表格共用。 */
function energyFormDisplayName(energyForm: FormAnalysisRow['energyForm']) {
  return energyForm === 1
    ? I18N.energyCarbon.primaryEnergy
    : I18N.energyCarbon.secondaryEnergy;
}

/** 图上表下按同一份形态汇总展示；零总量不绘制扇区，缺失占比显示ASCII连字符。 */
export default function FormAnalysisResult({ data, loading }: Props) {
  useLocale();
  const columns = withTableColumnEmptyRender<FormAnalysisRow>([
    {
      title: I18N.energyCarbon.energyFormTime,
      dataIndex: 'period',
      width: 130,
    },
    {
      title: I18N.energyCarbon.energyForm,
      dataIndex: 'energyForm',
      width: 160,
      render: energyFormDisplayName,
    },
    {
      title: I18N.energyCarbon.energyFormCoal,
      dataIndex: 'standardCoal',
      width: 180,
      render: displayAnalysisValue,
    },
    {
      title: I18N.energyCarbon.energyFormRate,
      dataIndex: 'rate',
      width: 160,
      render: value => (value == null ? '-' : displayAnalysisValue(value)),
    },
    {
      title: I18N.energyCarbon.energyFormBoundary,
      dataIndex: 'boundaryName',
      width: 200,
      ellipsis: true,
    },
  ]);
  return (
    <>
      <Card
        title={I18N.energyCarbon.energyFormChart}
        className={styles.resultCard}
        loading={loading}
      >
        {data?.pie.length ? (
          <ReactECharts
            className={styles.chart}
            notMerge
            option={{
              tooltip: {
                trigger: 'item',
                renderMode: 'richText',
                formatter: (params: {
                  data: {
                    name: string;
                    value: number;
                    rate: string | number | null;
                  };
                }) =>
                  `${params.data.name}\n${I18N.energyCarbon.energyFormCoal}: ${
                    params.data.value
                  }\n${I18N.energyCarbon.energyFormRate}: ${
                    params.data.rate ?? '-'
                  }`,
              },
              legend: { bottom: 0 },
              series: [
                {
                  type: 'pie',
                  radius: ['42%', '68%'],
                  label: {
                    formatter: (params: {
                      data: { name: string; rate: string | number | null };
                    }) => `${params.data.name}\n${params.data.rate ?? '-'}%`,
                  },
                  data: data.pie.map(row => ({
                    name: energyFormDisplayName(row.energyForm),
                    value: Number(row.standardCoal),
                    rate: row.rate,
                  })),
                },
              ],
            }}
          />
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>
      <Card className={styles.resultCard}>
        <Table
          rowKey='energyForm'
          columns={columns}
          dataSource={data?.table ?? []}
          loading={loading}
          pagination={false}
          scroll={{ x: 830 }}
          data-testid='energy-form-analysis-table'
        />
      </Card>
    </>
  );
}
