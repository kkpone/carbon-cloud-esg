/*
 * @@description:
 * @Author: qifeng qifeng@carbonstop.net
 * @Date: 2023-03-14 14:37:41
 * @LastEditors: zhangmingyao 791813037@qq.com
 * @LastEditTime: 2023-04-03 17:11:09
 */
import I18N from '@src/lang/I18N';
import { ColumnsType } from 'antd/es/table';

import styles from './index.module.less';
import { TableRow } from './types';
import { AnalysisText } from '@/views/carbonFootprint3/components/AnalysisText';
import { REPORT_TYPE, REPORT_TYPE_LABEL } from '../constant';

const { REPORT } = REPORT_TYPE;

export const columns = (): ColumnsType<TableRow> => [
  {
    title: I18N.carbonFootprint.number,
    dataIndex: 'index',
    fixed: 'left',
    width: 70,
    render: (_, processLib, index) => index + 1,
  },
  {
    title: I18N.carbonFootprint.reportName,
    width: 200,
    fixed: 'left',
    dataIndex: 'reportName',
    render: (val: string) => <AnalysisText value={val} />,
  },
  {
    title: I18N.carbonFootprint.reportType,
    width: 190,
    dataIndex: 'type',
    render: (val: number) => {
      if (val === REPORT) {
        return <div className={styles.report}>{REPORT_TYPE_LABEL[val]()}</div>;
      }

      return (
        <div className={styles.template} data-report-type={val}>
          <AnalysisText value={REPORT_TYPE_LABEL[val]()} />
        </div>
      );
    },
  },
  {
    title: I18N.carbonFootprint3.productQuantity,
    width: 100,
    dataIndex: 'productCount',
  },
  {
    title: I18N.carbonFootprint3.analysisReportStatus,
    dataIndex: 'reportStatus',
    width: 100,
    render: (value: number | undefined) => (
      <span
        className={value === 0 ? styles.draftStatus : styles.completedStatus}
      >
        {value === 0
          ? I18N.carbonFootprint3.analysisReportDraft
          : I18N.carbonFootprint3.analysisReportCompleted}
      </span>
    ),
  },
  {
    dataIndex: 'updateByName',
    render: (value: string) => <AnalysisText value={value || '-'} />,
    title: I18N.carbonFootprint.updatedBy,
    width: 100,
  },
  {
    dataIndex: 'updateTime',
    width: 180,
    title: I18N.carbonFootprint.updateTime,
  },
];
