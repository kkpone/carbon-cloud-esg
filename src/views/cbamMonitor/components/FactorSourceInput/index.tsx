import {
  useTranslationInput,
  useCbamTranslationEnglish,
} from '@/components/CbamTranslation';
import { AutoComplete, Form, Input } from 'antd';
import { DownOutlined } from '@ant-design/icons';
import I18N from '@/lang/I18N';
import styles from './index.module.less';

interface FactorSourceInputProps {
  id?: string;
  /** 源流名称可以独立手动填写。 */
  value?: string;
  /** 选择时保存监测项 ID，输入名称时解除关联。 */
  onChange?: (value: string) => void;
  /** 选项 value 使用源流稳定 ID，允许源流同名。 */
  options: { label: string; labelEn?: string; value: string }[];
  /** 直接排放监测和因子取样分别跟随各自分组的语言。 */
  groupId?: string;
  /** 因子选择源流时关联监测项；监测源流名称输入不建立自关联。 */
  linkMonitorItem?: boolean;
}

/** 输入独立源流名称，或选择监测计划源流并保存其稳定 ID。 */
export default function FactorSourceInput({
  value,
  onChange,
  options,
  id,
  groupId = 'FACTOR_SAMPLING',
  linkMonitorItem = true,
}: FactorSourceInputProps) {
  const form = Form.useFormInstance();
  const translation = useTranslationInput(undefined, id);
  const english = useCbamTranslationEnglish(groupId);
  Form.useWatch('sourceFlowNameEn', { form, preserve: true });
  const displayOptions = options
    .map(option => ({
      value: option.value,
      label: (english ? option.labelEn : option.label)?.trim(),
    }))
    .filter((option): option is { value: string; label: string } =>
      Boolean(option.label),
    );
  return (
    <AutoComplete
      className={styles.field}
      value={english ? form.getFieldValue('sourceFlowNameEn') ?? '' : value}
      disabled={translation?.readonly}
      maxLength={english ? undefined : 40}
      placeholder={I18N.cbamMonitor.enterOrSelect}
      options={displayOptions}
      allowClear
      showArrow
      suffixIcon={<DownOutlined />}
      filterOption={(input, option) =>
        String(option?.label || '')
          .toLowerCase()
          .includes(input.toLowerCase())
      }
      onChange={text => {
        const selected = displayOptions.find(option => option.value === text);
        const nextValue = selected?.label || text;
        if (english) {
          // 英文仅写入当前抽屉的英文名称，保留中文名称和原监测项关联。
          if (translation) translation.write(nextValue);
          else form.setFieldValue('sourceFlowNameEn', nextValue);
          return;
        }
        if (linkMonitorItem)
          form.setFieldValue('processMonitorItemKey', selected?.value);
        onChange?.(nextValue);
      }}
    >
      <Input placeholder={I18N.cbamMonitor.enterOrSelect} />
    </AutoComplete>
  );
}
