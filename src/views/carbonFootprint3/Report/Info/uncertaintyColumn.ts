import { ISchema } from '@formily/react';
import I18N from '@/lang/I18N';
import { createElement } from 'react';
import { Tooltip } from 'antd';

export const uncertaintyColumn = (): ISchema => ({
  type: 'void',
  'x-component': 'ArrayTable.Column',
  'x-component-props': {
    title: createElement(
      Tooltip,
      { title: I18N.carbonFootprint3.analysisUncertaintyHint },
      createElement('span', null, I18N.subModules.uncertainty2),
    ),
    width: 180,
  },
  properties: {
    uncertain: {
      type: 'string',
      'x-decorator': 'FormItem',
      'x-component': 'NumberPicker',
      'x-component-props': {
        placeholder: I18N.subModules.uncertainty,
        addonAfter: '%',
        controls: false,
        precision: 2,
        min: 0,
        max: 100,
      },
    },
  },
});
