import I18N from '@/lang/I18N';
import { Button, Empty, Table, Tooltip, message } from 'antd';
import { useEffect, useRef, useState } from 'react';
import { copyToClipboard } from '@/utils/clipboard';
import brand from '@/assets/images/carbonCompetition/registration-brand.png';
import link from '@/assets/images/carbonCompetition/registration-link.svg';
import gift from '@/assets/images/carbonCompetition/registration-gift.svg';
import { call, mutation, prefix, statusLabel } from '../../service';
import type { Invite, Link, Me, Overview, Page } from '../../types';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
const d = t.design;
type Props = {
  event: Overview;
  me?: Me;
  invites?: Page<Invite>;
  onInvitesChange: (value: Page<Invite>) => void;
  onError: (message: string) => void;
};
export default function RegistrationSummary({
  event,
  me,
  invites,
  onInvitesChange,
  onError,
}: Props) {
  const [copying, setCopying] = useState(false);
  const [loading, setLoading] = useState(false);
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current += 1;
    },
    [event.id, me?.participant?.id],
  );
  const copy = () => {
    if (copying) return;
    setCopying(true);
    copyToClipboard(
      call<Link>(
        `${prefix(event.id)}/invites/link`,
        mutation(event.code, me?.participant?.version),
      ).then(value => value.inviteUrl),
    )
      .then(() => message.success(t.copied))
      .catch(e => onError(e instanceof Error ? e.message : t.failed))
      .finally(() => setCopying(false));
  };
  const bonus = (rate?: string) =>
    rate == null ? t.pending : `+${Number((Number(rate) * 100).toFixed(2))}%`;
  return (
    <div className={styles.stack}>
      {!me?.team && me?.participant?.status === 'REGISTERED' && (
        <div className={styles.invitation}>
          <div className={styles.brand}>
            <div>
              <img src={brand} alt='' />
            </div>
          </div>
          <div className={styles.invitationText}>
            <strong>{d.inviteFriends}</strong>
            <p>{d.personalInviteHint}</p>
          </div>
          <Button
            loading={copying}
            icon={<img src={link} alt='' />}
            onClick={copy}
          >
            {d.copyPersonalInvite}
          </Button>
        </div>
      )}
      {me?.team && (
        <div className={styles.metrics}>
          <span>
            {t.benefit}
            <strong>{statusLabel(me.benefit.status)}</strong>
          </span>
          <span>
            {t.personalBonus}
            <strong>{bonus(me.personalBonusRate)}</strong>
          </span>
          {me.team && (
            <span>
              {t.teamBonus}
              <strong>{bonus(me.team.teamBonusRate)}</strong>
            </span>
          )}
        </div>
      )}
      {invites && (
        <section aria-label={t.invites}>
          <div className={styles.tableHeading}>
            <h2>{t.invites}</h2>
            {!me?.team && me?.participant && (
              <span className={styles.personalBonus}>
                {t.personalBonus} <strong>{bonus(me.personalBonusRate)}</strong>
              </span>
            )}
            <span>
              {I18N.template(d.inviteRecordCount, { count: invites.total })}
            </span>
          </div>
          <Table<Invite>
            className={styles.table}
            rowKey='id'
            dataSource={invites.rows}
            loading={loading}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={d.noInvites}
                />
              ),
            }}
            scroll={{ x: 640 }}
            pagination={{
              current: invites.pageNum,
              pageSize: invites.pageSize,
              total: invites.total,
              hideOnSinglePage: true,
              showSizeChanger: false,
              onChange: async page => {
                request.current += 1;
                const revision = request.current;
                setLoading(true);
                try {
                  const result = await call<Page<Invite>>(
                    `${prefix(
                      event.id,
                    )}/invites/records?pageNum=${page}&pageSize=${
                      invites.pageSize
                    }`,
                  );
                  if (request.current === revision) onInvitesChange(result);
                } catch (e) {
                  if (request.current === revision)
                    onError(e instanceof Error ? e.message : t.failed);
                } finally {
                  if (request.current === revision) setLoading(false);
                }
              },
            }}
            columns={[
              {
                title: d.invitee,
                dataIndex: 'inviteeName',
                render: value => value || '—',
              },
              {
                title: t.mobile,
                dataIndex: 'mobileMasked',
                render: value => value || '—',
              },
              {
                title: d.enrollmentStatus,
                render: (_, row) => (
                  <span
                    className={`${styles.badge} ${
                      row.registrationStatus === 'REGISTERED'
                        ? styles.success
                        : styles.pending
                    }`}
                  >
                    {row.registrationStatus === 'REGISTERED'
                      ? d.individualRegistered
                      : row.registrationStatus === 'NOT_REGISTERED'
                      ? d.notRegistered
                      : row.registrationStatus === 'PENDING_TEAM'
                      ? d.inviteTeamPending
                      : statusLabel(row.registrationStatus)}
                  </span>
                ),
              },
              {
                title: d.inviteBonus,
                render: (_, row) =>
                  row.personalEligibility === 'VALID' &&
                  Number(row.personalBonusContribution) > 0 ? (
                    <span className={styles.bonus}>
                      <img src={gift} alt='' />
                      {`+${Number(
                        (Number(row.personalBonusContribution) * 100).toFixed(
                          2,
                        ),
                      )}%`}
                    </span>
                  ) : (
                    <Tooltip
                      title={
                        row.registrationStatus === 'PENDING_TEAM'
                          ? d.inviteTeamPendingBonus
                          : statusLabel(row.personalEligibility)
                      }
                    >
                      <span className={styles.muted}>
                        {row.personalEligibility === 'VALID' &&
                        row.personalBonusContribution != null
                          ? d.invitationBonusCapped
                          : row.personalEligibility === 'INVALID'
                          ? d.notCounted
                          : ['PENDING_RULE', 'PENDING_ATTRIBUTION'].includes(
                              row.personalEligibility,
                            )
                          ? d.invitationReviewPending
                          : d.invitationPending}
                      </span>
                    </Tooltip>
                  ),
              },
            ]}
          />
          <p className={styles.note}>{t.estimated}</p>
        </section>
      )}
    </div>
  );
}
