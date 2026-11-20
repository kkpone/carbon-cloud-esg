import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Tooltip } from 'antd';
import { ReactNode } from 'react';

import styles from './index.module.less';

/** 字段标题右侧的说明，支持鼠标悬停和键盘聚焦。 */
export default function CbamFieldLabel({
  children,
  hint,
  ellipsis = false,
}: {
  children: ReactNode;
  hint?: ReactNode;
  /** 表头省略文字时，为说明图标保留独立空间。 */
  ellipsis?: boolean;
}) {
  const icon = hint && (
    <Tooltip
      title={hint}
      trigger={['hover', 'focus']}
      overlayStyle={{ maxWidth: 'min(420px, calc(100vw - 32px))' }}
    >
      <ExclamationCircleOutlined
        className={styles.icon}
        tabIndex={0}
        aria-label={typeof children === 'string' ? children : undefined}
      />
    </Tooltip>
  );
  if (ellipsis) {
    return (
      <span className={styles.label}>
        <span className={styles.labelText}>{children}</span>
        {icon}
      </span>
    );
  }
  return (
    <>
      {children}
      {icon}
    </>
  );
}
