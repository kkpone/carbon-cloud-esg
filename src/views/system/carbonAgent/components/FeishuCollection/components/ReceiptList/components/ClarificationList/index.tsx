import { Alert, Button, Collapse, Form, Input, Select } from 'antd';
import { useEffect, useState } from 'react';
import I18N from '@/lang/I18N';
import { confirmFeishuClarification, fetchFeishuClarifications, refreshFeishuClarification, type FeishuClarification } from '../../../../service';
import styles from './index.module.less';

type Selection = { target: string; relation: 'supplement' | 'filter' | 'replacement'; reason: string };

/** 消息正文保留原文，飞书 JSON 封套只取已有 text，不改写用户说明。 */
function readOriginalText(content: string) {
  try {
    const value: unknown = JSON.parse(content);
    return value && typeof value === 'object' && 'text' in value && typeof value.text === 'string' ? value.text : content;
  } catch { return content; }
}

/** 原收件页面内确认补充目标，不默认选第一项，不修改或删除历史资料。 */
export default function ClarificationList({ projectId, bindingId, revision }: {
  projectId: string; bindingId: string; revision: number;
}) {
  const [rows, setRows] = useState<FeishuClarification[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const text = I18N.feishuCollection;
  useEffect(() => {
    const controller = new AbortController();
    setRows([]);
    setError('');
    fetchFeishuClarifications(projectId, bindingId, controller.signal).then(value => {
      if (!controller.signal.aborted) setRows(value);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : text.loadFailed);
    });
    return () => controller.abort();
  }, [projectId, bindingId, revision, text.loadFailed]);

  const confirm = async (row: FeishuClarification, values: Selection) => {
    setBusy(row.queryRef);
    setError('');
    try {
      const result = await confirmFeishuClarification(projectId, bindingId, row.queryRef, {
        candidateRef: values.target === 'new_material' ? undefined : values.target,
        newMaterial: values.target === 'new_material', relation: values.relation,
        reason: row.status === 'REVISION_PENDING' ? values.reason : values.reason.trim(),
      });
      if (values.target !== 'new_material' && result.status !== 'linked') {
        setError(result.reason || text.operationFailed);
        setRows(await fetchFeishuClarifications(projectId, bindingId));
        return;
      }
      setRows(current => current.filter(item => item.queryRef !== row.queryRef));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : text.operationFailed);
    } finally { setBusy(''); }
  };

  const refresh = async (row: FeishuClarification) => {
    setBusy(row.queryRef);
    setError('');
    try {
      await refreshFeishuClarification(projectId, bindingId, row.queryRef);
      setRows(await fetchFeishuClarifications(projectId, bindingId));
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : text.operationFailed);
    } finally { setBusy(''); }
  };

  if (!rows.length && !error) return null;
  return <section className={styles.content}>
    {error && <Alert type='error' showIcon message={error} />}
    {rows.length > 0 && <>
      <h3>{rows.every(row => row.status === 'REVISION_PENDING') ? text.scopePendingTitle : text.clarificationTitle}</h3>
      {rows.some(row => row.status !== 'REVISION_PENDING') && <p>{text.clarificationHint}</p>}
      <Collapse items={rows.map(row => {
        const scopePending = row.status === 'REVISION_PENDING';
        const stale = row.status === 'STALE';
        return { key: row.queryRef, label: row.queryText,
        children: <Form<Selection> key={`${row.queryRef}:${row.status}`} layout='vertical' initialValues={scopePending
          ? { target: row.candidateRef, relation: row.relation, reason: row.reason }
          : { relation: 'supplement' }} onFinish={values => confirm(row, values)}>
          {scopePending && <Alert type='warning' showIcon message={text.scopePendingHint} className={styles.notice} />}
          {stale && <Alert type='warning' showIcon message={text.clarificationStale} className={styles.notice}
            description={<Button onClick={() => refresh(row)} loading={busy === row.queryRef} disabled={Boolean(busy)}>{text.refreshClarification}</Button>} />}
          <div className={styles.sources}>
            {row.sources?.map(source => <div key={source.receiptId}>
              <strong>{source.fileName || text.groupContext}</strong>
              {!source.fileName && source.content && <p>{readOriginalText(source.content)}</p>}
              <small>{source.receivedAt}</small>
            </div>)}
          </div>
          {row.truncated && <Alert type='warning' showIcon message={text.clarificationTruncated} className={styles.notice} />}
          <Form.Item name='target' label={text.clarificationTarget} rules={[{ required: true, message: text.required }]}>
            <Select disabled={scopePending} placeholder={text.clarificationChoose} options={[
              ...(stale ? [] : row.candidates).map(candidate => ({ value: candidate.candidateRef, label: candidate.summary })),
              { value: 'new_material', label: text.clarificationNew },
            ]} />
          </Form.Item>
          <Form.Item name='relation' label={text.clarificationRelation}>
            <Select disabled={scopePending || stale} options={[
              { value: 'supplement', label: text.clarificationSupplement },
              { value: 'filter', label: text.clarificationFilter },
              { value: 'replacement', label: text.clarificationReplacement },
            ]} />
          </Form.Item>
          <Form.Item name='reason' label={text.clarificationReason} rules={[{ required: true, whitespace: true, message: text.required }]}>
            <Input.TextArea readOnly={scopePending} autoSize={{ minRows: 2, maxRows: 4 }} maxLength={2048} showCount />
          </Form.Item>
          <div className={styles.actions}><Button htmlType='submit' type='primary' loading={busy === row.queryRef} disabled={Boolean(busy)}>{scopePending ? text.applyPendingScope : text.confirm}</Button></div>
        </Form>,
      }; })} />
    </>}
  </section>;
}
