import { useCbamTranslationEnglish } from '@/components/CbamTranslation';
import { Cascader } from 'antd';
import I18N from '@/lang/I18N';
import { energyPropertyOptions } from '../../fieldChanges';
import styles from './index.module.less';

/** 二级能源选择器，表单仍保存单个叶子编码，旧自由文本保持可见。 */
export default function EnergyPropertySelect({
  value,
  onChange,
}: {
  value?: string;
  onChange?: (value?: string) => void;
}) {
  const english = useCbamTranslationEnglish('FACILITY_ELECTRICITY');
  const options = energyPropertyOptions(english);
  const parent = options.find(group =>
    group.children.some(item => item.value === value),
  );
  if (value && !parent)
    options.push({ value, label: value, children: [{ value, label: value }] });
  return (
    <Cascader
      className={styles.field}
      options={options}
      value={value ? [parent?.value || value, value] : []}
      onChange={path =>
        onChange?.(path?.length ? String(path[path.length - 1]) : undefined)
      }
      placeholder={I18N.cbamMonitor.select}
    />
  );
}
