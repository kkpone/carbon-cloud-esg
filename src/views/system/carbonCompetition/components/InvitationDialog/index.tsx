import { useEffect, useState } from 'react';
import { Alert, Button, Form, Input, Modal } from 'antd';
import dayjs from 'dayjs';
import I18N from '@/lang/I18N';
import background from '@/assets/images/carbonCompetition/invite-background.webp';
import closeWhite from '@/assets/images/carbonCompetition/invite-close-white.svg';
import closeIcon from '@/assets/images/carbonCompetition/invite-close.svg';
import enterpriseArt from '@/assets/images/carbonCompetition/invite-enterprise.webp';
import independentArt from '@/assets/images/carbonCompetition/invite-independent.webp';
import selectedIcon from '@/assets/images/carbonCompetition/invite-selected.svg';
import unselectedIcon from '@/assets/images/carbonCompetition/invite-unselected.svg';
import warningIcon from '@/assets/images/carbonCompetition/invite-warning.svg';
import { getToken } from '@/utils/cookie';
import { getUserInfo } from '@/utils';
import { invitationHint } from '../../invitationHint';
import type { Landing, Overview } from '../../types';
import styles from './index.module.less';

type Props = {
  step?: 'welcome' | 'login' | 'choice' | 'confirm';
  landing: Landing;
  event?: Overview;
  error?: string;
  busy: boolean;
  onClose: () => void;
  onBack: () => void;
  onLearn: () => void;
  onAccept: () => void;
  onJoin: () => void;
  onConfirm: (mobile: string) => Promise<void>;
  initialMobile?: string;
  onIndependent: () => void;
};
export default function InvitationDialog({
  step,
  landing,
  event,
  error,
  busy,
  onClose,
  onBack,
  onLearn,
  onAccept,
  onJoin,
  onConfirm,
  initialMobile,
  onIndependent,
}: Props) {
  const d = I18N.carbonCompetition.design;
  const [form] = Form.useForm<{ mobile: string }>();
  useEffect(() => {
    if (step === 'confirm')
      form.setFieldsValue({
        mobile: initialMobile || getUserInfo()?.userInfo?.mobile,
      });
  }, [step, initialMobile, form]);
  const [choice, setChoice] = useState<'join' | 'independent'>('join');
  useEffect(() => {
    if (step === 'choice')
      setChoice(landing.canJoinTeam ? 'join' : 'independent');
  }, [step, landing.canJoinTeam]);
  const welcome = step === 'welcome';
  const confirm = step === 'confirm';
  const deadline = event?.phases.find(
    phase => phase.code === 'REGISTRATION',
  )?.closesAt;
  return (
    <Modal
      open={welcome || step === 'choice' || confirm}
      title={step === 'choice' ? d.invitationChoose : undefined}
      width={welcome ? 900 : confirm ? 576 : 568}
      footer={null}
      centered
      className={`${styles.modal} ${welcome ? styles.heroModal : ''}`}
      closeIcon={
        <img
          src={welcome ? closeWhite : closeIcon}
          width={16}
          height={16}
          alt=''
        />
      }
      onCancel={() => !busy && onClose()}
      closable={!busy}
      maskClosable={false}
    >
      {welcome && (
        <div className={styles.welcome}>
          <img className={styles.background} src={background} alt='' />
          <div className={styles.heroContent}>
            <p className={styles.inviter}>
              <strong>{landing.inviterName}</strong>
              <span>{d.invitationLead}</span>
            </p>
            <h2>{d.invitationCompetitionTitle}</h2>
            <p className={styles.description}>{d.invitationDescription}</p>
            <div className={styles.heroActions}>
              <Button type='primary' onClick={onAccept} loading={busy}>
                {d.invitationAccept}
              </Button>
              <Button onClick={onLearn}>{d.invitationLater}</Button>
            </div>
          </div>
        </div>
      )}
      {step === 'choice' && (
        <>
          <div
            className={styles.choices}
            role='radiogroup'
            aria-label={d.invitationChoose}
          >
            {(['join', 'independent'] as const).map(value => (
              <button
                key={value}
                type='button'
                role='radio'
                aria-checked={choice === value}
                className={`${styles.choice} ${
                  value === 'join' ? styles.enterprise : styles.independent
                }`}
                disabled={
                  busy ||
                  (value === 'join'
                    ? !landing.canJoinTeam
                    : !landing.registrationOpen)
                }
                onClick={() => setChoice(value)}
              >
                <img
                  className={styles.radio}
                  src={choice === value ? selectedIcon : unselectedIcon}
                  width={24}
                  height={24}
                  alt=''
                />
                <span className={styles.choiceCopy}>
                  <strong>
                    {value === 'join'
                      ? d.invitationJoin
                      : d.invitationIndependent}
                  </strong>
                  <span>
                    {value === 'join'
                      ? d.invitationJoinHint
                      : d.invitationIndependentHint}
                  </span>
                </span>
                <span className={styles.art}>
                  <img
                    src={value === 'join' ? enterpriseArt : independentArt}
                    alt=''
                  />
                </span>
              </button>
            ))}
          </div>
          {!landing.canJoinTeam && (
            <p className={styles.unavailable}>
              {invitationHint(
                landing,
                !!getToken(),
                event?.registrationAvailable,
              )}
            </p>
          )}
          <div className={styles.actions}>
            <Button onClick={onClose} disabled={busy}>
              {I18N.carbonCompetition.cancel}
            </Button>
            <Button
              type='primary'
              loading={busy}
              disabled={
                choice === 'join'
                  ? !landing.canJoinTeam
                  : !landing.registrationOpen
              }
              onClick={choice === 'join' ? onJoin : onIndependent}
            >
              {d.invitationContinue}
            </Button>
          </div>
        </>
      )}
      {confirm && (
        <div className={styles.confirm}>
          <h2>
            <img src={warningIcon} width={28} height={28} alt='' />
            <span>
              {I18N.template(d.invitationEmployeeTitle, {
                team: landing.teamName || '',
              })}
            </span>
          </h2>
          <p>{d.invitationEmployeeHint}</p>
          {deadline && (
            <p className={styles.deadline}>
              {I18N.template(d.invitationDeadline, {
                date: dayjs(deadline).format('YYYY-MM-DD HH:mm'),
              })}
            </p>
          )}
          <Form
            form={form}
            layout='vertical'
            onFinish={values => onConfirm(values.mobile)}
            disabled={busy}
          >
            <Form.Item
              name='mobile'
              label={I18N.carbonCompetition.mobile}
              rules={[
                { required: true, message: d.registrationMobileRequired },
                {
                  pattern: /^1[0-9]{10}$/,
                  message: d.registrationMobileInvalid,
                },
              ]}
              extra={d.registrationMobileHint}
            >
              <Input
                type='tel'
                autoComplete='tel-national'
                maxLength={11}
                disabled={busy || !!initialMobile}
                placeholder={d.registrationMobileRequired}
              />
            </Form.Item>
            {error && <Alert type='error' showIcon message={error} />}
            <div className={styles.actions}>
              <Button disabled={busy} onClick={onBack}>
                {d.invitationBack}
              </Button>
              <Button
                type='primary'
                loading={busy}
                disabled={!landing.canJoinTeam}
                htmlType='submit'
              >
                {d.invitationConfirm}
              </Button>
            </div>
          </Form>
        </div>
      )}
    </Modal>
  );
}
