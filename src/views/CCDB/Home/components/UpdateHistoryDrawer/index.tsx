import I18N from '@src/lang/I18N';
import { Button, Drawer, Empty, Spin, Timeline } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';

import { getFactorUpdates, type FactorUpdatesPage } from '../../updateService';
import styles from './index.module.less';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function UpdateHistoryDrawer({ open, onClose }: Props) {
  const [pageNum, setPageNum] = useState(1);
  const [retryKey, setRetryKey] = useState(0);
  const [data, setData] = useState<FactorUpdatesPage>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setPageNum(1);
      setData(undefined);
      setLoading(true);
      setFailed(false);
      return undefined;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    getFactorUpdates({ pageNum, pageSize: 10 }, controller.signal)
      .then(response => {
        if (!controller.signal.aborted)
          setData(previous => ({
            ...response,
            list:
              pageNum === 1
                ? response.list
                : [...(previous?.list ?? []), ...response.list],
          }));
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [open, pageNum, retryKey]);

  const hasMore = !!data && data.pageNum < data.pages;

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!open || loading || failed || !hasMore || !target || !data)
      return undefined;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting))
        setPageNum(current =>
          current === data.pageNum ? current + 1 : current,
        );
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [open, loading, failed, hasMore, data]);

  return (
    <Drawer
      title={I18N.ccdb.factorUpdateHistoryTitle}
      placement='right'
      width='min(450px, 100vw)'
      open={open}
      onClose={onClose}
      classNames={{ header: styles.header }}
    >
      <p className={styles.description}>
        {I18N.ccdb.factorUpdateHistoryDescription}
      </p>
      {loading && !data && (
        <div className={styles.state}>
          <Spin />
        </div>
      )}
      {!loading && !failed && data?.list.length === 0 && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={I18N.ccdb.factorUpdateEmpty}
        />
      )}
      {data && data.list.length > 0 && (
        <Timeline
          items={data.list.map(record => ({
            key: String(record.id),
            color: '#00ad8e',
            children: (
              <div className={styles.record}>
                <div className={styles.date}>
                  {record.publishTime &&
                    dayjs(record.publishTime).format('YYYY-MM-DD HH:mm')}
                </div>
                <div className={styles.card}>
                  <div className={styles.heading}>{record.title}</div>
                  <p className={styles.summary}>{record.content}</p>
                </div>
              </div>
            ),
          }))}
        />
      )}
      {!loading && failed && (
        <div className={data ? styles.loadMore : styles.state} role='alert'>
          <span>{I18N.ccdb.factorUpdateLoadFailed}</span>
          <Button onClick={() => setRetryKey(key => key + 1)}>
            {I18N.ccdb.factorUpdateRetry}
          </Button>
        </div>
      )}
      <div ref={loadMoreRef} className={styles.loadMore} role='status'>
        {loading && data && <Spin size='small' />}
        {!loading &&
          !failed &&
          data &&
          data.list.length > 0 &&
          !hasMore &&
          I18N.ccdb.factorUpdateAllShown}
      </div>
    </Drawer>
  );
}
