import { Radio } from '@formily/antd-v5';
import { useForm } from '@formily/react';
import type { RadioGroupProps } from 'antd';

import I18N from '@src/lang/I18N';
import { Toast } from '@src/utils/Toast';
import { QUICK_ACCOUNT_EMISSION } from '@src/views/carbonFootprint3/constant';

/** 能源/资源消耗在选择运输时立即提示，拦截后不写入运输状态。 */
export const TransportRequirementRadio = (props: RadioGroupProps) => {
  const form = useForm();
  return (
    <Radio.Group
      {...props}
      onChange={event => {
        if (
          Number(form.values.type) === QUICK_ACCOUNT_EMISSION.ENERGY &&
          Number(event.target.value) === 2
        ) {
          Toast('warning', I18N.carbonFootprint3.energyTransportNotSupported);
          return;
        }
        props.onChange?.(event);
      }}
    />
  );
};
