import { Cascader } from 'antd';
import type { CascaderProps, DefaultOptionType } from 'antd/es/cascader';
import { useCallback, useMemo } from 'react';

import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import {
  cascaderPathToLeaf,
  leafToCascaderPath,
} from '@/views/energyCarbon/platform/cascaderLeaf';

import styles from './index.module.css';

/** 仅展示叶子节点 label */
const displayLeafOnly = (labels: string[]) =>
  labels?.length ? labels[labels.length - 1] : '';

interface Props
  extends Omit<
    CascaderProps,
    'value' | 'onChange' | 'displayRender' | 'multiple'
  > {
  /** 叶子节点 value，与后端持久化字段一致 */
  value?: string;
  /** 选中后回传叶子 value */
  onChange?: (value?: string) => void;
  /** Cascader 选项树 */
  options: DefaultOptionType[];
  /** 是否仅展示叶子 label，默认 true */
  showLeafLabelOnly?: boolean;
  'data-testid'?: string;
}

/**
 * 对外 value/onChange 均为叶子节点的 Cascader 封装。
 * 内部根据 options 自动反查完整路径，兼容 Form.Item 与历史逗号分隔路径回填。
 */
export default function LeafCascader({
  value,
  onChange,
  options,
  showLeafLabelOnly = true,
  placeholder = I18N.common.placeholder.select,
  className,
  showSearch = true,
  'data-testid': testId,
  ...rest
}: Props) {
  useLocale();
  const cascaderValue = useMemo(
    () => leafToCascaderPath(value, options),
    [value, options],
  );

  const handleChange = useCallback<NonNullable<CascaderProps['onChange']>>(
    path => {
      onChange?.(cascaderPathToLeaf(path));
    },
    [onChange],
  );

  return (
    <Cascader
      {...rest}
      value={cascaderValue}
      onChange={handleChange}
      options={options}
      showSearch={showSearch}
      displayRender={showLeafLabelOnly ? displayLeafOnly : undefined}
      placeholder={placeholder}
      className={[styles.fullWidth, className].filter(Boolean).join(' ')}
      data-testid={testId}
    />
  );
}
