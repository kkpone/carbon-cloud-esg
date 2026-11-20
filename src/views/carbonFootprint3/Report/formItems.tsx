/*
 * @@description:
 * @Author: qifeng qifeng@carbonstop.net
 * @Date: 2023-03-14 14:48:56
 * @LastEditors: qifeng qifeng@carbonstop.net
 * @LastEditTime: 2023-03-15 15:42:18
 */
import I18N from '@src/lang/I18N';
import { Select } from 'antd';
import { FromItemProps } from '@src/components/FormUtil/type';
import { formItemInitInput } from '@src/components/FormUtil/util';

export const searchTableFormItem = (): FromItemProps<any>[] => {
  const data: FromItemProps<any>[] = [
    {
      ...formItemInitInput('', 'reportName', false),
      props: {
        placeholder: I18N.carbonFootprint.reportName,
      },
    },
    {
      ...formItemInitInput('', 'productName', false),
      props: {
        placeholder: I18N.carbonFootprint.productName,
      },
    },
    {
      ...formItemInitInput('', 'productCode', false),
      props: {
        placeholder: I18N.carbonFootprint.productCode,
      },
    },
    {
      ...formItemInitInput('', 'reportStatus', false),
      type: 'render',
      render: () => (
        <Select
          allowClear
          placeholder={I18N.carbonFootprint3.analysisReportStatus}
          style={{ width: 200 }}
          options={[
            { value: 0, label: I18N.carbonFootprint3.analysisReportDraft },
            { value: 1, label: I18N.carbonFootprint3.analysisReportCompleted },
          ]}
        />
      ),
    },
  ];
  return data.map(item => {
    const back = item;
    back.props = {
      style: { width: '200px' },
      ...back.props,
    };
    return back;
  });
};
