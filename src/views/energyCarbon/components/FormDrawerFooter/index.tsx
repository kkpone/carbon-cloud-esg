import { Button } from 'antd';
import type { ReactNode } from 'react';

import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import styles from './index.module.css';

type ChildrenProps = {
  children: ReactNode;
};

type PresetProps = {
  /** 详情态仅展示「返回」，否则展示「取消」「保存」 */
  isView: boolean;
  onClose: () => void;
  /** 用于 data-testid：`{prefix}-back` / `{prefix}-save` / `{prefix}-cancel` */
  testIdPrefix: string;
  /** 与表单 `id` 一致；非详情时供保存按钮 `htmlType="submit"` 关联 */
  formId: string;
  /** 非详情时保存按钮 loading */
  saveLoading?: boolean;
  /** 非详情时保存按钮禁用 */
  saveDisabled?: boolean;
  /** 非详情时主按钮文案，默认「保存」。 */
  saveText?: ReactNode;
};

export type FormDrawerFooterProps = ChildrenProps | PresetProps;

/**
 * 表单 Drawer 底部操作区。
 * - 传入 `children` 时完全自定义内容；
 * - 传入 `isView` 等预设字段时：详情为「返回」，否则为「取消 + 保存」。
 */
export default function FormDrawerFooter(props: FormDrawerFooterProps) {
  useLocale();

  if ('children' in props) {
    return <div className={styles.root}>{props.children}</div>;
  }

  if (props.isView) {
    return (
      <div className={styles.root}>
        <Button
          onClick={props.onClose}
          data-testid={`${props.testIdPrefix}-back`}
        >
          {I18N.common.actions.back}
        </Button>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <Button
        key='cancel'
        onClick={props.onClose}
        data-testid={`${props.testIdPrefix}-cancel`}
      >
        {I18N.common.actions.cancel}
      </Button>
      <Button
        key='save'
        type='primary'
        htmlType='submit'
        form={props.formId}
        loading={props.saveLoading}
        disabled={props.saveDisabled}
        data-testid={`${props.testIdPrefix}-save`}
      >
        {props.saveText ?? I18N.common.actions.save}
      </Button>
    </div>
  );
}
