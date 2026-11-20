/**
 * @description 列表页搜索表单
 */
import { type FormProps, Form } from 'antd';

import classNames from 'classnames';
import type { ReactNode } from 'react';

import styles from './index.module.css';

interface Props<Values extends object = Record<string, unknown>>
  extends Omit<FormProps<Values>, 'children' | 'layout'> {
  children: ReactNode;
  /** 搜索区右侧操作，例如视图切换 */
  extra?: ReactNode;
  /** 右侧操作区样式 */
  extraClassName?: string;
}

export default function ListSearchForm<
  Values extends object = Record<string, unknown>,
>({ children, className, extra, extraClassName, ...formProps }: Props<Values>) {
  const formNode = (
    <Form<Values>
      {...formProps}
      className={classNames(styles.form, className)}
      layout='inline'
    >
      {children}
    </Form>
  );

  if (!extra) {
    return formNode;
  }

  return (
    <div className={styles.wrapper}>
      {formNode}
      <div className={classNames(styles.extra, extraClassName)}>{extra}</div>
    </div>
  );
}
