import {
  ArrayTable,
  Cascader,
  DatePicker,
  FormGrid,
  FormItem,
  FormLayout,
  Input,
  Radio,
  FormTab,
  NumberPicker,
} from '@formily/antd-v5';
import { createSchemaField } from '@formily/react';
import { Text } from '@components/FormilyUtil/util';
import { InputSelect } from '@/views/subModules/CarbonFootprintModel/Certification/CertificationForm/components/InputSelect';

import { ReportSelect } from './components/ReportSelect';

export const ReportSchemaField = createSchemaField({
  components: {
    Input,
    Select: ReportSelect,
    Cascader,
    FormItem,
    FormLayout,
    FormGrid,
    DatePicker,
    ArrayTable,
    Text,
    Radio,
    FormTab,
    InputSelect,
    NumberPicker,
  },
});
