import { Space, Typography } from 'antd';
import type { ReactNode } from 'react';

import styles from './index.module.css';

/** 能碳页面内容容器，导航与面包屑由碳云外层路由布局负责。 */
export default function PageContainer({
  title,
  titleExtra,
  extra,
  children,
}: {
  title?: string;
  permissionKey?: string;
  titleExtra?: ReactNode;
  extra?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Space wrap className={styles.title}>
          <Typography.Title level={4} style={{ margin: 0 }}>
            {title}
          </Typography.Title>
          {titleExtra}
        </Space>
        {extra && <div className={styles.actions}>{extra}</div>}
      </div>
      {children}
    </div>
  );
}
