import I18N from '@/lang/I18N';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { copyToClipboard } from '@/utils/clipboard';
import {
  Alert,
  Button,
  Checkbox,
  Input,
  Modal,
  Table,
  Tooltip,
  message,
} from 'antd';
import { useEffect, useRef, useState } from 'react';
import captainIcon from '@/assets/images/carbonCompetition/registration-captain.svg';
import memberIcon from '@/assets/images/carbonCompetition/registration-member.svg';
import giftIcon from '@/assets/images/carbonCompetition/registration-gift.svg';
import teamBonusIcon from '@/assets/images/carbonCompetition/registration-team-bonus.png';
import linkIcon from '@/assets/images/carbonCompetition/registration-link.svg';
import addIcon from '@/assets/images/carbonCompetition/registration-add.svg';
import brand from '@/assets/images/carbonCompetition/registration-brand.png';
import confirmIcon from '@/assets/images/carbonCompetition/registration-confirm.svg';
import closeIcon from '@/assets/images/carbonCompetition/registration-close.svg';
import { call, mutation, prefix } from '../../service';
import type { Change, Link, Overview, Participant, Team } from '../../types';
import RegistrationSteps from '../RegistrationSteps';
import RegistrationFeedback from '../RegistrationFeedback';
import RegistrationConsent from '../RegistrationConsent';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
const d = t.design;
type Row = Omit<Participant, 'accountRegistered'> & {
  accountRegistered?: boolean;
  fresh?: boolean;
  checking?: boolean;
  error?: string;
};
type Props = {
  event: Overview;
  team: Team;
  captain: boolean;
  busy: boolean;
  run: (operation: () => Promise<unknown>) => Promise<void>;
  onBack: () => void;
  onTasks: () => void;
};
export default function TeamRoster({
  event,
  team,
  captain,
  busy,
  run,
  onBack,
  onTasks,
}: Props) {
  const [agreed, setAgreed] = useState(false);
  useEffect(() => setAgreed(false), [event.id, team.id]);
  const [rows, setRows] = useState<Row[]>(team.members);
  const [removed, setRemoved] = useState<Change[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [employeeConfirmed, setEmployeeConfirmed] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);
  const [removeRow, setRemoveRow] = useState<Row>();
  const [error, setError] = useState('');
  const checks = useRef(new Map<string, number>());
  const checkedInputs = useRef(new Map<string, string>());
  const checkSequence = useRef(0);
  const canEdit =
    captain &&
    event.registrationAvailable &&
    team.qualificationStatus === 'APPROVED' &&
    team.allowedActions.includes('EDIT_ROSTER');
  useEffect(() => {
    setRows(team.members);
    setRemoved([]);
    checks.current.clear();
    checkedInputs.current.clear();
  }, [team.id, team.version, team.members]);
  function editRow(id: string, field: 'realName' | 'mobile', value: string) {
    checkSequence.current += 1;
    checks.current.set(id, checkSequence.current);
    checkedInputs.current.delete(id);
    setRows(old =>
      old.map(row =>
        row.id === id
          ? {
              ...row,
              [field]: value,
              accountRegistered: undefined,
              checking: false,
              error: undefined,
            }
          : row,
      ),
    );
  }
  async function checkRow(row: Row, retry = false) {
    if (!row.realName.trim() || !row.mobile?.trim()) return;
    const input = JSON.stringify([row.realName.trim(), row.mobile]);
    if (row.checking || (!retry && checkedInputs.current.get(row.id) === input))
      return;
    checkedInputs.current.set(row.id, input);
    checkSequence.current += 1;
    const request = checkSequence.current;
    checks.current.set(row.id, request);
    const update = (patch: Partial<Row>) => {
      if (checks.current.get(row.id) === request)
        setRows(old =>
          old.map(item => (item.id === row.id ? { ...item, ...patch } : item)),
        );
    };
    if (
      row.realName.trim().length > 100 ||
      !/^1[0-9]{10}$/.test(row.mobile || '')
    ) {
      update({
        accountRegistered: undefined,
        checking: false,
        error: d.memberInvalid,
      });
      return;
    }
    if (
      rows.some(other => other.id !== row.id && other.mobile === row.mobile)
    ) {
      update({
        accountRegistered: undefined,
        checking: false,
        error: d.duplicateMobile,
      });
      return;
    }
    if (!retry && row.accountRegistered !== undefined && !row.error) return;
    // 尚未提交的移除仍是服务端有效成员；重新填入同一手机号应撤销移除。
    const restoring = row.fresh
      ? team.members.find(
          member =>
            member.mobile === row.mobile &&
            removed.some(change => change.participantId === member.id),
        )
      : undefined;
    update({ checking: true, error: undefined });
    try {
      const result = await call<{ accountRegistered: boolean }>(
        `${prefix(event.id)}/teams/${team.id}/members/check`,
        {
          participantId: restoring?.id ?? (row.fresh ? undefined : row.id),
          realName: row.realName.trim(),
          mobile: row.mobile,
        },
      );
      if (checks.current.get(row.id) !== request) return;
      if (restoring) {
        update({
          ...restoring,
          realName: row.realName,
          fresh: false,
          accountRegistered: result.accountRegistered,
          checking: false,
          error: undefined,
        });
        setRemoved(old =>
          old.filter(change => change.participantId !== restoring.id),
        );
      } else {
        update({
          accountRegistered: result.accountRegistered,
          checking: false,
        });
      }
    } catch (cause) {
      const response = cause as {
        data?: { msg?: string };
        response?: { data?: { msg?: string } };
      } | null;
      const errorMessage =
        response?.response?.data?.msg ||
        response?.data?.msg ||
        (cause instanceof Error ? cause.message : '');
      let memberError = d.memberCheckFailed;
      if (errorMessage === 'PARTICIPANT_CONFLICT') {
        memberError = d.memberConflict;
      } else if (errorMessage && !/^[A-Z][A-Z0-9_]+$/.test(errorMessage)) {
        memberError = errorMessage;
      }
      update({
        accountRegistered: undefined,
        checking: false,
        error: memberError,
      });
    }
  }
  const valid = rows.every(
    row => row.accountRegistered !== undefined && !row.checking && !row.error,
  );
  const changes: Change[] = [
    ...removed,
    ...rows.flatMap(row => {
      const original = team.members.find(p => p.id === row.id);
      if (
        !row.fresh &&
        original?.realName === row.realName &&
        original?.mobile === row.mobile
      )
        return [];
      return [
        {
          action: row.fresh ? ('ADD' as const) : ('UPDATE' as const),
          participantId: row.fresh ? undefined : row.id,
          expectedVersion: row.fresh ? undefined : row.version,
          realName: row.realName.trim(),
          mobile: row.mobile,
        },
      ];
    }),
  ];
  const copyLink = () => {
    copyToClipboard(
      call<Link>(`${prefix(event.id)}/invites/link`).then(
        result => result.inviteUrl,
      ),
    )
      .then(() => message.success(t.copied))
      .catch(cause =>
        setError(cause instanceof Error ? cause.message : t.failed),
      );
  };
  const save = (confirm: boolean) =>
    run(async () => {
      if (!valid || rows.length > 10 || (confirm && rows.length < 3))
        throw new Error(d.minimumMembers);
      if (confirm && team.registrationStatus !== 'REGISTERED' && !agreed)
        throw new Error(d.legal.required);
      if (!employeeConfirmed) throw new Error(t.employees);
      // 保存时服务端再次核验账号和资格；填写阶段的查询结果不作为授权依据。
      await call<Team>(
        `${prefix(event.id)}/teams/${team.id}/${
          confirm ? 'registration/submit' : 'members/save'
        }`,
        {
          ...mutation(event.code, team.version),
          changes,
          employeeConfirmed,
        },
      );
      setConfirmOpen(false);
      if (confirm && team.registrationStatus !== 'REGISTERED')
        setSuccessOpen(true);
    });
  return (
    <section className={styles.roster}>
      <RegistrationSteps
        current={2}
        onCompany={captain && !busy ? onBack : undefined}
      />
      <div className={styles.heading}>
        <div>
          <h1>{d.membersTitle}</h1>
          <p>{captain ? d.membersHint : d.memberViewHint}</p>
        </div>
        <span>{I18N.template(d.membersCount, { count: rows.length })}</span>
      </div>
      {error && (
        <Alert
          type='error'
          message={error}
          closable
          onClose={() => setError('')}
        />
      )}
      {team.registrationStatus === 'REGISTERED' && (
        <p className={styles.registeredNotice}>{d.registrationComplete}</p>
      )}
      <div className={styles.invitation}>
        <div className={styles.brand}>
          <div>
            <img src={brand} alt='' />
          </div>
        </div>
        <div className={styles.invitationText}>
          <strong>{d.inviteBannerTitle}</strong>
          <p>{d.inviteBannerHint}</p>
        </div>
        <Button icon={<img src={linkIcon} alt='' />} onClick={copyLink}>
          {d.copyInvite}
        </Button>
      </div>
      <Table<Row>
        className={styles.table}
        rowKey='id'
        pagination={false}
        scroll={{ x: 730 }}
        dataSource={rows}
        expandable={{
          showExpandColumn: false,
          expandedRowKeys: rows.filter(row => row.error).map(row => row.id),
          rowExpandable: row => !!row.error,
          expandedRowRender: row => (
            <div
              className={styles.memberError}
              id={`member-error-${row.id}`}
              role='alert'
            >
              <ExclamationCircleOutlined />
              <span>{row.error}</span>
            </div>
          ),
        }}
        columns={[
          {
            title: t.role,
            width: 96,
            render: (_, row) => (
              <span
                className={
                  row.role === 'CAPTAIN' ? styles.captain : styles.member
                }
              >
                <img
                  src={row.role === 'CAPTAIN' ? captainIcon : memberIcon}
                  alt=''
                />
                {row.role === 'CAPTAIN' ? d.captainRole : d.memberRole}
              </span>
            ),
          },
          {
            title: t.name,
            width: 120,
            render: (_, row, index) =>
              canEdit ? (
                <Input
                  aria-label={I18N.template(d.nameFor, { index: index + 1 })}
                  value={row.realName}
                  maxLength={100}
                  disabled={busy}
                  status={
                    row.error && !row.realName.trim() ? 'error' : undefined
                  }
                  onChange={e => editRow(row.id, 'realName', e.target.value)}
                  onBlur={() => checkRow(row)}
                />
              ) : (
                row.realName
              ),
          },
          {
            title: t.mobile,
            width: 140,
            render: (_, row, index) => (
              <div>
                {canEdit &&
                row.role !== 'CAPTAIN' &&
                !team.members.find(p => p.id === row.id)?.accountRegistered ? (
                  <Input
                    aria-label={I18N.template(d.phoneFor, { index: index + 1 })}
                    value={row.mobile}
                    maxLength={11}
                    inputMode='tel'
                    disabled={busy}
                    status={row.error ? 'error' : undefined}
                    aria-describedby={
                      row.error ? `member-error-${row.id}` : undefined
                    }
                    onChange={e => editRow(row.id, 'mobile', e.target.value)}
                    onBlur={() => checkRow(row)}
                  />
                ) : (
                  row.mobile || row.mobileMasked
                )}
              </div>
            ),
          },
          {
            title: d.inviter,
            width: 80,
            render: (_, row) => row.inviterName || '—',
          },
          {
            title: d.accountStatus,
            width: 100,
            render: (_, row) => {
              if (row.checking)
                return <span aria-live='polite'>{d.accountChecking}</span>;
              if (row.accountRegistered === undefined)
                return (
                  <Button
                    type='link'
                    danger={!!row.error}
                    disabled={busy}
                    onClick={() => checkRow(row, true)}
                  >
                    {row.error ? d.checkAgain : d.accountUnchecked}
                  </Button>
                );
              return (
                <span
                  className={
                    row.accountRegistered
                      ? styles.registered
                      : styles.unregistered
                  }
                >
                  {row.accountRegistered
                    ? d.accountRegistered
                    : d.accountUnregistered}
                </span>
              );
            },
          },
          {
            title: (
              <Tooltip title={d.memberPersonalBonusHint}>
                {d.memberPersonalBonus}
              </Tooltip>
            ),
            width: 100,
            render: (_, row) => {
              if (row.fresh) return '—';
              if (row.personalBonusRate == null)
                return <Tooltip title={t.estimated}>{t.pending}</Tooltip>;
              return Number(row.personalBonusRate) > 0 ? (
                <span className={styles.bonus}>
                  <img src={giftIcon} alt='' />
                  {`+${Number(
                    (Number(row.personalBonusRate) * 100).toFixed(2),
                  )}%`}
                </span>
              ) : (
                '—'
              );
            },
          },
          ...(canEdit
            ? [
                {
                  title: t.action,
                  width: 70,
                  render: (_: unknown, row: Row) =>
                    row.role !== 'CAPTAIN' && (
                      <Button
                        type='link'
                        danger
                        disabled={busy}
                        onClick={() => setRemoveRow(row)}
                      >
                        {d.deleteFile}
                      </Button>
                    ),
                },
              ]
            : []),
        ]}
      />
      {canEdit && rows.length < 10 && (
        <Button
          className={styles.add}
          block
          type='dashed'
          disabled={busy}
          icon={<img src={addIcon} alt='' />}
          onClick={() =>
            setRows(old => [
              ...old,
              {
                id: crypto.randomUUID(),
                realName: '',
                mobile: '',
                mobileMasked: '',
                role: 'MEMBER',
                status: 'PRE_REGISTERED',
                version: 0,
                activeMember: true,
                fresh: true,
              },
            ])
          }
        >
          {d.addMember}
        </Button>
      )}
      {canEdit && rows.length < 3 && (
        <p className={styles.minimum}>{d.minimumMembers}</p>
      )}
      {canEdit && (
        <Checkbox
          className={styles.declaration}
          disabled={busy}
          checked={employeeConfirmed}
          onChange={e => setEmployeeConfirmed(e.target.checked)}
        >
          {t.employees}
        </Checkbox>
      )}
      {canEdit && team.registrationStatus !== 'REGISTERED' && (
        <RegistrationConsent
          event={event}
          checked={agreed}
          onChange={setAgreed}
          disabled={busy}
        />
      )}
      <div className={styles.actions}>
        <Button className={styles.back} onClick={onBack} disabled={busy}>
          {d.previous}
        </Button>
        <div className={styles.submitActions}>
          <Tooltip title={d.currentTeamBonusHint}>
            <span className={styles.teamBonus}>
              <span className={styles.teamBonusIcon}>
                <img src={teamBonusIcon} alt='' />
              </span>
              <span>{d.currentTeamBonus}</span>
              <strong>
                {team.teamBonusRate == null
                  ? t.pending
                  : `+${Number(
                      (Number(team.teamBonusRate) * 100).toFixed(2),
                    )}%`}
              </strong>
            </span>
          </Tooltip>
          {canEdit ? (
            <Button
              type='primary'
              disabled={
                busy ||
                !valid ||
                rows.length < 3 ||
                !employeeConfirmed ||
                (team.registrationStatus !== 'REGISTERED' && !agreed) ||
                (team.registrationStatus === 'REGISTERED' && !changes.length)
              }
              onClick={() => setConfirmOpen(true)}
            >
              {team.registrationStatus === 'REGISTERED'
                ? changes.length
                  ? d.saveMemberChanges
                  : d.registrationComplete
                : d.registerNow}
            </Button>
          ) : (
            <Button onClick={onTasks}>{d.tasks}</Button>
          )}
        </div>
      </div>
      {canEdit && team.registrationStatus !== 'REGISTERED' && (
        <Button
          className={styles.saveDraft}
          type='link'
          disabled={busy || !changes.length || !valid || !employeeConfirmed}
          onClick={() => save(false)}
        >
          {d.saveRoster}
        </Button>
      )}
      <Modal
        open={confirmOpen}
        width={558}
        className={styles.confirmModal}
        closeIcon={<img src={closeIcon} alt='' />}
        onCancel={() => !busy && setConfirmOpen(false)}
        title={
          <span className={styles.confirmTitle}>
            <img src={confirmIcon} alt='' />
            {d.confirmTeamTitle}
          </span>
        }
        footer={
          <>
            <Button disabled={busy} onClick={() => setConfirmOpen(false)}>
              {t.cancel}
            </Button>
            <Button type='primary' loading={busy} onClick={() => save(true)}>
              {d.confirmAction}
            </Button>
          </>
        }
      >
        <p className={styles.confirmHint}>{d.confirmTeamHint}</p>
        <p className={styles.smsHint}>{d.confirmTeamNotice}</p>
      </Modal>
      <Modal
        open={!!removeRow}
        title={d.removeMemberTitle}
        onCancel={() => setRemoveRow(undefined)}
        okText={d.deleteFile}
        cancelText={t.cancel}
        okButtonProps={{ danger: true, disabled: busy }}
        onOk={() => {
          if (!removeRow || busy) return;
          if (!removeRow.fresh)
            setRemoved(old => [
              ...old,
              {
                action: 'REMOVE',
                participantId: removeRow.id,
                expectedVersion: removeRow.version,
              },
            ]);
          checks.current.delete(removeRow.id);
          checkedInputs.current.delete(removeRow.id);
          setRows(old => old.filter(row => row.id !== removeRow.id));
          setRemoveRow(undefined);
        }}
      >
        <p>{d.removeMemberHint}</p>
      </Modal>
      <RegistrationFeedback
        open={successOpen}
        kind='registration'
        onClose={() => setSuccessOpen(false)}
        onInvite={copyLink}
        onTasks={onTasks}
      />
    </section>
  );
}
