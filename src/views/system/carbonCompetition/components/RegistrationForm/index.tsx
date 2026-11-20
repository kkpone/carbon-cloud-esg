import I18N from '@/lang/I18N';
import { getUserInfo } from '@/utils';
import { Button, Form, Input, Space, Tooltip } from 'antd';
import infoIcon from '@/assets/images/carbonCompetition/registration-info.svg';
import { useEffect, useState } from 'react';
import { call, mutation, prefix } from '../../service';
import type { FileRef, Me, Overview, Team } from '../../types';
import type { RegistrationTrack } from '../TrackCards';
import RegistrationAttachment from '../RegistrationAttachment';
import RegistrationSteps from '../RegistrationSteps';
import RegistrationFeedback from '../RegistrationFeedback';
import RegistrationConsent from '../RegistrationConsent';
import QualificationStatus from './components/QualificationStatus';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
const d = t.design;
type Props = {
  event: Overview;
  me?: Me;
  track: RegistrationTrack;
  busy: boolean;
  run: (operation: () => Promise<unknown>) => Promise<void>;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onBack: () => void;
  onRoster: () => void;
};
export default function RegistrationForm({
  event,
  me,
  track,
  busy,
  run,
  onRefresh,
  onError,
  onBack,
  onRoster,
}: Props) {
  const [agreed, setAgreed] = useState(false);
  useEffect(() => setAgreed(false), [event.id, me?.participant?.id]);
  const [license, setLicense] = useState<FileRef>();
  const [logo, setLogo] = useState<FileRef>();
  const [submitted, setSubmitted] = useState(false);
  const [uploads, setUploads] = useState({ LICENSE: false, LOGO: false });
  const uploading = uploads.LICENSE || uploads.LOGO;
  const [form] = Form.useForm<{
    enterpriseName: string;
    creditCode: string;
    mobile: string;
  }>();
  const team = me?.team;
  const captain = me?.participant?.role === 'CAPTAIN';
  const company = track === 'ENTERPRISE' || captain;
  const [editing, setEditing] = useState(false);
  const mayEdit = !team || team.allowedActions.includes('EDIT_QUALIFICATION');
  const editable =
    mayEdit && (team?.qualificationStatus !== 'REJECTED' || editing);
  useEffect(() => setEditing(false), [team?.id, team?.qualificationStatus]);
  const approved = team?.qualificationStatus === 'APPROVED';
  useEffect(() => {
    if (me?.team) {
      form.setFieldsValue({
        enterpriseName: me.team.enterpriseName,
        creditCode: me.team.creditCode,
        mobile: me.participant?.mobile,
      });
      setLicense(me.team.licenseFile);
      setLogo(me.team.logoFile);
    }
  }, [me?.team, form]);
  async function saveTeam(): Promise<Team> {
    const values = await form.validateFields();
    return call<Team>(
      prefix(event.id) + (team ? `/teams/${team.id}/draft` : '/teams'),
      {
        ...mutation(event.code, team?.version ?? me?.participant?.version),
        enterpriseName: values.enterpriseName.trim(),
        creditCode: values.creditCode.trim().toUpperCase(),
        mobile: values.mobile,
        licenseFile: license,
        logoFile: logo,
      },
    );
  }
  const submitTeam = () =>
    run(async () => {
      if (!agreed) throw new Error(d.legal.required);
      const saved = await saveTeam();
      await onRefresh();
      await call<Team>(
        `${prefix(event.id)}/teams/${saved.id}/qualification/submit`,
        mutation(event.code, saved.version),
      );
      setSubmitted(true);
    });
  return (
    <section className={styles.registration}>
      {company && (
        <RegistrationSteps
          current={1}
          onMembers={approved && !busy && !uploading ? onRoster : undefined}
        />
      )}
      <h1>{company ? d.companyInfo : d.individual}</h1>
      {!['PENDING_REVIEW', 'APPROVED', 'REJECTED'].includes(
        team?.qualificationStatus || '',
      ) && <p className={styles.hint}>{d.companyHint}</p>}
      <QualificationStatus
        status={team?.qualificationStatus}
        reason={team?.rejectReason}
        busy={busy}
        onRefresh={() => run(onRefresh)}
        onEdit={
          team?.qualificationStatus === 'REJECTED' && mayEdit && !editing
            ? () => setEditing(true)
            : undefined
        }
      />
      <Form
        form={form}
        initialValues={{
          mobile: me?.participant?.mobile || getUserInfo()?.userInfo?.mobile,
        }}
        layout='vertical'
        className={styles.form}
        disabled={busy}
      >
        {company && (
          <>
            <Form.Item
              name='mobile'
              label={t.mobile}
              rules={[
                { required: true, message: d.registrationMobileRequired },
                {
                  pattern: /^1[0-9]{10}$/,
                  message: d.registrationMobileInvalid,
                },
              ]}
              extra={editable ? d.registrationMobileHint : undefined}
            >
              <Input
                type='tel'
                autoComplete='tel-national'
                maxLength={11}
                disabled={busy || !editable || !!me?.participant}
                placeholder={d.registrationMobileRequired}
              />
            </Form.Item>
            <Form.Item
              name='enterpriseName'
              label={t.company}
              required={editable}
              rules={[{ required: true, whitespace: true, max: 200 }]}
            >
              <Input disabled={!editable} placeholder={d.companyPlaceholder} />
            </Form.Item>
            <Form.Item
              name='creditCode'
              label={t.credit}
              required={editable}
              validateTrigger='onBlur'
              rules={[
                { required: true, message: d.creditPlaceholder },
                { pattern: /^[0-9A-Za-z]{18}$/, message: d.creditInvalid },
              ]}
            >
              <Input
                disabled={!editable}
                maxLength={18}
                placeholder={d.creditPlaceholder}
              />
            </Form.Item>
            {(['LICENSE', 'LOGO'] as const).map(category => (
              <Form.Item
                key={category}
                required={editable}
                label={
                  category === 'LICENSE' ? (
                    t.license
                  ) : (
                    <Space size={6}>
                      {t.logo}
                      <Tooltip title={d.logoTooltip}>
                        <button
                          type='button'
                          className={styles.infoButton}
                          aria-label={d.logoTooltip}
                        >
                          <img src={infoIcon} alt='' />
                        </button>
                      </Tooltip>
                    </Space>
                  )
                }
              >
                <RegistrationAttachment
                  event={event}
                  category={category}
                  value={category === 'LICENSE' ? license : logo}
                  teamId={team?.id}
                  savedFileKey={
                    category === 'LICENSE'
                      ? team?.licenseFile?.fileKey
                      : team?.logoFile?.fileKey
                  }
                  disabled={!editable || busy}
                  onChange={category === 'LICENSE' ? setLicense : setLogo}
                  onUploadingChange={value =>
                    setUploads(current => ({ ...current, [category]: value }))
                  }
                  onError={onError}
                />
              </Form.Item>
            ))}
            {editable && (
              <RegistrationConsent
                event={event}
                checked={agreed}
                onChange={setAgreed}
                disabled={busy || uploading}
              />
            )}
            {(approved || editable) && (
              <div className={styles.actions}>
                {approved ? (
                  <Button
                    type='primary'
                    className={styles.nextAction}
                    onClick={onRoster}
                  >
                    {d.membersStep}
                  </Button>
                ) : (
                  <>
                    <Button onClick={onBack} disabled={uploading}>
                      {d.previous}
                    </Button>
                    {editable ? (
                      <Button
                        type='primary'
                        disabled={
                          !event.registrationAvailable ||
                          !agreed ||
                          !license ||
                          !logo ||
                          uploading
                        }
                        loading={busy}
                        onClick={submitTeam}
                      >
                        {t.submitQualification}
                      </Button>
                    ) : (
                      <Button loading={busy} onClick={() => run(onRefresh)}>
                        {t.retry}
                      </Button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </Form>
      <RegistrationFeedback
        open={submitted}
        kind='qualification'
        onClose={() => setSubmitted(false)}
      />
    </section>
  );
}
