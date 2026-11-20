import { Alert, Button, Collapse, Radio } from 'antd';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import I18N from '@/lang/I18N';
import { confirmFeishuNotification, fetchFeishuNotificationCandidates, fetchFeishuNotificationReviews, type FeishuNotificationReview } from '../../../../service';
import styles from './index.module.less';

/** 未知群回复就地核对，不新增发送流程，也不自动选择唯一候选。 */
export default function NotificationReview({ projectId, bindingId, revision }: {
  projectId: string; bindingId: string; revision: number;
}) {
  const [rows, setRows] = useState<FeishuNotificationReview[]>([]);
  const [loaded, setLoaded] = useState<string[]>([]);
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const text = I18N.feishuCollection;
  useEffect(() => {
    const controller = new AbortController();
    setRows([]);
    setLoaded([]);
    setSelected({});
    setError('');
    fetchFeishuNotificationReviews(projectId, bindingId, controller.signal).then(value => {
      if (!controller.signal.aborted) setRows(value);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : text.operationFailed);
    });
    return () => controller.abort();
  }, [projectId, bindingId, revision, text.operationFailed]);

  const lookup = async (id: string) => {
    setBusy(id);
    setError('');
    setSelected(current => ({ ...current, [id]: '' }));
    setLoaded(current => current.filter(item => item !== id));
    try {
      const row = await fetchFeishuNotificationCandidates(projectId, bindingId, id);
      setRows(current => current.map(item => item.notificationId === id ? row : item));
      setLoaded(current => [...current, id]);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : text.operationFailed);
    } finally { setBusy(''); }
  };

  const confirm = async (id: string) => {
    if (!selected[id]) return;
    setBusy(id);
    setError('');
    try {
      await confirmFeishuNotification(projectId, bindingId, id, selected[id]);
      setRows(current => current.filter(row => row.notificationId !== id));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : text.operationFailed);
      setSelected(current => ({ ...current, [id]: '' }));
      setLoaded(current => current.filter(item => item !== id));
    } finally { setBusy(''); }
  };

  if (!rows.length && !error) return null;
  return <section className={styles.content}>
    {error && <Alert type='error' showIcon message={error} />}
    {rows.length > 0 && <>
      <h3>{text.notificationReviewTitle}</h3>
      <p>{text.notificationReviewHint}</p>
      <Collapse items={rows.map(row => ({ key: row.notificationId,
        label: I18N.template(text.notificationAttempt, { val1: dayjs(row.startedAt).format('YYYY-MM-DD HH:mm') }),
        children: <>
          <div className={styles.body}>{row.text}</div>
          <Button onClick={() => lookup(row.notificationId)} loading={busy === row.notificationId} disabled={Boolean(busy)}>{text.notificationLookup}</Button>
          {loaded.includes(row.notificationId) && <div className={styles.results}>
            {row.truncated && <Alert type='warning' showIcon message={text.notificationLookupPartial} />}
            {!row.candidates.length ? <Alert type='info' message={text.notificationNotFound} /> : <>
              <p>{text.notificationSelectHint}</p>
              <Radio.Group aria-label={text.notificationSelectHint} value={selected[row.notificationId]}
                disabled={Boolean(busy)} onChange={event => setSelected(current => ({ ...current, [row.notificationId]: event.target.value }))}>
                {row.candidates.map((candidate, index) => <Radio key={candidate.messageId} value={candidate.messageId}>
                  {I18N.template(text.notificationCandidate, { val1: index + 1, val2: dayjs(candidate.sentAt).format('YYYY-MM-DD HH:mm:ss') })}
                </Radio>)}
              </Radio.Group>
              <div className={styles.actions}><Button type='primary' disabled={!selected[row.notificationId] || Boolean(busy)}
                onClick={() => confirm(row.notificationId)}>{text.notificationConfirm}</Button></div>
            </>}
          </div>}
        </>,
      }))} />
    </>}
  </section>;
}
