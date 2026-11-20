import { Button, Form, Input, Tag, message } from 'antd';
import { useEffect, useState } from 'react';
import I18N from '@/lang/I18N';
import { getUserInfo } from '@/utils';
import { copyToClipboard } from '@/utils/clipboard';
import { call, mutation, prefix, statusLabel } from '../../service';
import type { Link, Me, Overview } from '../../types';
import RegistrationFeedback from '../RegistrationFeedback';
import RegistrationConsent from '../RegistrationConsent';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
const d = t.design;
type Props = {
  event: Overview;
  me?: Me;
  busy: boolean;
  run: (action: () => Promise<unknown>) => Promise<void>;
  onBack: () => void;
  onTasks: () => void;
  onError: (error: string) => void;
};
export default function IndividualRegistration({
  event,
  me,
  busy,
  run,
  onBack,
  onTasks,
  onError,
}: Props) {
  const [form] = Form.useForm<{ mobile: string }>();
  const [agreed, setAgreed] = useState(false);
  useEffect(() => setAgreed(false), [event.id, me?.participant?.id]);
  const [success, setSuccess] = useState(false);
  const [copying, setCopying] = useState(false);
  const person = me?.participant;
  const registered = person?.status === 'REGISTERED';
  const canRegister =
    !person || ['PROFILE_ONLY', 'REMOVED'].includes(person.status);
  const account = getUserInfo()?.userInfo;
  const copy = () => {
    if (copying) return;
    setCopying(true);
    copyToClipboard(
      call<Link>(
        `${prefix(event.id)}/invites/link`,
        mutation(event.code, person?.version),
      ).then(value => value.inviteUrl),
    )
      .then(() => {
        message.success(t.copied);
        setSuccess(false);
      })
      .catch(e => onError(e instanceof Error ? e.message : t.failed))
      .finally(() => setCopying(false));
  };
  return (
    <section
      className={`${styles.panel} ${registered ? styles.registered : ''}`}
    >
      <header className={styles.heading}>
        <h1>{d.participationInfo}</h1>
        {registered && (
          <Tag bordered={false} color='success'>
            {d.individualRegistered}
          </Tag>
        )}
      </header>
      {canRegister && <p className={styles.hint}>{d.individualAccountHint}</p>}
      <dl className={styles.details}>
        <div>
          <dt>{d.participantAccount}</dt>
          <dd>
            {person?.realName ||
              account?.user?.nickName ||
              account?.nickName ||
              account?.username ||
              '—'}
          </dd>
        </div>
        {!canRegister && (
          <div>
            <dt>{t.mobile}</dt>
            <dd>
              {person?.mobile || person?.mobileMasked || account?.mobile || '—'}
            </dd>
          </div>
        )}
      </dl>
      {canRegister && (
        <Form
          form={form}
          className={styles.contactForm}
          layout='vertical'
          initialValues={{ mobile: person?.mobile || account?.mobile }}
          disabled={busy}
        >
          <Form.Item
            name='mobile'
            label={t.mobile}
            rules={[
              { required: true, message: d.registrationMobileRequired },
              { pattern: /^1[0-9]{10}$/, message: d.registrationMobileInvalid },
            ]}
            extra={d.registrationMobileHint}
          >
            <Input
              type='tel'
              autoComplete='tel-national'
              maxLength={11}
              disabled={busy || !!person}
              placeholder={d.registrationMobileRequired}
            />
          </Form.Item>
        </Form>
      )}
      {!canRegister && !registered && (
        <p role='status'>{statusLabel(person?.status)}</p>
      )}
      {canRegister && (
        <RegistrationConsent
          event={event}
          checked={agreed}
          onChange={setAgreed}
          disabled={busy}
        />
      )}
      {canRegister && (
        <div className={styles.actions}>
          <Button onClick={onBack}>{d.previous}</Button>
          <Button
            type='primary'
            loading={busy}
            disabled={!event.registrationAvailable || !agreed}
            onClick={() =>
              run(async () => {
                if (!agreed) throw new Error(d.legal.required);
                const values = await form.validateFields();
                await call<Me>(`${prefix(event.id)}/registrations/individual`, {
                  ...mutation(event.code, person?.version),
                  mobile: values.mobile,
                });
                setSuccess(true);
              })
            }
          >
            {d.individualConfirm}
          </Button>
        </div>
      )}
      <RegistrationFeedback
        open={success}
        kind='individual'
        benefitStatus={me?.benefit.status}
        onClose={() => setSuccess(false)}
        onInvite={copy}
        onTasks={() => {
          setSuccess(false);
          onTasks();
        }}
      />
    </section>
  );
}
