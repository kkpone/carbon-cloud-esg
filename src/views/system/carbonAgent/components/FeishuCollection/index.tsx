import { Alert, Button, Checkbox, Drawer, Form, Input, Modal, Spin, Switch, Tag, message } from 'antd';
import { FolderOpenOutlined, PlusOutlined, RobotOutlined, UserOutlined } from '@ant-design/icons';
import { useEffect, useRef, useState } from 'react';
import { nanoid } from 'nanoid';
import { useMobile } from '@/hooks/use-mobile';
import I18N from '@/lang/I18N';
import {
  changeFeishuGroup, createFeishuGroup, fetchFeishuCapability, fetchFeishuGroups, updateFeishuGroup,
  type CreateGroup, type FeishuCapability, type FeishuGroup,
} from './service';
import styles from './index.module.less';
import ReceiptList from './components/ReceiptList';

/** 入口以服务端企业白名单和项目创建者校验结果为准，管理员角色不能替代创建者。 */
export default function FeishuCollection({ projectId, projectName, onChanged }: { projectId: string; projectName: string; onChanged?: () => void }) {
  const [messageApi, messageContext] = message.useMessage();
  const [modal, modalContext] = Modal.useModal();
  const [capability, setCapability] = useState<FeishuCapability>();
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<FeishuGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [receiptGroup, setReceiptGroup] = useState<FeishuGroup>();
  const [editing, setEditing] = useState<FeishuGroup>();
  const [editForm] = Form.useForm<{ name: string; description?: string }>();
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [form] = Form.useForm<Omit<CreateGroup, 'requestId' | 'billingCompanyId'> & { accepted: boolean }>();
  const createRequest = useRef<CreateGroup>();
  const mounted = useRef(true);
  const isMobile = useMobile();
  const text = I18N.feishuCollection;
  const ownerPlans: Record<string, string> = { HOST: text.ownerIsHost, INTERNAL: text.ownerWillTransfer };
  const ownerPlan = ownerPlans[capability?.ownerMatchStatus || ''] || text.ownerNotConfirmed;
  const transferLabels: Record<string, string> = {
    DIRECT_PENDING: text.ownerDirectPending, NONE: text.ownerKept, PENDING: text.ownerTransferPending, CONFIRMED: text.ownerTransferDone,
    RETRY: text.ownerTransferRetry, REVIEW: text.ownerTransferReview,
  };
  const groupOwnerName = (group: FeishuGroup) => {
    if (group.ownerOpenId === group.responsibleOpenId) return group.responsibleName || '—';
    if (group.ownerOpenId === group.initialOwnerOpenId) return text.fixedHost;
    return text.ownerCheckInFeishu;
  };
  const activeCount = groups.filter(group => group.status === 'ACTIVE').length;
  const labels: Record<FeishuGroup['status'], string> = {
    PENDING: text.pending, CREATING: text.creating, CREATE_UNKNOWN: text.unknown,
    VERIFY_PENDING: text.verify, ACTIVE: text.active, PAUSED: text.paused, UNBOUND: text.unbound,
  };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setCapability(undefined);
    fetchFeishuCapability(projectId, controller.signal).then(value => {
      if (!controller.signal.aborted) setCapability(value);
    }).catch(() => {
      // 未确认开通时不显示入口；不影响原有项目会话和资料入口。
      if (!controller.signal.aborted) setCapability(undefined);
    });
    return () => controller.abort();
  }, [projectId, refresh]);

  useEffect(() => {
    if (!capability?.enabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetchFeishuGroups(projectId, controller.signal).then(value => {
      if (!controller.signal.aborted) setGroups(value);
    }).catch(failure => {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : text.loadFailed);
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [open, capability?.enabled, projectId, refresh, text.loadFailed]);

  /** 用服务端回执更新单个群；解绑后从当前管理列表移除。 */
  const applyGroup = (group: FeishuGroup) => {
    setGroups(current => [group, ...current.filter(item => item.bindingId !== group.bindingId)]
      .filter(item => item.status !== 'UNBOUND'));
    onChanged?.();
  };

  /** 仅为新建意图填入默认值，保留尚未完成请求的原表单及请求键。 */
  const startCreating = () => {
    if (!createRequest.current && !form.isFieldsTouched()) {
      form.setFieldsValue({ name: I18N.template(text.defaultGroupName, { val1: projectName }) });
    }
    setError('');
    setCreating(true);
  };

  /** 按页面持有的版本操作群绑定，失败时显示服务端核对提示。 */
  const act = async (group: FeishuGroup, action: 'pause' | 'resume' | 'unbind' | 'recover') => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await changeFeishuGroup(projectId, group, action);
      if (mounted.current) applyGroup(result);
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : text.operationFailed);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  /** 校验用户确认后固定建群参数；只在取得绑定回执后结束本次建群意图。 */
  const submit = async () => {
    if (busy || !capability?.billingCompanyId) return;
    const values = await form.validateFields().catch(() => undefined);
    if (!values) return;
    // 超时重试保留完整请求及请求ID，不允许以新参数重放原意图。
    createRequest.current ??= {
      requestId: nanoid(32), name: values.name.trim(), description: values.description,
      billingCompanyId: capability.billingCompanyId,
    };
    setBusy(true);
    setError('');
    try {
      const result = await createFeishuGroup(projectId, createRequest.current);
      if (!mounted.current) return;
      applyGroup(result);
      setCreating(false);
      createRequest.current = undefined;
      form.resetFields();
      if (result.status === 'ACTIVE') messageApi.success(text.created);
    } catch (failure) {
      if (mounted.current) setError(failure instanceof Error ? failure.message : text.operationFailed);
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  if (!capability?.enabled) return null;
  return <>
    {messageContext}{modalContext}
    <button type='button' aria-label={text.title} className={groups.length ? styles.enabledEntry : undefined} onClick={() => setOpen(true)}>
      <FolderOpenOutlined />{text.title}{groups.length > 0 && <span className={styles.entryStatus}>{activeCount ? text.active : labels[groups[0].status]}</span>}
    </button>
    <Modal title={<div className={styles.modalTitle}>{text.title}{activeCount > 0 && <span className={styles.countBadge}>{I18N.template(text.collectingCount, { val1: activeCount })}</span>}</div>}
      open={open && !creating} width={800} centered footer={null} className={styles.dialog}
      onCancel={() => { if (!busy) setOpen(false); }} keyboard={!busy} maskClosable={!busy} closable={!busy}>
      <div className={styles.content}>
        {!capability.configured && <Alert type='warning' showIcon message={text.notConfigured} />}
        <div className={styles.toolbar}>
          <strong>{I18N.template(text.boundCount, { val1: groups.length })}</strong>
          <div className={styles.actions}>
            <Button disabled={busy || loading} onClick={() => setRefresh(value => value + 1)}>{text.refresh}</Button>
            <Button type='primary' icon={<PlusOutlined />} disabled={!capability.configured || busy || loading} onClick={startCreating}>{groups.length ? text.createMore : text.create}</Button>
          </div>
        </div>
        <div className={styles.intro}><p>{groups.length ? text.connectedHint : text.description}</p></div>
        {error && <Alert className={styles.error} type='error' showIcon message={error} />}
        <Spin spinning={loading}>
          {!loading && !error && !groups.length && <div className={styles.empty}>{text.empty}</div>}
          {groups.map((group, index) => <section className={styles.group} key={group.bindingId}>
            <div className={styles.heading}>
              <div className={styles.groupName}><span className={styles.ordinal}>{index + 1}</span><h3>{group.name}</h3></div>
              {['ACTIVE', 'PAUSED'].includes(group.status) ? <div className={styles.toggle}>{text.autoCollect}
                <Switch aria-label={text.autoCollect} size='small' checked={group.status === 'ACTIVE'} disabled={busy} onChange={checked => {
                  if (checked) act(group, 'resume');
                  else modal.confirm({ title: text.pause, content: text.pauseHint, okText: text.confirm, cancelText: text.cancel, onOk: () => act(group, 'pause') });
                }} /></div> : <Tag>{labels[group.status]}</Tag>}
            </div>
            {group.description && <p className={styles.groupDescription}>{group.description}</p>}
            <p className={styles.meta}>{I18N.template(group.ownerMatchStatus ? text.responsibleValue : text.legacyResponsibleValue, { val1: group.responsibleName || '—' })}</p>
            {group.ownerTransferStatus && <p className={styles.notice}>{transferLabels[group.ownerTransferStatus] || text.ownerTransferReview}</p>}
            {group.ownerOpenId && <p className={styles.meta}>{I18N.template(text.actualGroupOwner, {
              val1: groupOwnerName(group),
            })}</p>}
            <div className={styles.memberSection}><span className={styles.meta}>{text.configuredMembers}</span>
              <div className={styles.members}><span className={styles.bot}><RobotOutlined />{text.botName}<small>{text.botRole}</small></span>
                {group.ownerTransferStatus === 'CONFIRMED' && <span><UserOutlined />{group.responsibleName}<small>{text.projectOwner}</small></span>}
                {!group.ownerMatchStatus && group.responsibleName && <span><UserOutlined />{group.responsibleName}<small>{text.businessRole}</small></span>}
                <span>{text.fixedHost}</span><span>{text.fixedHelper}</span></div>
              <p className={styles.memberHint}>{text.memberHint}</p>
            </div>
            {['CREATE_UNKNOWN', 'VERIFY_PENDING', 'CREATING', 'PENDING'].includes(group.status) && <p className={styles.notice}>{text.recoverHint}</p>}
            {group.status === 'PAUSED' && <p className={styles.notice}>{text.pauseHint}</p>}
            <div className={styles.groupActions}>
              <div className={styles.actions}>
              <Button onClick={() => setReceiptGroup(group)}>{text.receipts}</Button>
              {['ACTIVE', 'PAUSED'].includes(group.status) && <Button disabled={busy} onClick={() => {
                editForm.setFieldsValue({ name: group.name, description: group.description }); setEditing(group);
              }}>{text.editGroup}</Button>}
              {['CREATE_UNKNOWN', 'VERIFY_PENDING', 'CREATING', 'PENDING'].includes(group.status) && <Button disabled={busy} onClick={() => act(group, 'recover')}>{text.recover}</Button>}
              {['ACTIVE', 'PAUSED'].includes(group.status) && ['PENDING', 'RETRY'].includes(group.ownerTransferStatus || '')
                && <Button disabled={busy} onClick={() => act(group, 'recover')}>{text.retryOwnerTransfer}</Button>}
              {group.status !== 'CREATING' && <Button danger disabled={busy} onClick={() => modal.confirm({ title: text.unbind, content: text.unbindHint, okText: text.confirm, cancelText: text.cancel, onOk: () => act(group, 'unbind') })}>{text.unbind}</Button>}
              </div>
              {group.chatId && <Button type='primary' href={`https://applink.feishu.cn/client/chat/open?openChatId=${encodeURIComponent(group.chatId)}`} target='_blank' rel='noopener noreferrer'>{text.openGroup}</Button>}
            </div>
          </section>)}
        </Spin>
        <p className={styles.footerHint}>{text.offline}</p>
      </div>
    </Modal>
    <Drawer title={receiptGroup ? I18N.template(text.groupReceipts, { val1: receiptGroup.name }) : text.receipts}
      open={Boolean(receiptGroup)} width={isMobile ? '100%' : 640} onClose={() => setReceiptGroup(undefined)} destroyOnClose>
      {receiptGroup && <ReceiptList key={receiptGroup.bindingId} projectId={projectId} bindingId={receiptGroup.bindingId} onChanged={onChanged} />}
    </Drawer>
    <Modal title={<div className={styles.modalTitle}>{text.title}</div>} open={open && creating} confirmLoading={busy} closable={!busy} centered width={760} className={`${styles.dialog} ${styles.createDialog}`} keyboard={!busy}
      maskClosable={false} okText={createRequest.current ? text.recover : text.confirmCreate}
      cancelText={text.cancel} onOk={submit} onCancel={() => { if (!busy) setCreating(false); }}>
      <div className={styles.projectStrip}>{I18N.template(text.currentProject, { val1: projectName })}</div>
      <div className={styles.intro}><p>{text.createHint}</p></div>
      <Form name='feishu-create-group' form={form} layout='vertical' className={styles.form} disabled={busy || Boolean(createRequest.current)}>
        <Form.Item name='name' label={text.name} rules={[{ required: true, whitespace: true, message: text.required }]}><Input maxLength={60} /></Form.Item>
        <Form.Item name='description' label={text.groupDescription}><Input.TextArea autoSize={{ minRows: 1, maxRows: 3 }} maxLength={200} placeholder={text.descriptionPlaceholder} /></Form.Item>
        <p>{I18N.template(text.responsibleValue, { val1: capability.projectOwnerName || '—' })}</p>
        <Alert type='info' showIcon message={ownerPlan} />
        <div className={styles.memberSection}><p className={styles.memberLabel}>{text.autoMembers}</p><div className={styles.members}>
          <span className={styles.bot}><RobotOutlined />{text.botName}<small>{text.botRole}</small></span>
          {capability.ownerMatchStatus === 'INTERNAL' && <span><UserOutlined />{capability.projectOwnerName}<small>{text.projectOwner}</small></span>}
          <span>{text.fixedHost}</span><span>{text.fixedHelper}</span>
        </div></div>
        <div className={styles.billingBox}>
        <p className={styles.payer}>{I18N.template(text.payer, { val1: capability.billingCompanyName || String(capability.billingCompanyId) })}</p>
        <Form.Item name='accepted' valuePropName='checked' rules={[{ validator: (_, value) => value ? Promise.resolve() : Promise.reject(new Error(text.acceptRequired)) }]}><Checkbox>{text.billing}</Checkbox></Form.Item>
        </div>
        <p className={styles.footerHint}>{text.offline}</p>
      </Form>
      {error && <Alert type='error' showIcon message={error} />}
    </Modal>
    <Modal title={text.editGroup} open={Boolean(editing)} confirmLoading={busy} closable={!busy} maskClosable={false}
      okText={text.save} cancelText={text.cancel} onCancel={() => { if (!busy) setEditing(undefined); }} onOk={async () => {
        if (!editing || busy) return;
        const values = await editForm.validateFields().catch(() => undefined);
        if (!values) return;
        setBusy(true); setError('');
        try {
          const result = await updateFeishuGroup(projectId, editing, values);
          if (mounted.current) { applyGroup(result); setEditing(undefined); }
        } catch (failure) {
          if (mounted.current) setError(failure instanceof Error ? failure.message : text.operationFailed);
        } finally { if (mounted.current) setBusy(false); }
      }}>
      <Form name='feishu-edit-group' form={editForm} layout='vertical' disabled={busy} className={styles.form}>
        <Form.Item name='name' label={text.name} rules={[{ required: true, whitespace: true, message: text.required }]}><Input maxLength={60} /></Form.Item>
        <Form.Item name='description' label={text.groupDescription}><Input.TextArea rows={3} maxLength={200} showCount /></Form.Item>
      </Form>
      {error && <Alert type='error' showIcon message={error} />}
    </Modal>
  </>;
}
