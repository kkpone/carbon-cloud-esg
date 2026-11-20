import I18N from '@src/lang/I18N';
import dayjs, { Dayjs } from 'dayjs';

import {
  renderFormItemSchema,
  renderSchemaWithLayout,
  renderFromGridSchema,
  renderEmptySchema,
} from '@/components/formily/utils';

import style from './index.module.less';

/** 公共的布局 */
const fromGrid = {
  'x-component-props': {
    maxColumns: 5,
    minColumns: 5,
    columnGap: 30,
    rowGap: 2,
    colWrap: true,
  },
};

/** 任务和工厂信息使用等宽两列，避免第五格压缩新增字段。 */
const taskGrid = {
  ...fromGrid,
  'x-component-props': {
    ...fromGrid['x-component-props'],
    maxColumns: 4,
    minColumns: 4,
  },
};

/** 基础信息的schemas */
export const baseSchema = () =>
  renderSchemaWithLayout(
    {},
    {
      grid: {
        ...renderFromGridSchema(taskGrid),
        properties: {
          reportName: renderFormItemSchema({
            title: I18N.cbam.accountingTaskName,
            'x-component': 'Input',
            'x-component-props': {
              maxLength: 100,
            },
            'x-decorator-props': {
              gridSpan: 2,
            },
          }),
          orgId: renderFormItemSchema({
            title: I18N.cbamOperationReport.relatedEntity,
            'x-component': 'Select',
            'x-component-props': {
              showSearch: true,
              optionFilterProp: 'label',
              allowClear: true,
            },
            'x-decorator-props': {
              gridSpan: 2,
            },
          }),
          '[startDate, endDate]': renderFormItemSchema({
            title: I18N.cbam.reportCycle,
            'x-component': 'DatePicker.RangePicker',
            'x-component-props': {
              placeholder: [
                I18N.carbonFootPrintLCA.startDate,
                I18N.carbonFootPrintLCA.endDate,
              ],
              className: style.datePicker,
              format: 'DD.MM.YYYY',
              disabledDate: (current: Dayjs) =>
                (current && current < dayjs('1990')) ||
                (current && current > dayjs()),
            },
            'x-decorator-props': {
              gridSpan: 2,
            },
          }),
          factoryId: renderFormItemSchema({
            title: I18N.cbamOperationReport.relatedFactory,
            customValidate: I18N.cbam.pleaseSelectAFactory,
            'x-component': 'Select',
            'x-component-props': {
              showSearch: true,
              optionFilterProp: 'label',
              allowClear: true,
            },
            'x-decorator-props': { gridSpan: 2 },
          }),
          planId: renderFormItemSchema({
            title: I18N.cbam.relatedMonitoringPlan,
            required: false,
            'x-component': 'Select',
            'x-component-props': {
              showSearch: true,
              optionFilterProp: 'label',
              allowClear: true,
            },
            'x-decorator-props': { gridSpan: 2 },
          }),
        },
      },
    },
  );

const inputMaxLength100 = 100;

/** 生成标题公共scheme */
const generateTitleScheme = (title: string) =>
  renderEmptySchema(
    {
      type: 'string',
      'x-decorator-props': {
        gridSpan: 5,
        style: {
          height: '20px',
        },
      },
    },
    { showVal: () => <h4>{title}</h4> },
  );

/** 验证机构的schemas */
export const verificationAgencySchema = () =>
  renderSchemaWithLayout(
    {},
    {
      verificationGrid: {
        ...renderFromGridSchema(fromGrid),
        properties: {
          verification: {
            type: 'object',
            properties: {
              aTitle: generateTitleScheme(I18N.cbam.reportVerification),
              corporateName: renderFormItemSchema({
                title: I18N.cbam.corporateName,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              detailedAddress: renderFormItemSchema({
                title: I18N.carbonFootPrintLCA.detailedAddress,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              emptyTwo: renderEmptySchema(),
              city: renderFormItemSchema({
                title: I18N.cbam.city,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              postalCode: renderFormItemSchema({
                title: I18N.cbam.postalCode,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              emptyThree: renderEmptySchema(),
              country: renderFormItemSchema({
                title: I18N.cbam.country,
                required: false,
                'x-component': 'Select',
                'x-component-props': {
                  showSearch: true,
                  optionFilterProp: 'label',
                  allowClear: true,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              emptyFour: renderEmptySchema({
                'x-decorator-props': {
                  gridSpan: 5,
                },
              }),

              bTitle: generateTitleScheme(I18N.cbam.bVerifierAwarded),
              fullName: renderFormItemSchema({
                title: I18N.system.name,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              email: renderFormItemSchema({
                title: I18N.cbam.eMail,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              emptyFive: renderEmptySchema(),
              mobile: renderFormItemSchema({
                title: I18N.cbam.phoneNumber,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              fax: renderFormItemSchema({
                title: I18N.cbam.fax,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              emptySix: renderEmptySchema(),

              cTitle: generateTitleScheme(I18N.cbam.cVerifierRecognition),
              memberState: renderFormItemSchema({
                title: I18N.cbam.certifiedMemberLetter,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              certificationName: renderFormItemSchema({
                title: I18N.cbam.nationalCertificationMachine,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
              emptySeven: renderEmptySchema(),
              registrationNo: renderFormItemSchema({
                title: I18N.cbam.certificationBodyIssues,
                required: false,
                'x-component': 'Input',
                'x-component-props': {
                  maxLength: inputMaxLength100,
                },
                'x-decorator-props': {
                  gridSpan: 2,
                },
              }),
            },
          },
        },
      },
    },
  );
