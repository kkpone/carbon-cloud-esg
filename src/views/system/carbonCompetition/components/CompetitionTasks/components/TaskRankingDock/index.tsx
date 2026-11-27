import { TrophyOutlined } from '@ant-design/icons';
import { Button, Empty, Modal, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import I18N from '@src/lang/I18N';
import type { RootState } from '@/store';
import { getUserInfo } from '@src/utils';
import { getToken } from '@/utils/cookie';
import { filterPreliminaryByType } from '../../../../awards';
import { hydrateResultsWithMockFallback } from '../../../../mockResults';
import { getCompetitionResults } from '../../../../service';
import type {
  Me,
  Overview,
  PreliminaryResult,
  PublishedResults,
} from '../../../../types';
import CompetitionRankBadge from '../../../CompetitionRankBadge';
import styles from './index.module.less';

const formatScore = (value?: number | null) =>
  value == null ? '—' : Number(value).toFixed(2);

const formatBonus = (value?: number | null) =>
  value == null ? '—' : `${(Number(value) * 100).toFixed(0)}%`;

export default function TaskRankingDock({
  event,
  me,
}: {
  event: Overview;
  me?: Me;
}) {
  const r = I18N.carbonCompetition.resultsUi;
  const userStore = useSelector((state: RootState) => state.companyUserInfo);
  const authenticated = Boolean(userStore?.access_token || getToken());
  const currentUserInfo = userStore?.userInfo || getUserInfo()?.userInfo;

  const fallbackUserName =
    me?.participant?.realName ||
    currentUserInfo?.user?.nickName ||
    currentUserInfo?.nickName ||
    currentUserInfo?.username ||
    '';
  const fallbackCompanyName =
    me?.team?.enterpriseName ||
    currentUserInfo?.companyVoList?.find(
      company =>
        String(company.companyId) === String(currentUserInfo.companyId),
    )?.companyName ||
    '';

  const [rawBatch, setRawBatch] = useState<PublishedResults>();
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCompetitionResults(event.code)
      .then(result => {
        if (!cancelled) setRawBatch(result);
      })
      .catch(() => {
        if (!cancelled) {
          setRawBatch({
            id: 'mock-fallback-batch',
            status: 'PUBLISHED',
            batchVersion: 1,
            results: [],
          });
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [event.code]);

  const { batch: effectiveBatch, usingMockData } = useMemo(
    () =>
      hydrateResultsWithMockFallback(
        rawBatch?.id
          ? rawBatch
          : {
              id: 'mock-fallback-batch',
              status: 'PUBLISHED',
              batchVersion: 1,
              results: [],
            },
        {
          me,
          fallbackUserName,
          fallbackCompanyName,
        },
      ),
    [fallbackCompanyName, fallbackUserName, me, rawBatch],
  );

  const teamRows = useMemo(
    () => filterPreliminaryByType(effectiveBatch, 'TEAM'),
    [effectiveBatch],
  );
  const personalRows = useMemo(
    () => filterPreliminaryByType(effectiveBatch, 'PARTICIPANT'),
    [effectiveBatch],
  );

  const topTwentyTeams = useMemo(() => teamRows.slice(0, 20), [teamRows]);
  const topFiftyPersonal = useMemo(
    () => personalRows.slice(0, 50),
    [personalRows],
  );

  const myPersonalRow = useMemo(() => {
    if (me?.participant?.id) {
      const matched = personalRows.find(
        row => row.subjectId === me.participant?.id,
      );
      if (matched) return matched;
    }
    if (usingMockData && fallbackUserName) {
      return personalRows.find(
        row =>
          row.subjectId === 'mock-current-user' ||
          row.displayName === fallbackUserName,
      );
    }
    return undefined;
  }, [fallbackUserName, me?.participant?.id, personalRows, usingMockData]);

  const myTeamRow = useMemo(() => {
    if (me?.team?.id) {
      const matched = teamRows.find(
        row => row.subjectId === me.team?.id || row.teamId === me.team?.id,
      );
      if (matched) return matched;
    }
    if (fallbackCompanyName) {
      return teamRows.find(
        row =>
          row.subjectId === 'mock-current-team' ||
          row.displayName === fallbackCompanyName,
      );
    }
    return undefined;
  }, [fallbackCompanyName, me?.team?.id, teamRows]);

  const renderRank = (rank?: number | null, fallbackIndex?: number) => {
    const value = rank ?? (fallbackIndex != null ? fallbackIndex + 1 : null);
    if (value == null) return <span className={styles.rankCell}>—</span>;
    if (value >= 1 && value <= 3) {
      return <CompetitionRankBadge rank={value} />;
    }
    return <span className={styles.rankCell}>{value}</span>;
  };

  const teamColumns: ColumnsType<PreliminaryResult> = [
    {
      title: r.rankColumn,
      width: 80,
      render: (_value, row, index) => renderRank(row.ranking, index),
    },
    {
      title: r.companyColumn,
      minWidth: 200,
      render: (_value, row) => {
        const isOwn = Boolean(
          (me?.team?.id &&
            (row.subjectId === me.team.id || row.teamId === me.team.id)) ||
            (myTeamRow && row.subjectId === myTeamRow.subjectId),
        );
        return (
          <span>
            <span className={styles.dockName}>{row.displayName}</span>
            {isOwn ? (
              <span className={styles.selfTag}>{r.myTeamSuffix}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      title: r.memberCountColumn,
      width: 110,
      render: (_value, row) => {
        const count = row.rosterCount ?? row.registeredMemberCount;
        return (
          <span className={styles.numericCell}>
            {count == null ? '—' : count}
          </span>
        );
      },
    },
    {
      title: r.bonusColumn,
      width: 96,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatBonus(row.bonusRate)}</span>
      ),
    },
    {
      title: r.awardColumn,
      width: 110,
      render: (_value, row) =>
        row.qualified === 1 ? (
          <Tag color='cyan'>{r.qualifiedTag}</Tag>
        ) : (
          <Tag>{r.completedAward}</Tag>
        ),
    },
  ];

  const personalColumns: ColumnsType<PreliminaryResult> = [
    {
      title: r.rankColumn,
      width: 80,
      render: (_value, row, index) => renderRank(row.ranking, index),
    },
    {
      title: r.participantColumn,
      minWidth: 160,
      render: (_value, row) => {
        const isOwn = Boolean(
          (me?.participant?.id && row.subjectId === me.participant.id) ||
            (myPersonalRow && row.subjectId === myPersonalRow.subjectId),
        );
        return (
          <span>
            <span className={styles.dockName}>{row.displayName}</span>
            {isOwn ? (
              <span className={styles.selfTag}>{r.selfSuffix}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      title: r.cScoreColumn,
      width: 110,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatScore(row.cScore)}</span>
      ),
    },
    {
      title: r.eScoreColumn,
      width: 110,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatScore(row.eScore)}</span>
      ),
    },
    {
      title: r.bonusColumn,
      width: 96,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatBonus(row.bonusRate)}</span>
      ),
    },
    {
      title: r.preliminaryTotalColumn,
      width: 112,
      render: (_value, row) => (
        <span className={styles.scoreValue}>{formatScore(row.totalScore)}</span>
      ),
    },
  ];

  const personalRankText = myPersonalRow?.ranking
    ? I18N.template(r.posterRankSummary, {
        rank: String(myPersonalRow.ranking),
      })
    : me?.participant
    ? r.unrankedStatus
    : r.notRegisteredRank;

  const hasTeam = Boolean(myTeamRow || me?.team || fallbackCompanyName);
  const teamRankText = myTeamRow?.ranking
    ? I18N.template(r.posterRankSummary, { rank: String(myTeamRow.ranking) })
    : hasTeam
    ? r.unrankedStatus
    : r.noTeamJoined;

  return (
    <>
      <aside className={styles.dock} aria-label={r.fullRankingModalTitle}>
        {!authenticated ? (
          <div className={styles.dockRow}>
            <div className={styles.dockMain}>
              <span className={styles.dockLabel}>{r.myRankPinnedTitle}</span>
              <span className={styles.dockMuted}>{r.loginToViewMyRank}</span>
            </div>
            <Button
              type='primary'
              size='small'
              icon={<TrophyOutlined />}
              onClick={() => setModalOpen(true)}
            >
              {r.viewFullRanking}
            </Button>
          </div>
        ) : (
          <>
            <div className={styles.dockRow}>
              <div className={styles.dockMain}>
                <span className={styles.dockLabel}>{r.myRankPinnedTitle}</span>
                <span className={styles.dockRank}>{personalRankText}</span>
                <span className={styles.dockName}>
                  {myPersonalRow?.displayName || fallbackUserName || '—'}
                </span>
              </div>
              <div className={styles.dockMetrics}>
                <span>
                  {r.cScoreColumn}: {formatScore(myPersonalRow?.cScore)}
                </span>
                <span>
                  {r.eScoreColumn}: {formatScore(myPersonalRow?.eScore)}
                </span>
                <span>
                  {r.preliminaryTotalColumn}:{' '}
                  <strong>{formatScore(myPersonalRow?.totalScore)}</strong>
                </span>
                <Button
                  type='primary'
                  size='small'
                  icon={<TrophyOutlined />}
                  onClick={() => setModalOpen(true)}
                >
                  {r.viewFullRanking}
                </Button>
              </div>
            </div>

            <div className={styles.dockRow}>
              <div className={styles.dockMain}>
                <span className={styles.dockLabel}>
                  {r.myTeamRankPinnedTitle}
                </span>
                <span className={styles.dockRank}>{teamRankText}</span>
                <span className={styles.dockName}>
                  {myTeamRow?.displayName ||
                    fallbackCompanyName ||
                    r.noTeamJoined}
                </span>
              </div>
              <div className={styles.dockMetrics}>
                <span>
                  {r.cScoreColumn}: {formatScore(myTeamRow?.cScore)}
                </span>
                <span>
                  {r.eScoreColumn}: {formatScore(myTeamRow?.eScore)}
                </span>
                <span>
                  {r.preliminaryTotalColumn}:{' '}
                  <strong>{formatScore(myTeamRow?.totalScore)}</strong>
                </span>
              </div>
            </div>
          </>
        )}
      </aside>

      <Modal
        open={modalOpen}
        title={r.fullRankingModalTitle}
        footer={null}
        width={960}
        centered
        destroyOnClose
        onCancel={() => setModalOpen(false)}
      >
        <Spin spinning={loading}>
          <div className={styles.modalContent}>
            <section className={styles.boardSection}>
              <div className={styles.boardHeader}>
                <h3>{r.enterpriseTopTwentyTitle}</h3>
                <p>{r.fullRankingEnterpriseHint}</p>
              </div>
              <div className={styles.tableWrap}>
                <Table<PreliminaryResult>
                  className={styles.rankTable}
                  size='small'
                  rowKey='subjectId'
                  dataSource={topTwentyTeams}
                  columns={teamColumns}
                  pagination={false}
                  scroll={{ x: 600 }}
                  rowClassName={row =>
                    (me?.team?.id &&
                      (row.subjectId === me.team.id ||
                        row.teamId === me.team.id)) ||
                    (myTeamRow && row.subjectId === myTeamRow.subjectId)
                      ? styles.ownRow
                      : ''
                  }
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={r.notOnBoard}
                      />
                    ),
                  }}
                />
              </div>
            </section>

            <section className={styles.boardSection}>
              <div className={styles.boardHeader}>
                <h3>{r.personalTopFiftyTitle}</h3>
                <p>{r.fullRankingPersonalHint}</p>
              </div>
              <div className={styles.tableWrap}>
                <Table<PreliminaryResult>
                  className={styles.rankTable}
                  size='small'
                  rowKey='subjectId'
                  dataSource={topFiftyPersonal}
                  columns={personalColumns}
                  pagination={false}
                  scroll={{ x: 640 }}
                  rowClassName={row =>
                    (me?.participant?.id &&
                      row.subjectId === me.participant.id) ||
                    (myPersonalRow && row.subjectId === myPersonalRow.subjectId)
                      ? styles.ownRow
                      : ''
                  }
                  locale={{
                    emptyText: (
                      <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description={r.notOnBoard}
                      />
                    ),
                  }}
                />
              </div>
            </section>
          </div>
        </Spin>
      </Modal>
    </>
  );
}
