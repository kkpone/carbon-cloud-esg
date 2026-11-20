import { createElement } from 'react';
import allocationStyles from '@/components/FootprintAllocation/components/EmissionFields/index.module.less';
import {
  UnitProductLabel,
  CalculationOptions,
} from '@/components/FootprintAllocation/components/EmissionFields';
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/*
 * @@description:
 */

import { ISchema, SchemaReactions } from '@formily/react';
import { gwpFieldSchema } from '@/components/EmissionGwp/FormField';
import {
  initFormilyCascader,
  initFormilyInput,
  initFormilyInputTextArea,
  initFormilyRadio,
  initFormilySelect,
} from '@src/components/FormilyUtil/util';
import I18N from '@src/lang/I18N';
import { checkEmail } from '@src/utils';
import {
  MODEL_EMISSION_BORDER_TYPE,
  MODEL_EMISSION_BORDER_TYPE_LABEL,
  MODEL_EMISSION_DATA_TYPE,
  MODEL_EMISSION_DATA_TYPE_LABEL,
  MODEL_EMISSION_MATCH_WAY,
} from '@src/views/carbonFootprint3/BusinessAccountingModel/constant';
import { DefaultOptionType } from 'antd/lib/cascader';
import moment, { Moment } from 'moment';

import {
  // CALC_WAY,
  EMISSION_TYPE_OPTIONS,
  // QUICK_ACCOUNT_EMISSION,
  // TRANS_ENUM,
} from '../../constant';
import { MAX_DECIMAL_PLACE } from '../../discharge/process/constant';
import { RegAccountValue } from '../../util';

const { FACTOR, SUPPLIER } = MODEL_EMISSION_MATCH_WAY;

export const genEmissionBasicSchema: (
  onBasicNameChange: (name: string, fireI?: boolean) => void,
  amountDecimalPlace?: number,
  calculation?: CalculationOptions,
) => ISchema = (
  onBasicNameChange,
  amountDecimalPlace = MAX_DECIMAL_PLACE,
  calculation,
) => {
  const schema: ISchema = {
    type: 'void',
    properties: {
      grid: {
        type: 'void',
        'x-component': 'FormGrid',
        'x-component-props': {
          maxColumns: 2,
          columnGap: 24,
        },
        properties: {
          type: {
            type: 'number',
            ...initFormilySelect(I18N.carbonFootprint.type, true),
          },
          name: {
            type: 'string',
            ...initFormilyInput(I18N.carbonFootprint.name, true, {
              onBlur: val => {
                if (val.target.value) {
                  onBasicNameChange(val.target.value);
                }
              },
            }),
            maxLength: 100,
          },
          // selectName: {
          //   type: 'string',
          //   'x-reactions': [
          //     {
          //       dependencies: ['typeExtra.way'],
          //       fulfill: {
          //         schema: {
          //           'x-visible': '{{$deps[0] == 1 || $deps[0] == 2}}',
          //         },
          //       },
          //     },
          //     '{{useAsyncProductDataSource()}}',
          //   ],
          //   ...initFormilySelect('名称2', true),
          // },
          amountColumn: {
            type: 'void',
            title: I18N.carbonFootprint3.consumptionQuantity,
            'x-decorator': 'FormItem',
            'x-component': 'FormGrid',
            'x-decorator-props': {
              asterisk: true,
            },
            'x-reactions': [
              {
                dependencies: ['.type'],
                fulfill: {
                  schema: {
                    'x-decorator-props':
                      '{{$deps[0] === 7 || useModelEmissionApi ? {asterisk: false} : { asterisk: true }}}',
                  },
                },
              },
            ],
            properties: {
              amount: {
                ...initFormilyInput(
                  '',
                  true,
                  {
                    placeholder: I18N.carbonFootprint3.consumptionQuantity,
                  },
                  true,
                ),
                'x-validator': value =>
                  RegAccountValue(value, amountDecimalPlace),
                'x-reactions': [
                  {
                    dependencies: ['.type'],
                    fulfill: {
                      schema: {
                        required:
                          '{{$deps[0] === 7 ? false : !useModelEmissionApi }}',
                      },
                    },
                  },
                ],
              },
              unitCode: {
                type: 'number',
                'x-reactions': [
                  {
                    target: 'factorObjUnitString',
                    when: '{{$self.value && $self.value.length > 0}}',
                    fulfill: {
                      state: {
                        value: '{{$self.value}}',
                      },
                    },
                  },
                  '{{useFieldUnitDictSource("factorUnitM")}}',
                  '{{useFieldSetValueByLabel}}',
                  {
                    dependencies: ['.type'],
                    fulfill: {
                      schema: {
                        required:
                          '{{$deps[0] === 7 ? false : !useModelEmissionApi }}',
                      },
                    },
                  },
                ],
                ...initFormilyCascader(
                  '',
                  true,
                  {
                    placeholder: I18N.carbonFootprint.unit,
                    displayRender: (labels: string[]) => labels?.[1],
                    allowClear: false,
                    showSearch: (
                      inputValue: string,
                      path: DefaultOptionType[],
                    ) =>
                      path.some(
                        option =>
                          (option.label as string)
                            .toLowerCase()
                            .indexOf(inputValue.toLowerCase()) > -1,
                      ),
                  },
                  true,
                ),
              },
            },
          },
          gwpFields: gwpFieldSchema,
        },
      },
    },
  };

  if (calculation?.enabled) {
    const properties = schema.properties as Record<string, ISchema>;
    const grid = properties.grid.properties as Record<string, ISchema>;
    grid.amountColumn.title = createElement(UnitProductLabel, {
      stage: calculation.stage,
    });
    grid.amountColumn['x-decorator-props'] = {
      ...grid.amountColumn['x-decorator-props'],
      className: allocationStyles.amountField,
    };
    // 类型联动保留数量标签布局类，避免必填星号与新增单位产品信息换行。
    grid.amountColumn['x-reactions'] = [
      {
        dependencies: ['.type'],
        fulfill: {
          schema: {
            'x-decorator-props': {
              className: allocationStyles.amountField,
              asterisk: '{{$deps[0] !== 7 && !useModelEmissionApi}}',
            },
          },
        },
      },
    ];
    grid.allocationControl = {
      type: 'void',
      'x-component': 'TaskAllocationControl',
      'x-component-props': calculation,
    };
    const gas = grid.gwpFields;
    delete grid.gwpFields;
    properties.unitAmount = {
      type: 'string',
      'x-component': 'Input',
      'x-hidden': true,
    };
    properties.details = {
      type: 'void',
      'x-component': 'TaskEmissionDetails',
      properties: { gwpFields: gas },
    };
  }
  return schema;
};

export const genSupplierSchema: (
  isShare?: boolean,
  useModelEmissionApi?: boolean,
) => ISchema = (isShare, useModelEmissionApi = false) => {
  const supplierFieldRequired = !useModelEmissionApi;
  const supplierDataIdReaction: SchemaReactions = {
    dependencies: ['supplierObj.id'],
    fulfill: {
      state: {
        componentProps: {
          disabled: `{{$deps[0] != void 0}}`,
        },
      },
    },
  };
  const supplierExpireTimeReaction: SchemaReactions = {
    dependencies: ['supplierObj.id'],
    fulfill: {
      schema: {
        required: useModelEmissionApi ? false : `{{$deps[0] == void 0}}`,
      },
      state: {
        componentProps: {
          placeholder: I18N.carbonFootprint3.depsv,
        },
      },
    },
  };
  return {
    type: 'void',
    properties: {
      grid: {
        type: 'void',
        'x-component': 'FormGrid',
        'x-component-props': {
          maxColumns: 2,
          columnGap: 50,
        },
        properties: {
          supplierObj: {
            type: 'object',
            'x-reactions': [
              {
                dependencies: ['grid.type', 'matchWay'],
                fulfill: {
                  schema: {
                    'x-hidden': `{{$deps[0] === ${EMISSION_TYPE_OPTIONS.TRANS} || $deps[1] !== ${SUPPLIER}}}`,
                  },
                },
              },
            ],
            properties: {
              id: {
                type: 'string',
              },
              factor: {
                type: 'string',
                ...initFormilyInput(
                  I18N.carbonFootprint.unitProductScheduling,
                  false,
                  {
                    disabled: true,
                  },
                ),
              },
              unitColumn: {
                type: 'void',
                title: I18N.carbonFootprint.unit,
                'x-decorator': 'FormItem',
                'x-component': 'FormGrid',
                properties: {
                  numeratorUnit: {
                    type: 'number',
                    ...initFormilySelect(
                      I18N.carbonFootprint3.molecularUnit,
                      false,
                      { disabled: true },
                      true,
                    ),
                    'x-decorator-props': {
                      addonAfter: '/',
                    },
                    'x-reactions': `{{useFieldFlattenUnitDictSource('factorUnitZ')}}`,
                  },
                  denominatorUnit: {
                    type: 'string',
                    ...initFormilyCascader(
                      I18N.carbonFootprint3.denominatorUnit,
                      false,
                      {
                        disabled: true,
                        showSearch: (
                          inputValue: string,
                          path: DefaultOptionType[],
                        ) =>
                          path.some(
                            option =>
                              (option.label as string)
                                .toLowerCase()
                                .indexOf(inputValue.toLowerCase()) > -1,
                          ),
                        displayRender: (label: string[]) => {
                          if (!label) return '';
                          if (label.length === 2) {
                            return [label[1]];
                          }
                          return label;
                        },
                      },
                    ),
                    title: false,
                    'x-reactions': [
                      '{{useFieldUnitDictSource("factorUnitM")}}',
                      '{{useFieldSetValueByLabel}}',
                    ],
                  },
                },
              },
              year: {
                type: 'string',
                title: I18N.carbonFootprint3.accountingYear2,
                'x-decorator': 'FormItem',
                'x-component': 'DatePicker',
                'x-component-props': {
                  disabled: true,
                  picker: 'year',
                },
              },
              supplierId: {
                type: 'string',
                ...initFormilySelect(
                  I18N.carbonFootprint3.supplierName,
                  supplierFieldRequired,
                ),
                'x-reactions': isShare
                  ? []
                  : ['{{useFieldSupplierSource({status: 1})}}'],
                'x-validator': [
                  (value: unknown) =>
                    typeof value === 'string' && value.length > 100
                      ? I18N.carbonFootprint3.lengthOrEntry
                      : '',
                ],
              },
              email: {
                type: 'string',
                ...initFormilyInput(
                  I18N.carbonFootprint3.eMail,
                  supplierFieldRequired,
                ),
                'x-validator': [
                  {
                    maxLength: 50,
                  },
                  (value: string) =>
                    checkEmail(value)
                      ? ''
                      : I18N.carbonFootprint3.pleaseInputCorrectly,
                ],
              },
              expireTime: {
                type: 'string',
                title: I18N.carbonFootprint3.deadline,
                required: supplierFieldRequired,
                'x-decorator': 'FormItem',
                'x-component': 'DatePicker',
                'x-component-props': {
                  disabledDate: (date: Moment) =>
                    !moment(date.format('YYYY-MM-DD')).isSameOrAfter(
                      moment(moment().format('YYYY-MM-DD')),
                    ),
                },
                'x-validator': supplierFieldRequired
                  ? {
                      required: true,
                      message: I18N.carbonFootprint3.pleaseSelectADeadline,
                    }
                  : {},
                'x-reactions': [
                  supplierDataIdReaction,
                  supplierExpireTimeReaction,
                ],
              },
              dataType: {
                type: 'number',
                ...initFormilyRadio(
                  I18N.carbonFootprint3.requestDataClass,
                  supplierFieldRequired,
                ),
                'x-decorator-props': {
                  gridSpan: 2,
                },
                default: MODEL_EMISSION_DATA_TYPE.RESULT,
                enum: [
                  {
                    value: MODEL_EMISSION_DATA_TYPE.RESULT,
                    label:
                      MODEL_EMISSION_DATA_TYPE_LABEL[
                        MODEL_EMISSION_DATA_TYPE.RESULT
                      ],
                  },
                  {
                    value: MODEL_EMISSION_DATA_TYPE.PROCESS,
                    label:
                      MODEL_EMISSION_DATA_TYPE_LABEL[
                        MODEL_EMISSION_DATA_TYPE.PROCESS
                      ],
                  },
                ],
                'x-reactions': supplierDataIdReaction,
              },
              footBorderType: {
                type: 'number',
                ...initFormilyRadio(
                  I18N.carbonFootprint3.theSystemBoundaryNeedsTo,
                  supplierFieldRequired,
                ),
                'x-decorator-props': {
                  gridSpan: 2,
                },
                default: MODEL_EMISSION_BORDER_TYPE.HALF,
                enum: [
                  {
                    value: MODEL_EMISSION_BORDER_TYPE.HALF,
                    label:
                      MODEL_EMISSION_BORDER_TYPE_LABEL[
                        MODEL_EMISSION_BORDER_TYPE.HALF
                      ],
                  },
                  {
                    value: MODEL_EMISSION_BORDER_TYPE.WHOLE,
                    label:
                      MODEL_EMISSION_BORDER_TYPE_LABEL[
                        MODEL_EMISSION_BORDER_TYPE.WHOLE
                      ],
                  },
                ],
                'x-reactions': supplierDataIdReaction,
              },
              descr: {
                type: 'string',
                ...initFormilyInputTextArea(
                  I18N.carbonFootprint3.dataRequirementDescription,
                  false,
                ),
                'x-decorator-props': {
                  gridSpan: 2,
                },
                'x-validator': {
                  maxLength: 1000,
                },
                'x-reactions': supplierDataIdReaction,
              },
            },
          },
        },
      },
    },
  };
};
export const genEmissionMatchWaySchema: (
  quickDrawerMatchWayBtns: { label: string; value: any }[],
  defaultMatchWay?: number,
  disabled?: boolean,
) => ISchema = (
  quickDrawerMatchWayBtns,
  defaultMatchWay,
  disabled = false,
) => ({
  type: 'void',
  properties: {
    matchWay: {
      type: 'number',
      enum: quickDrawerMatchWayBtns,
      default: defaultMatchWay || FACTOR,
      'x-reactions': [
        {
          dependencies: ['grid.type'],
          fulfill: {
            schema: {
              'x-hidden': `{{$deps[0] === ${EMISSION_TYPE_OPTIONS.TRANS}}}`,
            },
          },
        },
        {
          fulfill: {
            schema: {
              required: '{{!useModelEmissionApi}}',
            },
          },
        },
      ],
      'x-component': 'FormilyButtonSelect',
      'x-component-props': {
        variant: 'tab',
        disabled,
      },
    },
  },
});
