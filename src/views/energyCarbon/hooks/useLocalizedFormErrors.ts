import type { FormInstance } from 'antd';
import { useEffect } from 'react';

import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';

/** 能碳表单切换语言时刷新已显示的错误，不重置输入或校验未报错字段。 */
export function useLocalizedFormErrors<Values>(form: FormInstance<Values>) {
  const { locale } = useLocale();

  useEffect(() => {
    const fields = form
      .getFieldsError()
      .filter(field => field.errors.length > 0);
    if (fields.length) {
      form
        .validateFields(fields.map(field => field.name))
        .catch(() => undefined);
    }
  }, [form, locale]);
}
