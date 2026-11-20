import { Alert, Button, Empty, Input, Modal, Select, Spin, Tabs, Tag, message } from 'antd';
import { MessageOutlined, SendOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { nanoid } from 'nanoid';
import dayjs from 'dayjs';
import I18N from '@/lang/I18N';
import { fetchFeishuCapability, fetchFeishuGroups, fetchFeishuReplies, fetchFeishuSupplements, sendFeishuSupplement, recoverFeishuSupplement, confirmFeishuDraft,
  type FeishuGroup, type FeishuReceipt, type FeishuSupplement, type SupplementRequest } from '../FeishuCollection/service';
import styles from './index.module.less';

type Props = { projectId: string; assetIds: (number | string)[]; disabled: boolean };

/** 仅在已有项目会话中提供补充入口；项目或会话变化时重置整个弹窗状态。 */
export default function FeishuSupplementEntry(props: Props) {
  const location = useLocation();
  const sessionId = new URLSearchParams(location.search).get('sessionId');
  if (!sessionId) return null;
  return <SupplementDialog key={`${props.projectId}:${sessionId}`} {...props} sessionId={sessionId} />;
}

/** 独立于聊天发送按钮；预览确认后才向用户选中的外部群发送。 */
function SupplementDialog({ projectId, assetIds, disabled, sessionId }: Props & { sessionId: string }) {
  const [messageApi, messageContext] = message.useMessage();
  const [modal, modalContext] = Modal.useModal();
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<FeishuGroup[]>([]);
  const [history, setHistory] = useState<FeishuSupplement[]>([]);
  const [bindingId, setBindingId] = useState<string>();
  const [body, setBody] = useState('');
  const [draftId, setDraftId] = useState<string>();
  const [preview, setPreview] = useState(false);
  const [tab, setTab] = useState('compose');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [unknown, setUnknown] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [replyRequest, setReplyRequest] = useState<string>();
  const [replies, setReplies] = useState<FeishuReceipt[]>([]);
  const [replyError, setReplyError] = useState('');
  const [replyLoading, setReplyLoading] = useState(false);
  // 保留首次确认的目标、正文、资料引用和请求键；结果未知时不能换内容重新发送。
  const pending = useRef<SupplementRequest>();
  const mounted = useRef(true);
  const text = I18N.feishuCollection;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetchFeishuCapability(projectId, controller.signal).then(result => {
      if (!controller.signal.aborted) setEnabled(result.enabled);
    }).catch(() => { if (!controller.signal.aborted) setEnabled(false); });
    return () => controller.abort();
  }, [projectId]);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    Promise.all([fetchFeishuGroups(projectId, controller.signal), fetchFeishuSupplements(projectId, sessionId, controller.signal)]).then(([nextGroups, requests]) => {
      if (controller.signal.aborted) return;
      setGroups(nextGroups);
      setHistory(requests);
      const available = nextGroups.filter(group => group.status === 'ACTIVE');
      if (available.length === 1) setBindingId(current => current || available[0].bindingId);
    }).catch(failure => { if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : text.loadFailed); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [open, projectId, sessionId, refresh, text.loadFailed]);
  useEffect(() => {
    if (!replyRequest) return;
    const controller = new AbortController();
    setReplyLoading(true);
    setReplies([]);
    setReplyError('');
    fetchFeishuReplies(projectId, replyRequest, controller.signal).then(result => {
      if (!controller.signal.aborted) setReplies(result);
    }).catch(failure => { if (!controller.signal.aborted) setReplyError(failure instanceof Error ? failure.message : text.loadFailed); })
      .finally(() => { if (!controller.signal.aborted) setReplyLoading(false); });
    return () => controller.abort();
  }, [projectId, replyRequest, text.loadFailed]);

  /** 提交已预览的文字；只有明确返回 SENT 才清空草稿并展示发送成功。 */
  const send = async () => {
    if (busy || !bindingId || !body.trim()) return;
    pending.current ??= { clientRequestId: nanoid(32), bindingId, sourceSessionId: sessionId,
      text: body, assetIds: [...assetIds], confirmed: true };
    setBusy(true);
    setError('');
    try {
      const result = draftId ? await confirmFeishuDraft(projectId, draftId, pending.current.text)
        : await sendFeishuSupplement(projectId, pending.current);
      if (!mounted.current) return;
      setHistory(current => [result, ...current.filter(item => item.requestId !== result.requestId)]);
      setUnknown(result.status !== 'SENT');
      if (result.status === 'SENT') {
        pending.current = undefined;
        setBody('');
        setDraftId(undefined);
        setPreview(false);
        setTab('history');
        messageApi.success(text.sentHint);
      }
    } catch (failure) {
      if (mounted.current) { setUnknown(true); setError(failure instanceof Error ? failure.message : text.operationFailed); }
    } finally { if (mounted.current) setBusy(false); }
  };
  if (!enabled) return null;
  const selectedGroup = groups.find(group => group.bindingId === bindingId);
  return <>
    {messageContext}{modalContext}
    <Button type='text' className={styles.entry} disabled={disabled} onClick={() => setOpen(true)}>{text.supplement}</Button>
    <Modal title={<div className={styles.title}><MessageOutlined />{text.supplement}</div>} className={styles.dialog}
      open={open} width={640} centered keyboard={!busy} maskClosable={!busy} closable={!busy} onCancel={() => { if (!busy) setOpen(false); }}
      footer={tab === 'compose' ? <div className={styles.actions}>
        <Button disabled={busy} onClick={() => setOpen(false)}>{text.cancel}</Button>
        {preview && !pending.current && <Button onClick={() => setPreview(false)} disabled={busy}>{text.edit}</Button>}
        {preview ? <Button type='primary' icon={<SendOutlined />} loading={busy} onClick={send}>{pending.current ? text.recover : text.confirmSend}</Button>
          : <Button type='primary' disabled={loading || !body.trim() || selectedGroup?.status !== 'ACTIVE'} onClick={() => setPreview(true)}>{text.preview}</Button>}
      </div> : null}>
      <div className={styles.content}>
        {error && <Alert type='error' showIcon message={error} />}
        {unknown && <Alert type='warning' showIcon message={text.sendUnknownHint} />}
        <Tabs activeKey={tab} onChange={setTab} items={[
          { key: 'compose', label: text.composeRequest },
          { key: 'history', label: <span>{text.requestHistory}<span className={styles.count}>{history.length}</span></span> },
        ]} />
        <div hidden={tab !== 'compose'} className={styles.compose}>
        <Spin spinning={loading}>
          <p className={styles.intro}>{preview ? text.previewHint : text.supplementHint}</p>
          <label className={styles.label} htmlFor='feishu-target-group'>{text.targetGroup}</label>
          <Select id='feishu-target-group' placeholder={text.chooseGroup} className={styles.select} value={bindingId} disabled={preview || busy || Boolean(pending.current) || Boolean(draftId)}
            onChange={setBindingId} options={groups.filter(group => group.status === 'ACTIVE').map(group => ({ value: group.bindingId, label: group.name }))} />
          {!loading && !groups.some(group => group.status === 'ACTIVE') && <p>{text.noActiveGroup}</p>}
          {preview ? <h3 className={styles.label}>{text.preview}</h3> : <label className={styles.label} htmlFor='feishu-message-text'>{text.messageText}</label>}
          {preview ? <div className={styles.preview}><strong>{selectedGroup?.name}</strong><p>{body}</p></div>
            : <Input.TextArea id='feishu-message-text' autoSize={{ minRows: 4, maxRows: 8 }} placeholder={text.messagePlaceholder} maxLength={4000} showCount value={body} disabled={busy || Boolean(pending.current)} onChange={event => setBody(event.target.value)} />}
          {!draftId && (pending.current?.assetIds.length ?? assetIds.length) > 0 && <p className={styles.meta}>{I18N.template(text.selectedReferences, { val1: pending.current?.assetIds.length ?? assetIds.length })}</p>}
        </Spin>
        </div>
        <div hidden={tab !== 'history'} className={styles.history}>
        <div className={styles.historyHeading}><h3>{text.history}</h3><Button disabled={busy || loading} onClick={() => setRefresh(current => current + 1)}>{text.refresh}</Button></div>
        {!loading && !history.length && <Empty description={text.noRequests} />}
        {history.map(item => <section key={item.requestId} className={styles.record}>
          <div className={styles.recordHeading}><strong>{groups.find(group => group.bindingId === item.bindingId)?.name || item.bindingId}</strong>
          <Tag color={item.status === 'SENT' ? 'green' : 'orange'}>{item.status === 'DRAFT' ? text.draft : item.status === 'SENT' ? text.sent : item.status === 'PENDING' ? text.sendPending : text.sendUnknown}</Tag>
          </div><p className={styles.recordText}>{item.text}</p><div className={styles.recordFooter}><time className={styles.meta}>{dayjs(item.createTime).format('YYYY-MM-DD HH:mm')}</time>
          {item.status === 'SENT' && <Button onClick={() => setReplyRequest(item.requestId)}>{text.viewReplies}</Button>}
          {item.status === 'DRAFT' && <Button disabled={busy || Boolean(pending.current)} onClick={() => {
            setDraftId(item.requestId); setBindingId(item.bindingId); setBody(item.text); setPreview(false); setUnknown(false); setError(''); setTab('compose');
          }}>{text.reviewDraft}</Button>}
          {item.status !== 'SENT' && item.status !== 'DRAFT' && <Button disabled={busy} onClick={() => modal.confirm({ title: text.recover,
            content: text.sendUnknownHint, okText: text.confirm, cancelText: text.cancel, onOk: async () => {
              setBusy(true);
              try {
                const result = await recoverFeishuSupplement(projectId, item.requestId);
                if (mounted.current) setHistory(current => current.map(row => row.requestId === result.requestId ? result : row));
              } catch (failure) {
                if (mounted.current) setError(failure instanceof Error ? failure.message : text.operationFailed);
              } finally { if (mounted.current) setBusy(false); }
            } })}>{text.recover}</Button>}
          </div>
        </section>)}
        </div>
      </div>
    </Modal>
    <Modal title={text.replies} open={Boolean(replyRequest)} footer={null} onCancel={() => setReplyRequest(undefined)}>
      <Spin spinning={replyLoading}>
        {replyError && <Alert type='error' showIcon message={replyError} />}
        {!replyLoading && !replyError && !replies.length && <Empty description={text.noReplies} />}
        {replies.map(reply => <div className={styles.record} key={reply.receiptId}>
          <strong>{reply.fileName || text.replyText}</strong><p>{dayjs(reply.sentAt).format('YYYY-MM-DD HH:mm')}</p>
          {reply.messageType === 'text' && <p>{readText(reply.content)}</p>}
        </div>)}
      </Spin>
    </Modal>
  </>;
}

/** 提取飞书文字消息正文，历史非 JSON 内容按原文保留。 */
function readText(content: string) {
  try {
    const parsed: unknown = JSON.parse(content);
    return parsed && typeof parsed === 'object' && 'text' in parsed && typeof parsed.text === 'string' ? parsed.text : '';
  } catch { return content; }
}
