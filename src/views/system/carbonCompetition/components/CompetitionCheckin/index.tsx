import { copyToClipboard } from '@/utils/clipboard';
import I18N from '@src/lang/I18N';
import { useMobile } from '@/hooks/use-mobile';
import {
  Alert,
  Button,
  Descriptions,
  Modal,
  Segmented,
  Empty,
  Spin,
  Space,
  Table,
} from 'antd';
import dayjs from 'dayjs';
import { useHistory, useLocation } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import {
  bindCompetitionAccount,
  createCompetitionPoster,
  getCompetitionCheckinMe,
  getCompetitionCarbonCompany,
  getCompetitionLeaderboard,
  mutation,
  statusLabel,
} from '../../service';
import type {
  CheckinMe,
  CarbonCompany,
  Leaderboard,
  LeaderboardEntry,
  Me,
  Overview,
} from '../../types';
import CompetitionRankBadge from '../CompetitionRankBadge';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
export default function CompetitionCheckin({
  event,
  me,
}: {
  event: Overview;
  me?: Me;
}) {
  const [own, setOwn] = useState<CheckinMe>();
  const mobile = useMobile();
  const [board, setBoard] = useState('TEAM');
  const history = useHistory();
  const location = useLocation();
  const [top, setTop] = useState<Record<string, Leaderboard>>({});
  const [rulesOpen, setRulesOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [entry, setEntry] = useState<CarbonCompany>();
  const [entryError, setEntryError] = useState('');
  const eligible = me?.participant?.status === 'REGISTERED';
  const fetchBoard = useCallback(
    (kind: string, pageNum = 1, search = '', batchId?: string, pageSize = 20) =>
      getCompetitionLeaderboard(event.code, {
        board: kind,
        pageNum,
        pageSize,
        keyword: search,
        batchId,
      }),
    [event.code],
  );
  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError('');
    try {
      await action();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  };
  const load = useCallback(async () => {
    const teams = await fetchBoard('TEAM', 1, '', undefined, 5);
    const personal = await fetchBoard('PERSONAL', 1, '', teams.batchId, 5);
    setTop({ TEAM: teams, PERSONAL: personal });
  }, [fetchBoard]);
  useEffect(() => {
    run(load);
  }, [load]);
  useEffect(() => {
    let cancelled = false;
    let refreshing = false;
    setEntry(undefined);
    setOwn(undefined);
    setEntryError('');
    if (!eligible) return;
    const refresh = async () => {
      if (refreshing || document.visibilityState === 'hidden') return;
      refreshing = true;
      try {
        const current = await getCompetitionCheckinMe(event.id);
        if (cancelled) return;
        setOwn(current);
        if (
          ['UNBOUND', 'PENDING', 'NOT_FOUND', 'AMBIGUOUS', 'DISABLED'].includes(
            current.bindingStatus || '',
          )
        ) {
          await bindCompetitionAccount(event.id, mutation(event.code));
          const updated = await getCompetitionCheckinMe(event.id);
          if (!cancelled) setOwn(updated);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : t.failed);
      } finally {
        refreshing = false;
      }
    };
    getCompetitionCarbonCompany(event.id)
      .then(value => {
        if (!cancelled) setEntry(value);
      })
      .catch(e => {
        if (!cancelled)
          setEntryError(e instanceof Error ? e.message : t.failed);
      });
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [event.id, event.code, eligible, me?.participant?.id]);
  const safeUrl = (url?: string) =>
    url && /^https?:\/\//i.test(url) ? url : undefined;
  return (
    <section className={styles.panel}>
      {error && <Alert type='error' showIcon message={error} />}
      <div className={styles.overview}>
        {eligible && (
          <div className={styles.checkin}>
            <h3>{t.taskUi.checkinTitle}</h3>

            {entryError && (
              <Alert
                type='warning'
                showIcon
                message={entryError}
                action={
                  <Button
                    size='small'
                    onClick={async () => {
                      try {
                        setEntry(await getCompetitionCarbonCompany(event.id));
                        setEntryError('');
                      } catch (e) {
                        setEntryError(
                          e instanceof Error ? e.message : t.failed,
                        );
                      }
                    }}
                  >
                    {t.retry}
                  </Button>
                }
              />
            )}
            {safeUrl(entry?.qrCodeUrl) ? (
              <div className={styles.entry}>
                <img
                  src={entry?.qrCodeUrl}
                  width={160}
                  height={160}
                  alt={t.carbonEntry.title}
                />
                <span>{entry?.companyName}</span>
              </div>
            ) : (
              <div className={styles.entry}>
                {!entry && !entryError ? (
                  <Spin />
                ) : (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description={t.design.qrPending}
                  />
                )}
              </div>
            )}
            <p className={styles.hint}>{t.carbonEntry.autoBindHint}</p>
            <Descriptions column={2} size='small' className={styles.stats}>
              <Descriptions.Item label={t.binding}>
                {statusLabel(own?.bindingStatus)}
              </Descriptions.Item>
              <Descriptions.Item label={t.checkinPoints}>
                {own?.points ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label={t.rank}>
                {own?.rank ?? '—'}
              </Descriptions.Item>
              {me?.team && (
                <Descriptions.Item label={t.teamPoints}>
                  {own?.teamPoints ?? '—'}
                </Descriptions.Item>
              )}
            </Descriptions>
            <Space wrap>
              <Button
                disabled={
                  busy ||
                  own?.bindingStatus === 'BOUND' ||
                  own?.bindingStatus === 'VERIFIED_NO_PARTICIPATION' ||
                  own?.bindingStatus === 'IDENTITY_REVIEW_REQUIRED'
                }
                onClick={() =>
                  run(async () => {
                    await bindCompetitionAccount(
                      event.id,
                      mutation(event.code),
                    );
                    setOwn(await getCompetitionCheckinMe(event.id));
                    await load();
                  })
                }
              >
                {t.bindAccount}
              </Button>
              {top.TEAM?.batchId && (
                <Button
                  onClick={() => {
                    const promise = createCompetitionPoster(event.id, {
                      kind: 'CHECKIN',
                      subjectType: 'PARTICIPANT',
                      batchId: top.TEAM?.batchId,
                    }).then(p => p.shareUrl!);
                    copyToClipboard(promise).catch(e =>
                      setError(e instanceof Error ? e.message : t.failed),
                    );
                  }}
                >
                  {t.shareMyCheckin}
                </Button>
              )}

              {safeUrl(own?.rulesUrl) ? (
                <a
                  href={safeUrl(own?.rulesUrl)}
                  target='_blank'
                  rel='noreferrer'
                >
                  {t.checkinRules}
                </a>
              ) : (
                <Button type='link' onClick={() => setRulesOpen(true)}>
                  {t.checkinRules}
                </Button>
              )}
            </Space>
          </div>
        )}
        <div className={styles.leaders}>
          <header>
            <h3>{t.taskUi.topFive}</h3>
            <Button
              className={styles.reload}
              type='text'
              loading={busy}
              onClick={() => run(load)}
            >
              {t.retry}
            </Button>
          </header>
          <div className={styles.boardControls}>
            <Segmented
              value={board}
              options={[
                { value: 'TEAM', label: t.teamBoardFull },
                { value: 'PERSONAL', label: t.personalBoardFull },
              ]}
              onChange={value => setBoard(String(value))}
            />
            <Button
              type='link'
              onClick={() => {
                const params = new URLSearchParams(location.search);
                params.set('compTab', 'leaderboard');
                params.set('board', board);
                history.push({
                  pathname: location.pathname,
                  search: params.toString(),
                });
              }}
            >
              {t.fullBoard}
            </Button>
          </div>
          <Table<LeaderboardEntry>
            className={styles.rankTable}
            size='small'
            rowKey='subjectId'
            loading={busy}
            dataSource={top[board]?.rows}
            pagination={false}
            columns={[
              {
                title: t.taskUi.rankLabel,
                width: mobile ? 72 : 140,
                render: (_: unknown, row: LeaderboardEntry) =>
                  row.rank && row.rank >= 1 && row.rank <= 3 ? (
                    <CompetitionRankBadge rank={row.rank} />
                  ) : (
                    row.rank ?? '—'
                  ),
              },
              {
                title: board === 'TEAM' ? t.company : t.participantLabel,
                dataIndex: 'name',
              },
              {
                title: t.checkinPoints,
                width: mobile ? 100 : 140,
                render: (_: unknown, row: LeaderboardEntry) =>
                  row.points ?? '—',
              },
            ]}
          />
          <p className={styles.updated}>
            {t.updatedAt}:{' '}
            {top[board]?.updatedAt
              ? dayjs(top[board].updatedAt).format('YYYY-MM-DD HH:mm:ss')
              : t.pending}
          </p>
          <p className={styles.hint}>
            {top[board]?.eScoreStatus === 'PUBLISHED'
              ? t.publishedCheckinHint
              : t.currentRankHint}
          </p>
        </div>
      </div>
      <Modal
        title={t.checkinRules}
        open={rulesOpen}
        footer={null}
        onCancel={() => setRulesOpen(false)}
      >
        <p>{t.checkinScopeHint}</p>
        <p>{t.carbonEntry.autoBindHint}</p>
      </Modal>
    </section>
  );
}
