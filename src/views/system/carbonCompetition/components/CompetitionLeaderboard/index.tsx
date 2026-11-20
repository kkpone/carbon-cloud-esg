import { useMobile } from '@/hooks/use-mobile';
import I18N from '@/lang/I18N';
import {
  Alert,
  Button,
  Empty,
  Input,
  Pagination,
  Segmented,
  Spin,
  Table,
  Tooltip,
} from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import {
  getCompetitionCheckinMe,
  getCompetitionLeaderboard,
  statusLabel,
} from '../../service';
import type {
  CheckinMe,
  Leaderboard,
  LeaderboardEntry,
  Me,
  Overview,
} from '../../types';
import PodiumArtwork from './components/PodiumArtwork';
import trophyOne from '@/assets/images/carbonCompetition/leader-trophy-1.png';
import trophyTwo from '@/assets/images/carbonCompetition/leader-trophy-2.png';
import trophyThree from '@/assets/images/carbonCompetition/leader-trophy-3.png';
import companyIcon from '@/assets/images/carbonCompetition/leader-company.svg';
import personIcon from '@/assets/images/carbonCompetition/leader-person.svg';
import searchIcon from '@/assets/images/carbonCompetition/leader-search.svg';
import CompetitionRankBadge from '../CompetitionRankBadge';
import styles from './index.module.less';

const t = I18N.carbonCompetition;
const u = t.taskUi.leaderboard;
const trophies = [trophyOne, trophyTwo, trophyThree];
const number = (value?: number | null) =>
  value == null ? '—' : value.toLocaleString();

export default function CompetitionLeaderboard({
  event,
  me,
  initialBoard,
  onBack,
}: {
  event: Overview;
  me?: Me;
  initialBoard: 'TEAM' | 'PERSONAL';
  onBack: () => void;
}) {
  const mobile = useMobile();
  const [board, setBoard] = useState(initialBoard);
  const [input, setInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [top, setTop] = useState<Record<string, Leaderboard>>();
  const [ranking, setRanking] = useState<Leaderboard>();
  const [own, setOwn] = useState<CheckinMe>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryError, setSummaryError] = useState('');
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setTop(undefined);
    setOwn(undefined);
    setSummaryError('');
    const load = async () => {
      try {
        const teams = await getCompetitionLeaderboard(event.code, {
          board: 'TEAM',
          pageNum: 1,
          pageSize: 3,
        });
        const personal = await getCompetitionLeaderboard(event.code, {
          board: 'PERSONAL',
          pageNum: 1,
          pageSize: 3,
          batchId: teams.batchId,
        });
        if (!cancelled) setTop({ TEAM: teams, PERSONAL: personal });
      } catch (e) {
        if (!cancelled)
          setSummaryError(e instanceof Error ? e.message : t.failed);
      }
    };
    load();
    if (me?.participant?.status === 'REGISTERED') {
      getCompetitionCheckinMe(event.id)
        .then(value => {
          if (!cancelled) setOwn(value);
        })
        .catch(e => {
          if (!cancelled)
            setSummaryError(e instanceof Error ? e.message : t.failed);
        });
    }
    return () => {
      cancelled = true;
    };
  }, [
    event.id,
    event.code,
    me?.participant?.id,
    me?.participant?.status,
    refresh,
  ]);
  useEffect(() => {
    let cancelled = false;
    setRanking(undefined);
    setError('');
    if (!top)
      return () => {
        cancelled = true;
      };
    setLoading(true);
    getCompetitionLeaderboard(event.code, {
      board,
      pageNum: page,
      pageSize: size,
      keyword,
      batchId: top[board].batchId,
    })
      .then(value => {
        if (!cancelled) setRanking(value);
      })
      .catch(e => {
        if (!cancelled) setError(e instanceof Error ? e.message : t.failed);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [event.code, top, board, page, size, keyword]);
  const personal = board === 'PERSONAL';
  const currentId = personal ? me?.participant?.id : me?.team?.id;
  const isOwn = (row: LeaderboardEntry) => row.subjectId === currentId;
  const name = (row: LeaderboardEntry) =>
    isOwn(row)
      ? I18N.template(personal ? u.selfName : u.selfCompany, { name: row.name })
      : row.name;
  const score = (row: LeaderboardEntry) =>
    top?.[board].eScoreStatus === 'PUBLISHED' && row.eScore != null
      ? I18N.template(u.scoreValue, { value: row.eScore.toFixed(1) })
      : u.pendingScore;
  const search = (value: string) => {
    setKeyword(value.trim());
    setPage(1);
  };
  const retry = () => {
    setPage(1);
    setRefresh(value => value + 1);
  };
  const summary = own?.updatedAt === top?.[board].updatedAt ? own : undefined;
  return (
    <section className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.titleRow}>
          <h1>{u.title}</h1>
          <Button type='text' onClick={onBack}>
            {u.back}
          </Button>
        </div>
        {me?.participant && (
          <div className={styles.summaries}>
            {me.team && (
              <div className={styles.summary}>
                <span>
                  <img src={companyIcon} alt='' />
                  {t.teamPoints}：<strong>{number(summary?.teamPoints)}</strong>
                </span>
                <span>
                  {u.teamRank}：<strong>{number(summary?.teamRank)}</strong>
                </span>
              </div>
            )}
            <div className={styles.summary}>
              <span>
                <img src={personIcon} alt='' />
                {u.myCoins}：<strong>{number(summary?.points)}</strong>
              </span>
              <span>
                {u.personalRank}：<strong>{number(summary?.rank)}</strong>
              </span>
            </div>
          </div>
        )}
      </header>
      {summaryError && (
        <Alert
          type='warning'
          showIcon
          message={summaryError}
          action={<Button onClick={retry}>{t.retry}</Button>}
        />
      )}
      <div className={styles.controls}>
        <Segmented
          value={board}
          options={[
            { value: 'TEAM', label: t.teamBoardFull },
            { value: 'PERSONAL', label: t.personalBoardFull },
          ]}
          onChange={value => {
            setBoard(value as 'TEAM' | 'PERSONAL');
            setPage(1);
            setInput('');
            setKeyword('');
          }}
        />
        <Input
          className={styles.search}
          prefix={<img src={searchIcon} alt='' />}
          value={input}
          placeholder={personal ? u.searchPerson : u.searchTeam}
          aria-label={personal ? u.searchPerson : u.searchTeam}
          allowClear
          onChange={e => {
            setInput(e.target.value);
            if (!e.target.value) search('');
          }}
          onPressEnter={() => search(input)}
          onBlur={() => search(input)}
        />
      </div>
      {!top && !summaryError ? (
        <div className={styles.loading}>
          <Spin />
        </div>
      ) : (
        <div className={styles.podium}>
          {[2, 1, 3].map(rank => {
            const row = top?.[board].rows.find(item => item.rank === rank);
            const displayName = row ? name(row) : u.vacant;
            const title =
              personal && row?.mobileMasked
                ? I18N.template(u.namePhone, {
                    name: displayName,
                    phone: row.mobileMasked,
                  })
                : displayName;
            return (
              <article
                key={rank}
                className={`${styles.podiumCard} ${styles[`place${rank}`]}`}
                aria-label={`TOP ${rank}`}
              >
                <PodiumArtwork rank={rank} />
                <div className={styles.podiumContent}>
                  <p className={styles.winnerName} title={title}>
                    {title}
                  </p>
                  {row ? (
                    <>
                      <div className={styles.points}>
                        <strong>{number(row.points)}</strong>
                        <span>{u.coins}</span>
                      </div>
                      <p className={styles.winnerDetail}>
                        {!personal && (
                          <span>
                            {I18N.template(u.people, {
                              count: row.participants,
                            })}{' '}
                            ·{' '}
                          </span>
                        )}
                        {I18N.template(u.eScore, { score: score(row) })}
                      </p>
                    </>
                  ) : (
                    <p className={styles.winnerDetail}>{u.noRank}</p>
                  )}
                </div>
                <div className={styles.trophy}>
                  <img src={trophies[rank - 1]} alt='' />
                </div>
              </article>
            );
          })}
        </div>
      )}
      {error && (
        <Alert
          type='error'
          showIcon
          message={error}
          action={<Button onClick={retry}>{t.retry}</Button>}
        />
      )}
      <Table<LeaderboardEntry>
        className={styles.table}
        size='small'
        rowKey='subjectId'
        loading={loading}
        dataSource={ranking?.rows || []}
        pagination={false}
        scroll={{ x: personal ? 1020 : 720 }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={u.noResults}
            />
          ),
        }}
        rowClassName={row => (isOwn(row) ? styles.ownRow : '')}
        columns={[
          {
            title: t.taskUi.rankLabel,
            width: 100,
            render: (_: unknown, row: LeaderboardEntry) =>
              row.rank && row.rank <= 3 ? (
                <CompetitionRankBadge rank={row.rank} />
              ) : (
                row.rank ?? '—'
              ),
          },
          {
            title: personal ? t.participantLabel : t.company,
            width: personal ? 180 : undefined,
            ellipsis: true,
            render: (_: unknown, row: LeaderboardEntry) => (
              <span title={name(row)}>{name(row)}</span>
            ),
          },
          ...(personal
            ? [
                {
                  title: u.phone,
                  dataIndex: 'mobileMasked',
                  width: 140,
                  render: (value?: string) => value || '—',
                },
                {
                  title: u.track,
                  dataIndex: 'track',
                  width: 120,
                  render: (value?: string) => {
                    if (value === 'ENTERPRISE') return t.design.enterprise;
                    if (value === 'INDIVIDUAL') return t.design.individual;
                    return '—';
                  },
                },
                {
                  title: u.company,
                  dataIndex: 'teamName',
                  width: 240,
                  ellipsis: true,
                  render: (value?: string, row?: LeaderboardEntry) => (
                    <span title={value}>
                      {value || '—'}
                      {row?.teamId && row.teamId === me?.team?.id
                        ? u.myTeam
                        : ''}
                    </span>
                  ),
                },
              ]
            : [
                {
                  title: t.actualParticipants,
                  dataIndex: 'participants',
                  width: 140,
                },
              ]),
          {
            title: t.checkinPoints,
            width: 140,
            render: (_: unknown, row: LeaderboardEntry) => (
              <Tooltip title={statusLabel(row.status)}>
                <span className={styles.coinValue}>{number(row.points)}</span>
              </Tooltip>
            ),
          },
          {
            title: u.eStage,
            width: 140,
            render: (_: unknown, row: LeaderboardEntry) => score(row),
          },
        ]}
      />
      <div className={styles.pagination}>
        <span>{I18N.template(u.total, { count: ranking?.total ?? 0 })}</span>
        <Pagination
          current={page}
          pageSize={size}
          total={ranking?.total || 0}
          disabled={loading || !ranking}
          size={mobile ? 'small' : 'default'}
          showSizeChanger
          pageSizeOptions={[10, 20, 50]}
          showLessItems
          onChange={(next, pageSize) => {
            setPage(pageSize === size ? next : 1);
            setSize(pageSize);
          }}
        />
      </div>
      <footer className={styles.footnote}>
        <span>
          {t.updatedAt}：
          {top?.[board].updatedAt
            ? dayjs(top[board].updatedAt).format('YYYY-MM-DD HH:mm:ss')
            : t.pending}
        </span>
        <p>
          {top?.[board].eScoreStatus === 'PUBLISHED'
            ? t.publishedCheckinHint
            : t.currentRankHint}
        </p>
      </footer>
    </section>
  );
}
