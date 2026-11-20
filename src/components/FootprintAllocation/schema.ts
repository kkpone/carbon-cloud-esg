import { createElement } from 'react';
import TransportDistanceLabel from './components/TransportDistanceLabel';
import { TransportRequirementRadio } from './components/TransportRequirementRadio';
import { TransportEnergyLabel } from './components/EmissionFields';
import { ISchema } from '@formily/react';
import I18N from '@src/lang/I18N';
import styles from './components/EmissionFields/index.module.less';

/** 仅在核算排放源抽屉启用，不修改模型库或过程核算共用的原schema。 */
export const enhanceQuickTransportSchema = (
  schema: ISchema,
  enabled: boolean,
): ISchema => {
  if (!enabled) return schema;
  const visit = (node: ISchema) => {
    const { properties } = node;
    if (!properties || typeof properties !== 'object') return;
    // 保留已有路段，最多允许新增到 5 个，并在提交时校验数量。
    if (properties.accountEmissionTransportList) {
      properties.accountEmissionTransportList.maxItems = 5;
    }
    if (properties.needTransport) {
      const { needTransport } = properties;
      needTransport['x-component'] = TransportRequirementRadio;
      needTransport['x-reactions'] = [
        ...(Array.isArray(needTransport['x-reactions'])
          ? needTransport['x-reactions']
          : []),
        {
          dependencies: ['type'],
          fulfill: {
            state: {
              componentProps: {
                disabled: '{{$form.readPretty}}',
              },
            },
          },
        },
      ];
    }
    if (properties.addition?.['x-component'] === 'ArrayCollapse.Addition') {
      properties.addition['x-reactions'] = [
        {
          dependencies: ['accountEmissionTransportList', 'type'],
          fulfill: {
            state: {
              disabled:
                '{{($deps[0] || []).length >= 5 || Number($deps[1]) === 5 || $form.readPretty}}',
            },
          },
        },
      ];
    }
    if (
      properties?.productWeight &&
      properties.transportTool &&
      properties.transportFuel
    ) {
      if (properties.distance) {
        if (properties.distance['x-component'] === 'TransportMileageInput') {
          properties.distance['x-component-props'] = {
            ...properties.distance['x-component-props'],
            label: createElement(TransportDistanceLabel),
          };
        } else {
          properties.distance.title = createElement(TransportDistanceLabel);
        }
      }
      properties.productWeight.title =
        I18N.carbonFootprint3.goodsWeightPerFunctionalUnit;
      if (properties.quantityUnit) {
        properties.quantityUnit.title = createElement(TransportEnergyLabel);
        properties.quantityUnit['x-decorator-props'] = {
          ...properties.quantityUnit['x-decorator-props'],
          className: styles.amountField,
        };
      }
      // 跨两列的详情必须另起一行，不能被压缩进能耗数量右侧的剩余一列。
      node['x-component-props'] = {
        ...node['x-component-props'],
        strictAutoFit: true,
      };
      // 货物重量/载重比和里程各占一列，去掉里程复用旧布局中的占位列。
      delete properties.distanceRowBreak;
      if (properties.distance) {
        properties.distance['x-decorator-props'] = {
          ...properties.distance['x-decorator-props'],
          gridSpan: 1,
        };
      }
      const grid = properties.productWeight.properties;
      if (!grid || typeof grid !== 'object') return;
      const weight = grid?.amount;
      if (weight) {
        weight['x-reactions'] = [
          ...(Array.isArray(weight['x-reactions'])
            ? weight['x-reactions'].slice(1)
            : []),
          {
            dependencies: ['unitAmount', 'type'],
            fulfill: {
              state: {
                componentProps: {
                  disabled:
                    '{{[21,22,23,24].includes(Number($deps[1])) || $form.readPretty}}',
                },
              },
            },
          },
        ];
      }
      const text = (title: string, maxLength: number): ISchema => ({
        type: 'string',
        title,
        'x-decorator': 'FormItem',
        'x-component': 'Input',
        'x-component-props': {
          maxLength,
          placeholder: I18N.carbonFootprint3.pleaseEnter,
          className: styles.transportInput,
        },
      });
      const details: ISchema = {
        type: 'void',
        'x-decorator': 'FormGrid.GridColumn',
        'x-decorator-props': {
          gridSpan: 2,
          className: styles.transportDetailsColumn,
        },
        'x-component': 'TaskTransportDetails',
        properties: {
          grid: {
            type: 'void',
            'x-component': 'FormGrid',
            'x-component-props': { maxColumns: 2, columnGap: 20, rowGap: 20 },
            properties: {
              transportTool: properties.transportTool,
              transportFuel: properties.transportFuel,
              departureAddress: text(
                I18N.carbonFootprint3.task1DepartureAddress,
                40,
              ),
              destinationAddress: text(
                I18N.carbonFootprint3.task1DestinationAddress,
                40,
              ),
              // 车型的标准载重规格，单位 t；仅道路运输按能耗计算时不适用。
              loadCapacity: {
                ...text(I18N.carbonFootprint3.task1LoadCapacity, 10),
                'x-component': 'NumberPicker',
                'x-component-props': {
                  addonAfter: 't',
                  placeholder: I18N.carbonFootprint3.pleaseEnter,
                  className: styles.transportInput,
                  precision: 2,
                  controls: false,
                  stringMode: true,
                  maxLength: 10,
                  min: '0',
                },
                'x-reactions': [
                  {
                    dependencies: ['.transportType', '.way'],
                    fulfill: {
                      state: {
                        visible:
                          '{{!(Number($deps[0]) === 1 && Number($deps[1]) === 3)}}',
                      },
                    },
                  },
                ],
              },
            },
          },
        },
      };
      delete properties.transportTool;
      delete properties.transportFuel;
      // 新增路段详情放在因子信息之前，原字段对象和数据路径保持不变。
      const orderedProperties: Record<string, ISchema> = {};
      Object.entries(properties).forEach(([name, property]) => {
        if (name === 'factorSchema') {
          orderedProperties.transportDetails = details;
        }
        orderedProperties[name] = property;
      });
      if (!orderedProperties.transportDetails) {
        orderedProperties.transportDetails = details;
      }
      node.properties = orderedProperties;
    }
    Object.values(node.properties || {}).forEach(visit);
    if (node.items && !Array.isArray(node.items)) visit(node.items);
  };
  visit(schema);
  return schema;
};
