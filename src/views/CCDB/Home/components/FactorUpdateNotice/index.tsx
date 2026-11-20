import { RightOutlined, SoundOutlined } from '@ant-design/icons';
import I18N from '@src/lang/I18N';
import { useRequest } from 'ahooks';
import { Button, Spin } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

import { getFactorUpdates } from '../../updateService';
import UpdateHistoryDrawer from '../UpdateHistoryDrawer';
import styles from './index.module.less';

export default function FactorUpdateNotice() {
  const { data, loading, error, refresh } = useRequest(() =>
    getFactorUpdates({ pageNum: 1, pageSize: 1 }),
  );
  const [open, setOpen] = useState(false);

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spin size='small' />
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.error} role='alert'>
        <span>{I18N.ccdb.factorUpdateLoadFailed}</span>
        <Button type='link' onClick={refresh}>
          {I18N.ccdb.factorUpdateRetry}
        </Button>
      </div>
    );
  }

  const notification = data?.list[0];
  if (!notification) return null;

  return (
    <>
      <div className={styles.notice}>
        <div className={styles.label}>
          <SoundOutlined />
          <span>{I18N.ccdb.factorUpdateLabel}</span>
        </div>
        <span className={styles.summary} title={notification.title}>
          {notification.title}
        </span>
        <span className={styles.date}>
          {notification.publishTime &&
            dayjs(notification.publishTime).format('YYYY-MM-DD')}
        </span>
        <Button
          type='link'
          className={styles.viewAll}
          onClick={() => setOpen(true)}
        >
          {I18N.ccdb.factorUpdateViewAll}
          <RightOutlined />
        </Button>
      </div>
      <UpdateHistoryDrawer open={open} onClose={() => setOpen(false)} />
    </>
  );
}
