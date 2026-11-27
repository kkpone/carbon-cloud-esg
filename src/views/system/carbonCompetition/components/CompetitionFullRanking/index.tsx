import { ArrowLeftOutlined, ReloadOutlined } from '@ant-design/icons';
import { Alert, Button, Empty, Spin, Table } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import I18N from '@src/lang/I18N';
import type { RootState } from '@/store';
import { getUserInfo } from '@src/utils';
import { getToken } from '@/utils/cookie';
import { filterPreliminaryByType } from '../../awards';
import { hydrateResultsWithMockFallback } from '../../mockResults';
import { getCompetitionResults } from '../../service';
import type {
  Me,
  Overview,
  PreliminaryResult,
  PublishedResults,
} from '../../types';
import CompetitionRankBadge from '../CompetitionRankBadge';
import styles from './index.module.less';

const formatScore = (value?: number | null) =>
  value == null ? '—' : Number(value).toFixed(2);

const formatBonus = (value?: number | null) =>
  value == null ? '—' : `${(Number(value) * 100).toFixed(0)}%`;

export default function CompetitionFullRanking({
  event,
  me,
  onBack,
}: {
  event: Overview;
  me?: Me;
  onBack: () => void;
}) {
  const t = I18N.carbonCompetition;
  const r = t.resultsUi;
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getCompetitionResults(event.code);
      setRawBatch(result);
    } catch {
      setRawBatch({
        id: 'mock-fallback-batch',
        status: 'PUBLISHED',
        batchVersion: 1,
        results: [],
      });
    } finally {
      setLoading(false);
    }
  }, [event.code]);

  useEffect(() => {
    load();
  }, [load]);

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
  const topTwentyPersonal = useMemo(
    () => personalRows.slice(0, 20),
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
      width: 84,
      render: (_value, row, index) => renderRank(row.ranking, index),
    },
    {
      title: r.companyColumn,
      minWidth: 160,
      render: (_value, row) => {
        const isOwn = Boolean(
          (me?.team?.id &&
            (row.subjectId === me.team.id || row.teamId === me.team.id)) ||
            (myTeamRow && row.subjectId === myTeamRow.subjectId),
        );
        return (
          <span>
            <span className={styles.subjectName}>{row.displayName}</span>
            {isOwn ? (
              <span className={styles.selfTag}>{r.myTeamSuffix}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      title: r.memberCountColumn,
      width: 96,
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
  ];

  const personalColumns: ColumnsType<PreliminaryResult> = [
    {
      title: r.rankColumn,
      width: 84,
      render: (_value, row, index) => renderRank(row.ranking, index),
    },
    {
      title: r.nameColumn,
      minWidth: 150,
      render: (_value, row) => {
        const isOwn = Boolean(
          (me?.participant?.id && row.subjectId === me.participant.id) ||
            (myPersonalRow && row.subjectId === myPersonalRow.subjectId),
        );
        return (
          <span>
            <span className={styles.subjectName}>{row.displayName}</span>
            {isOwn ? (
              <span className={styles.selfTag}>{r.selfSuffix}</span>
            ) : null}
          </span>
        );
      },
    },
    {
      title: r.bonusColumn,
      width: 100,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatBonus(row.bonusRate)}</span>
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
    <section className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <h1>{r.fullRankingModalTitle}</h1>
          {rawBatch?.publishedAt ? (
            <p>
              {t.publishedAt}:{' '}
              {dayjs(rawBatch.publishedAt).format('YYYY-MM-DD HH:mm:ss')} ·{' '}
              {t.resultVersion} {rawBatch.batchVersion}
            </p>
          ) : null}
        </div>
        <div className={styles.headerActions}>
          <Button
            icon={<ReloadOutlined />}
            loading={loading}
            onClick={() => load()}
          >
            {t.retry}
          </Button>
          <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
            {r.backToTasks}
          </Button>
        </div>
      </header>

      {usingMockData ? (
        <Alert type='info' showIcon message={r.mockDataNotice} />
      ) : null}

      <Spin spinning={loading}>
        <div className={styles.boardsStack}>
          <div className={styles.boardsGrid}>
            <section className={styles.boardSection}>
              <div className={styles.boardHeader}>
                <h2>{r.enterpriseTopTwentyTitle}</h2>
                <p>{r.fullRankingEnterpriseHint}</p>
              </div>
              <div className={styles.tableCard}>
                <Table<PreliminaryResult>
                  className={styles.rankTable}
                  rowKey='subjectId'
                  dataSource={topTwentyTeams}
                  columns={teamColumns}
                  pagination={false}
                  scroll={{ x: 460 }}
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
                <h2>{r.personalTopTwentyTitle}</h2>
                <p>{r.fullRankingPersonalHint}</p>
              </div>
              <div className={styles.tableCard}>
                <Table<PreliminaryResult>
                  className={styles.rankTable}
                  rowKey='subjectId'
                  dataSource={topTwentyPersonal}
                  columns={personalColumns}
                  pagination={false}
                  scroll={{ x: 360 }}
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

          {authenticated ? (
            <div className={styles.pinnedDock}>
              <div className={styles.pinnedRow}>
                <div className={styles.pinnedMain}>
                  <span className={styles.pinnedLabel}>
                    {r.myRankPinnedTitle}
                  </span>
                  <span className={styles.pinnedRank}>{personalRankText}</span>
                  <span className={styles.subjectName}>
                    {myPersonalRow?.displayName || fallbackUserName || '—'}
                  </span>
                </div>
                <div className={styles.pinnedMetrics}>
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
                </div>
              </div>

              <div className={styles.pinnedRow}>
                <div className={styles.pinnedMain}>
                  <span className={styles.pinnedLabel}>
                    {r.myTeamRankPinnedTitle}
                  </span>
                  <span className={styles.pinnedRank}>{teamRankText}</span>
                  <span className={styles.subjectName}>
                    {myTeamRow?.displayName ||
                      fallbackCompanyName ||
                      r.noTeamJoined}
                  </span>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Spin>
    </section>
  );
}
