import { Alert, Button, Collapse, Empty, Input, Modal, Select, Spin, Tag } from 'antd';
import { useEffect, useState } from 'react';
import dayjs from 'dayjs';
import I18N from '@/lang/I18N';
import { admitFeishuReceipt, fetchFeishuReceipts, retryFeishuReceipt, type FeishuReceipt } from '../../service';
import styles from './index.module.less';
import ClarificationList from './components/ClarificationList';
import NotificationReview from './components/NotificationReview';

/** 展示归档状态，不能以归档成功代替解析成功。 */
export default function ReceiptList({ projectId, bindingId, onChanged }: { projectId: string; bindingId: string; onChanged?: () => void }) {
  const [rows, setRows] = useState<FeishuReceipt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [offset, setOffset] = useState(0);
  const [filter, setFilter] = useState('all');
  const [hasMore, setHasMore] = useState(false);
  const [admitting, setAdmitting] = useState<FeishuReceipt>();
  const [admissionReason, setAdmissionReason] = useState('');
  const [admissionError, setAdmissionError] = useState('');
  const text = I18N.feishuCollection;
  const labels: Record<string, string> = {
    RECEIVED: text.received, ARCHIVING: text.archiving, ARCHIVED: text.receiptOriginalSaved,
    RETRY: text.retrying, FAILED: text.archiveFailed, CONTEXT_READY: text.contextSaved,
  };
  const runLabels: Record<string, string> = { STARTING: text.analysisWaiting, RUNNING: text.analyzing,
    WAITING_TOOL: text.backgroundWaiting, RESUMING: text.backgroundResuming,
    UNKNOWN: text.analysisBlocked, BLOCKED: text.analysisBlocked, NEEDS_ATTENTION: text.analysisBlocked,
    CANCELLED: text.analysisCancelled, COMPLETED: text.runCompleted };
  const analysisLabels: Record<string, string> = { WAITING: text.analysisWaiting, PROCESSING: text.analyzing,
    BLOCKED: text.analysisBlocked, READY: text.analysisReady, PARTIAL: text.analysisPartial,
    FAILED: text.analysisFailed, UNSUPPORTED: text.unsupported };
  const replyLabels: Record<string, string> = { SENT: text.sent, PENDING: text.sendPending,
    SENDING: text.sending, SEND_UNKNOWN: text.sendUnknown };
  // 收件按服务端分页；仅折叠本页文字，不过滤请求结果，避免空页和分页错位。
  const fileRows = rows.filter(row => row.messageType === 'file' || row.messageType === 'image' || row.assetId);
  const contextRows = rows.filter(row => !fileRows.includes(row));
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchFeishuReceipts(projectId, bindingId, controller.signal, { offset, limit: 21, filter }).then(value => {
      if (!controller.signal.aborted) { setRows(value.slice(0, 20)); setHasMore(value.length > 20); }
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : text.loadFailed);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [projectId, bindingId, refresh, offset, filter, text.loadFailed]);
  /** 重试当前收件归档并刷新列表，不把归档重试当作分析任务重试。 */
  const retry = async (receiptId: string) => {
    setBusy(receiptId);
    setError('');
    try {
      await retryFeishuReceipt(projectId, bindingId, receiptId);
      setRefresh(current => current + 1);
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : text.operationFailed);
    } finally { setBusy(''); }
  };
  /** 固定点击时的解析版本；失败保留确认框及说明，成功后刷新收件和项目资料。 */
  const admit = async () => {
    if (!admitting?.analysisJobId || busy) return;
    setBusy(admitting.receiptId);
    setAdmissionError('');
    try {
      await admitFeishuReceipt(projectId, bindingId, admitting.receiptId, admitting.analysisJobId, admissionReason);
      setAdmitting(undefined);
      setRefresh(current => current + 1);
      onChanged?.();
    } catch (failure) {
      setAdmissionError(failure instanceof Error ? failure.message : text.operationFailed);
    } finally { setBusy(''); }
  };
  return <div className={styles.content}>
    <p className={styles.hint}>{text.receiptProcessingHint}</p>
    <div className={styles.toolbar}>
      <Select className={styles.filter} aria-label={text.receiptFilter} value={filter} onChange={value => { setFilter(value); setOffset(0); }} options={[
        { value: 'all', label: text.allStatuses }, { value: 'pending', label: text.admissionPending },
        { value: 'admitted', label: text.admitted }, { value: 'review', label: text.materialReview },
        { value: 'excluded', label: text.materialExcluded }, { value: 'failed', label: text.analysisBlocked },
      ]} />
      <Button onClick={() => setRefresh(current => current + 1)} disabled={loading || Boolean(busy)}>{text.refresh}</Button>
    </div>
    {error && <Alert type='error' showIcon message={error} />}
    <ClarificationList key={`${projectId}:${bindingId}`} projectId={projectId} bindingId={bindingId} revision={refresh} />
    <NotificationReview key={`notification:${projectId}:${bindingId}`} projectId={projectId} bindingId={bindingId} revision={refresh} />
    <Spin spinning={loading}>
      {!loading && !error && !rows.length && <Empty description={text.noReceipts} />}
      {!loading && !error && rows.length > 0 && <p className={styles.pageSummary}>
        {I18N.template(text.receiptPageSummary, { val1: fileRows.length, val2: contextRows.length })}
      </p>}
      <div className={styles.files}>
        {fileRows.map(row => {
          let processing = runLabels[row.dispatchStatus || ''] || text.notAnalyzed;
          if (row.dispatchStatus === 'COMPLETED') processing = text.notAnalyzed;
          if (row.analysisStatus) processing = analysisLabels[row.analysisStatus] || text.receiptStatusUnknown;
          if (['WAITING_TOOL', 'RESUMING'].includes(row.dispatchStatus || '') && !['READY', 'PARTIAL', 'FAILED', 'UNSUPPORTED'].includes(row.analysisStatus || '')) {
            processing = runLabels[row.dispatchStatus || ''];
          }
          // 已保存结果继续展示；停止意图单独呈现，不能将取消受理当作已经停止。
          const stopping = row.cancelRequested && row.dispatchStatus !== 'CANCELLED';
          if (row.dispatchStatus === 'CANCELLED' && !['READY', 'PARTIAL'].includes(row.analysisStatus || '')) {
            processing = text.analysisCancelled;
          } else if (stopping && !['READY', 'PARTIAL'].includes(row.analysisStatus || '')) {
            processing = '';
          }
          // 解析结果与项目准入独立展示；完成一次会话不能推断文件已解析或已入库。
          const admitted = ['ADMITTED', 'MANUAL'].includes(row.admissionStatus || '');
          let admissionLabel = row.admissionStatus ? text.receiptNotAdmitted : text.receiptStatusUnknown;
          if (admitted) admissionLabel = text.admitted;
          if (row.admissionStatus === 'MANUAL' && row.admittedAnalysisJobId) admissionLabel = text.manuallyAdmitted;
          let state = processing;
          let color = row.analysisStatus === 'READY' ? 'green' : 'default';
          if (['FAILED', 'RETRY'].includes(row.status) || row.analysisStatus === 'FAILED') {
            color = 'red';
            if (['FAILED', 'RETRY'].includes(row.status)) state = labels[row.status];
          }
          if (row.materialStatus === 'REVIEW') { state = text.receiptReview; color = 'gold'; }
          if (row.materialStatus === 'EXCLUDED') { state = text.receiptExcluded; color = 'default'; }
          return <section key={row.receiptId} className={styles.row}>
            <div className={styles.heading}>
              <strong>{row.fileName || text.receiptUnnamedFile}</strong>
              {state && <Tag color={color}>{state}</Tag>}
            </div>
            <p className={styles.meta}>{I18N.template(text.receiptRecordedAt, {
              val1: dayjs(row.receivedAt || row.sentAt).format('YYYY-MM-DD HH:mm'),
            })}</p>
            <dl className={styles.stages}>
              <div><dt>{text.receiptFileStage}</dt><dd>{labels[row.status] || text.receiptStatusUnknown}</dd></div>
              <div><dt>{text.analysisStatus}</dt><dd>{stopping ? text.cancelPending : processing || text.notAnalyzed}</dd></div>
              <div><dt>{text.receiptLibraryStage}</dt><dd>{admissionLabel}
                {row.canAdmit && row.analysisJobId && !admitted && <Button size='small' className={styles.admitButton}
                  disabled={Boolean(busy)} onClick={() => { setAdmitting(row); setAdmissionReason(''); setAdmissionError(''); }}>
                  {text.confirmAdmission}
                </Button>}
              </dd></div>
            </dl>
            {row.materialReason && <div className={styles.reason}>
              <strong>{text.receiptDecisionReason}</strong><p>{row.materialReason}</p>
            </div>}
            {row.errorCode && <p className={styles.error}>{I18N.template(text.receiptError, { val1: row.errorCode })}</p>}
            {['FAILED', 'RETRY'].includes(row.status) && <Button loading={busy === row.receiptId} disabled={Boolean(busy)} onClick={() => retry(row.receiptId)}>{text.retryArchive}</Button>}
          </section>;
        })}
      </div>
      {contextRows.length > 0 && <Collapse className={styles.context} items={[{
        key: 'context', label: I18N.template(text.receiptTextRecords, { val1: contextRows.length }),
        children: contextRows.map(row => <section key={row.receiptId} className={styles.contextRow}>
          <div className={styles.heading}><strong>{text.receiptTextRecord}</strong><span className={styles.meta}>
            {dayjs(row.receivedAt || row.sentAt).format('MM-DD HH:mm')}
          </span></div>
          <p>{runLabels[row.dispatchStatus || ''] || text.contextSaved}</p>
          {row.replyText && <p>{row.replyText}</p>}
          {row.replyStatus && <span className={styles.meta}>{replyLabels[row.replyStatus] || text.receiptStatusUnknown}</span>}
        </section>),
      }]} />}
    </Spin>
    <div className={styles.pagination}>
      <Button disabled={loading || offset === 0} onClick={() => setOffset(value => Math.max(0, value - 20))}>{text.previousPage}</Button>
      <Button disabled={loading || !hasMore || Boolean(error)} onClick={() => setOffset(value => value + 20)}>{text.nextPage}</Button>
    </div>
    <Modal title={text.confirmAdmission} open={Boolean(admitting)} onOk={admit}
      onCancel={() => { if (!busy) setAdmitting(undefined); }} confirmLoading={Boolean(busy)}
      closable={!busy} maskClosable={!busy} keyboard={!busy} cancelButtonProps={{ disabled: Boolean(busy) }}
      okText={text.confirmAdmission} cancelText={text.cancel}>
      <p>{I18N.template(text.confirmAdmissionFile, { val1: admitting?.fileName || text.receiptUnnamedFile })}</p>
      <p>{text.confirmAdmissionHint}</p>
      <Input.TextArea aria-label={text.admissionReason} placeholder={text.admissionReason} value={admissionReason}
        onChange={event => setAdmissionReason(event.target.value)} maxLength={500} showCount rows={3} disabled={Boolean(busy)} />
      {admissionError && <Alert className={styles.admissionError} type='error' showIcon message={admissionError} />}
    </Modal>
  </div>;
}
