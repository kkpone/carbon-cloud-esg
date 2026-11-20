import I18N from '@src/lang/I18N';

import {
  renderFormItemSchema,
  renderSchemaWithLayout,
  renderFromGridSchema,
} from '@/components/formily/utils';

/** 大于等于0小于等于999999999.999999，保留6位小数数字 */
const numberPropsData = {
  precision: 6,
  min: 0,
  max: 999999999.999999,
};

/** 大于等于0小于等于100的数字，保留6位小数 */
const numberPropsPercent = {
  min: 0,
  max: 100,
  precision: 6,
};

/** 公共的布局 */
const fromGrid = {
  'x-component-props': {
    maxColumns: 4,
    minColumns: 1,
    minWidth: 220,
    columnGap: 16,
    rowGap: 2,
    colWrap: true,
  },
};

export const schema = () =>
  renderSchemaWithLayout(
    {},
    {
      grid: {
        ...renderFromGridSchema(fromGrid),
        properties: {
          editData: {
            type: 'object',
            properties: {
              fuelIn: renderFormItemSchema({
                title: I18N.cbam.fuelInputT,
                'x-component': 'NumberPicker',
                'x-component-props': {
                  ...numberPropsData,
                },
                'x-decorator-props': {
                  gridSpan: 1,
                },
              }),
              hotOut: renderFormItemSchema({
                title: I18N.cbam.thermalOutputT,
                'x-component': 'NumberPicker',
                'x-component-props': {
                  ...numberPropsData,
                },
                'x-decorator-props': {
                  gridSpan: 1,
                },
              }),
              eleOut: renderFormItemSchema({
                title: I18N.cbam.powerOutputT,
                'x-component': 'NumberPicker',
                'x-component-props': {
                  ...numberPropsData,
                },
                'x-decorator-props': {
                  gridSpan: 1,
                },
              }),
              fuelOut: renderFormItemSchema({
                title: I18N.cbam.fuelInputExhaust,
                'x-component': 'NumberPicker',
                'x-component-props': {
                  ...numberPropsData,
                },
                'x-decorator-props': {
                  gridSpan: 1,
                },
              }),
              smokeOut: renderFormItemSchema({
                title: I18N.cbam.smokePurificationExhaust,
                'x-component': 'NumberPicker',
                'x-component-props': {
                  ...numberPropsData,
                },
                'x-decorator-props': {
                  gridSpan: 1,
                },
              }),
              hotPer: renderFormItemSchema({
                title: I18N.cbam.thermalProductionEfficiency,
                'x-component': 'NumberPicker',
                'x-component-props': {
                  ...numberPropsPercent,
                },
                'x-decorator-props': {
                  gridSpan: 1,
                },
              }),
              elePer: renderFormItemSchema({
                title: I18N.cbam.electricityProductionEfficiency,
                'x-component': 'NumberPicker',
                'x-component-props': {
                  ...numberPropsPercent,
                },
                'x-decorator-props': {
                  gridSpan: 1,
                },
              }),
            },
          },
        },
      },
      otherTitle: {
        type: 'void',
        'x-component': 'InfoTitle',
        'x-component-props': {
          title: I18N.cbam.combinedHeatAndPowerGeneration2,
        },
      },
      resultGrid: {
        ...renderFromGridSchema({
          'x-component-props': {
            maxColumns: 2,
            minColumns: 1,
            minWidth: 220,
            columnGap: 16,
          },
        }),
        properties: {
          outPower: renderFormItemSchema({
            title: I18N.cbam.outputHeatDissipation2,
            required: false,
            'x-disabled': true,
            'x-component': 'NumberPicker',
            'x-component-props': {
              placeholder: '-',
            },
            'x-decorator-props': {
              gridSpan: 1,
            },
          }),
          outFactor: renderFormItemSchema({
            title: I18N.cbam.outputPowerGrid2,
            required: false,
            'x-disabled': true,
            'x-component': 'NumberPicker',
            'x-component-props': {
              placeholder: '-',
            },
            'x-decorator-props': {
              gridSpan: 1,
            },
          }),
        },
      },
    },
  );
