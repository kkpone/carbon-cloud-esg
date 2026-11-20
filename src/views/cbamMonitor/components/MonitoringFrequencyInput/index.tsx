import {
  useTranslationInput,
  useCbamTranslationEnglish,
} from '@/components/CbamTranslation';
import { AutoComplete, Form, Input } from 'antd';
import I18N from '@/lang/I18N';
import {
  monitoringFrequencyOptions,
  monitoringFrequencyDisplayValue,
} from '../../fieldChanges';
import styles from './index.module.less';

/** 频次可选预设或手动输入，持久化预设编码及原样自定义文本。 */
export default function MonitoringFrequencyInput({
  value,
  onChange,
  id,
  groupId = 'PFC_MONITOR',
}: {
  id?: string;
  /** 复用控件时跟随所属监测分组的语言。 */
  groupId?: string;
  value?: string;
  onChange?: (value: string) => void;
}) {
  const form = Form.useFormInstance();
  const translation = useTranslationInput(undefined, id);
  const english = useCbamTranslationEnglish(groupId);
  Form.useWatch('frequencyEn', { form, preserve: true });
  const options = monitoringFrequencyOptions(english);
  return (
    <AutoComplete
      className={styles.field}
      value={monitoringFrequencyDisplayValue(
        value,
        form.getFieldValue('frequencyEn'),
        english,
      )}
      disabled={translation?.readonly}
      options={options.map(item => ({ value: item.label }))}
      allowClear
      onChange={text => {
        if (english) {
          // 英文内容先写入当前抽屉草稿，取消不改变中文频次或主表。
          if (translation) translation.write(text);
          else form.setFieldValue('frequencyEn', text);
          return;
        }
        onChange?.(options.find(item => item.label === text)?.value || text);
      }}
    >
      <Input
        maxLength={english ? undefined : 40}
        placeholder={I18N.cbamMonitor.enterOrSelect}
      />
    </AutoComplete>
  );
}
