import { TrophyOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import I18N from '@src/lang/I18N';
import { withCurrentLocalePrefix } from '@/router/localePath';
import type { RootState } from '@/store';
import { getUserInfo } from '@src/utils';
import { getToken } from '@/utils/cookie';
import { filterPreliminaryByType } from '../../../../awards';
import { hydrateResultsWithMockFallback } from '../../../../mockResults';
import { getCompetitionResults } from '../../../../service';
import type { Me, Overview, PublishedResults } from '../../../../types';
import styles from './index.module.less';

const formatScore = (value?: number | null) =>
  value == null ? '—' : Number(value).toFixed(2);

export default function TaskRankingDock({
  event,
  me,
}: {
  event: Overview;
  me?: Me;
}) {
  const r = I18N.carbonCompetition.resultsUi;
  const location = useLocation();
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

  useEffect(() => {
    let cancelled = false;
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

  const openFullRankingPage = () => {
    const params = new URLSearchParams(location.search);
    params.set('compTab', 'fullRanking');
    const url = `${withCurrentLocalePrefix(
      location.pathname,
    )}?${params.toString()}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

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
            onClick={openFullRankingPage}
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
                onClick={openFullRankingPage}
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
          </div>
        </>
      )}
    </aside>
  );
}
