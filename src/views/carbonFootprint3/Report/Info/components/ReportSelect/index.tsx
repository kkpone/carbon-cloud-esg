import { ComponentProps } from 'react';
import { Select } from '@formily/antd-v5';
import { SelectProps } from 'antd';
import { AnalysisText } from '@/views/carbonFootprint3/components/AnalysisText';
import styles from './index.module.less';

export const renderSelectOption: NonNullable<
  SelectProps['optionRender']
> = option =>
  typeof option.label === 'string' || typeof option.label === 'number' ? (
    <AnalysisText value={String(option.label)} />
  ) : (
    <span className={styles.label}>{option.label}</span>
  );

export function ReportSelect(props: ComponentProps<typeof Select>) {
  return <Select optionRender={renderSelectOption} {...props} title='' />;
}
