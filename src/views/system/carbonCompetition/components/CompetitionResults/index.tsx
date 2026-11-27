import { FileImageOutlined, TrophyOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Empty,
  Segmented,
  Spin,
  Table,
  Tabs,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useLocation } from 'react-router-dom';
import I18N from '@src/lang/I18N';
import type { RootState } from '@/store';
import { getUserInfo } from '@src/utils';
import { getToken } from '@/utils/cookie';
import CompetitionAwardMedals from '../../../components/CompetitionAwardMedals';
import {
  buildAwardMedalMap,
  buildCertificateNumber,
  extractFinalResults,
  filterPreliminaryByType,
  getAwardLevelText,
  isMedalTier,
  normalizeAwardLevel,
  normalizeFinalAwardLevel,
} from '../../awards';
import { hydrateResultsWithMockFallback } from '../../mockResults';
import {
  createCompetitionPoster,
  getCompetitionPoster,
  getCompetitionResults,
} from '../../service';
import type {
  FinalResult,
  Me,
  Overview,
  Poster,
  PreliminaryResult,
  PublishedResults,
} from '../../types';
import CompetitionRankBadge from '../CompetitionRankBadge';
import ResultPosterModal, {
  type CertificatePosterPayload,
} from './components/ResultPosterModal';
import styles from './index.module.less';

type StageTab = 'PRELIMINARY' | 'FINAL';
type BoardGroup = 'TEAM' | 'PARTICIPANT';

const formatScore = (value?: number | null) =>
  value == null ? '—' : Number(value).toFixed(2);

const formatBonus = (value?: number | null) =>
  value == null ? '—' : `${(Number(value) * 100).toFixed(0)}%`;

export default function CompetitionResults({
  event,
  me,
}: {
  event: Overview;
  me?: Me;
}) {
  const t = I18N.carbonCompetition;
  const r = t.resultsUi;
  const location = useLocation();
  const [batch, setBatch] = useState<PublishedResults>();
  const [stageTab, setStageTab] = useState<StageTab>('PRELIMINARY');
  const [preliminaryGroup, setPreliminaryGroup] = useState<BoardGroup>('TEAM');
  const [finalGroup, setFinalGroup] = useState<BoardGroup>('TEAM');
  const [posterPayload, setPosterPayload] =
    useState<CertificatePosterPayload>();
  const [posterBusy, setPosterBusy] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const buildPayloadFromRemotePoster = useCallback(
    (
      remote: Poster,
      scope: 'PERSONAL' | 'ENTERPRISE',
      fallbackName: string,
      fallbackSubjectId?: string,
      publishedAt?: string,
      batchVersion?: number,
    ): CertificatePosterPayload => {
      const target = remote.finalResult || remote.result;
      const ranking = target?.ranking ?? remote.checkin?.rank ?? undefined;
      const totalScore = target?.totalScore ?? undefined;
      const rawLevel = remote.awardLevel || target?.awardLevel;
      const awardLevel = remote.finalResult
        ? normalizeFinalAwardLevel(rawLevel, ranking)
        : normalizeAwardLevel(rawLevel, ranking);
      return {
        scope,
        recipientName:
          target?.displayName || remote.checkin?.name || fallbackName,
        awardLevel,
        certificateNo: buildCertificateNumber({
          competitionCode: event.code,
          scope,
          subjectId: target?.subjectId || fallbackSubjectId,
          batchVersion,
          explicitNo: remote.certificateNo || target?.certificateNo,
        }),
        issuedAt: remote.issuedAt || target?.issuedAt || publishedAt,
        ranking,
        totalScore,
        shareUrl: remote.shareUrl,
        inviteUrl: remote.inviteUrl,
        inviteEnabled: remote.inviteEnabled,
      };
    },
    [event.code],
  );

  const load = useCallback(async () => {
    setBusy(true);
    setError('');
    try {
      const params = new URLSearchParams(location.search);
      const nextBatch = await getCompetitionResults(
        event.code,
        params.get('kind') === 'CHECKIN'
          ? undefined
          : params.get('batchId') || undefined,
      );
      setBatch(nextBatch);

      const share = params.get('shareCode');
      if (share) {
        const remotePoster = await getCompetitionPoster(event.code, share, {
          kind: params.get('kind') || 'RESULT',
          batchId: params.get('batchId') || nextBatch.id || '',
          inviteCode: params.get('inviteCode') || undefined,
        });
        const scope: 'PERSONAL' | 'ENTERPRISE' =
          (remotePoster.result?.subjectType || '').toUpperCase() === 'TEAM' ||
          remotePoster.finalResult
            ? 'ENTERPRISE'
            : 'PERSONAL';
        setPosterPayload(
          buildPayloadFromRemotePoster(
            remotePoster,
            scope,
            scope === 'ENTERPRISE'
              ? me?.team?.enterpriseName || ''
              : me?.participant?.realName || '',
            remotePoster.result?.subjectId ||
              remotePoster.finalResult?.subjectId,
            nextBatch.publishedAt,
            nextBatch.batchVersion,
          ),
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t.failed);
    } finally {
      setBusy(false);
    }
  }, [
    buildPayloadFromRemotePoster,
    event.code,
    location.search,
    me?.participant?.realName,
    me?.team?.enterpriseName,
    t.failed,
  ]);

  useEffect(() => {
    load();
  }, [load]);

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

  const { batch: effectiveBatch, usingMockData } = useMemo(
    () =>
      hydrateResultsWithMockFallback(batch, {
        me,
        fallbackUserName,
        fallbackCompanyName,
      }),
    [batch, fallbackCompanyName, fallbackUserName, me],
  );

  const teamRows = useMemo(
    () => filterPreliminaryByType(effectiveBatch, 'TEAM'),
    [effectiveBatch],
  );
  const personalRows = useMemo(
    () => filterPreliminaryByType(effectiveBatch, 'PARTICIPANT'),
    [effectiveBatch],
  );
  const finalRows = useMemo(
    () => extractFinalResults(effectiveBatch),
    [effectiveBatch],
  );
  const medalMap = useMemo(
    () => buildAwardMedalMap(effectiveBatch),
    [effectiveBatch],
  );

  const topTenTeams = useMemo(() => teamRows.slice(0, 10), [teamRows]);
  const topTenPersonal = useMemo(
    () => personalRows.slice(0, 10),
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

  const myFinalTeamRow = useMemo(() => {
    if (!me?.team?.id) return undefined;
    return finalRows.find(
      row => row.subjectId === me.team?.id || row.teamId === me.team?.id,
    );
  }, [finalRows, me?.team?.id]);

  const myPersonalInTopTen = useMemo(() => {
    if (!myPersonalRow) return false;
    return topTenPersonal.some(
      row => row.subjectId === myPersonalRow.subjectId,
    );
  }, [myPersonalRow, topTenPersonal]);

  const myTeamInTopTen = useMemo(() => {
    if (!myTeamRow) return false;
    return topTenTeams.some(row => row.subjectId === myTeamRow.subjectId);
  }, [myTeamRow, topTenTeams]);

  const showPinnedPersonal = authenticated && !myPersonalInTopTen;
  const showPinnedTeam = authenticated && !myTeamInTopTen;
  const showPinnedDock = !authenticated || showPinnedPersonal || showPinnedTeam;

  const openPoster = async (scope: 'PERSONAL' | 'ENTERPRISE') => {
    const isEnterprise = scope === 'ENTERPRISE';
    const localRow = isEnterprise ? myFinalTeamRow || myTeamRow : myPersonalRow;
    const demoRow = isEnterprise
      ? finalRows[0] || teamRows[0]
      : personalRows[0];
    const targetRow = localRow || (usingMockData ? demoRow : undefined);
    const recipientName = isEnterprise
      ? targetRow?.displayName ||
        me?.team?.enterpriseName ||
        fallbackCompanyName
      : targetRow?.displayName || me?.participant?.realName || fallbackUserName;

    if (!recipientName) {
      message.warning(isEnterprise ? r.noEnterpriseResult : r.noPersonalResult);
      return;
    }

    const ranking = targetRow?.ranking ?? undefined;
    const localAwardLevel =
      isEnterprise && (myFinalTeamRow || (!localRow && finalRows[0]))
        ? normalizeFinalAwardLevel(targetRow?.awardLevel, ranking)
        : normalizeAwardLevel(targetRow?.awardLevel, ranking);

    const fallbackPayload: CertificatePosterPayload = {
      scope,
      recipientName,
      awardLevel: localAwardLevel,
      certificateNo: buildCertificateNumber({
        competitionCode: event.code,
        scope,
        subjectId:
          targetRow?.subjectId ||
          (isEnterprise ? me?.team?.id : me?.participant?.id),
        batchVersion: batch?.batchVersion,
        explicitNo: targetRow?.certificateNo,
      }),
      issuedAt:
        targetRow?.issuedAt ||
        (isEnterprise && myFinalTeamRow
          ? batch?.finalPublishedAt || batch?.publishedAt
          : batch?.publishedAt),
      ranking,
      totalScore: targetRow?.totalScore ?? undefined,
    };

    setPosterPayload(fallbackPayload);
    if (!authenticated || usingMockData) {
      return;
    }
    setPosterBusy(true);
    try {
      const remote = await createCompetitionPoster(event.id, {
        kind: 'RESULT',
        subjectType: isEnterprise ? 'TEAM' : 'PARTICIPANT',
        batchId: batch?.id,
      });
      setPosterPayload(
        buildPayloadFromRemotePoster(
          remote,
          scope,
          recipientName,
          localRow?.subjectId ||
            (isEnterprise ? me?.team?.id : me?.participant?.id),
          batch?.publishedAt,
          batch?.batchVersion,
        ),
      );
    } catch {
      // 后端海报短链不可用时仍保留本地证书海报预览与图片下载。
    } finally {
      setPosterBusy(false);
    }
  };

  const renderRank = (rank?: number | null, fallbackIndex?: number) => {
    const value = rank ?? (fallbackIndex != null ? fallbackIndex + 1 : null);
    if (value == null) return <span className={styles.rankCell}>—</span>;
    if (value >= 1 && value <= 3) {
      return <CompetitionRankBadge rank={value} />;
    }
    return <span className={styles.rankCell}>{value}</span>;
  };

  const renderFinalEnterpriseRank = (
    row: FinalResult,
    fallbackIndex?: number,
  ) => {
    const value =
      row.ranking ?? (fallbackIndex != null ? fallbackIndex + 1 : null);
    if (value == null) return <span className={styles.rankCell}>—</span>;
    const level = normalizeFinalAwardLevel(row.awardLevel, value);
    if (level === 'GOLD') {
      return (
        <CompetitionRankBadge
          rank={value}
          tier={1}
          hideNumber
          ariaLabel={getAwardLevelText('GOLD')}
        />
      );
    }
    if (level === 'SILVER') {
      return (
        <CompetitionRankBadge
          rank={value}
          tier={2}
          hideNumber
          ariaLabel={getAwardLevelText('SILVER')}
        />
      );
    }
    if (level === 'BRONZE') {
      return (
        <CompetitionRankBadge
          rank={value}
          tier={3}
          hideNumber
          ariaLabel={getAwardLevelText('BRONZE')}
        />
      );
    }
    return <span className={styles.rankCell}>{value}</span>;
  };

  const renderAwardTag = (
    level: ReturnType<typeof normalizeAwardLevel>,
    qualified?: number,
  ) => {
    if (isMedalTier(level)) {
      const color =
        level === 'GOLD' ? 'gold' : level === 'SILVER' ? 'blue' : 'orange';
      return <Tag color={color}>{getAwardLevelText(level)}</Tag>;
    }
    if (qualified === 1) {
      return <Tag color='cyan'>{r.qualifiedTag}</Tag>;
    }
    return <Tag>{r.completedAward}</Tag>;
  };

  const teamColumns: ColumnsType<PreliminaryResult> = [
    {
      title: r.rankColumn,
      width: 84,
      render: (_value, row, index) => renderRank(row.ranking, index),
    },
    {
      title: r.companyColumn,
      minWidth: 220,
      render: (_value, row) => {
        const isOwn = Boolean(
          (me?.team?.id &&
            (row.subjectId === me.team.id || row.teamId === me.team.id)) ||
            (myTeamRow && row.subjectId === myTeamRow.subjectId),
        );
        return (
          <div className={styles.subjectCell}>
            <span className={styles.subjectName}>{row.displayName}</span>
            {isOwn ? (
              <span className={styles.selfTag}>{r.myTeamSuffix}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: r.memberCountColumn,
      width: 120,
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
      width: 100,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatBonus(row.bonusRate)}</span>
      ),
    },
    {
      title: r.awardColumn,
      width: 120,
      render: (_value, row) =>
        row.qualified === 0 ? (
          <Tag>{r.completedAward}</Tag>
        ) : (
          <Tag color='cyan'>{r.qualifiedTag}</Tag>
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
      title: r.participantColumn,
      minWidth: 220,
      render: (_value, row) => {
        const isOwn = Boolean(
          me?.participant?.id && row.subjectId === me.participant.id,
        );
        return (
          <div className={styles.subjectCell}>
            <span className={styles.subjectName}>{row.displayName}</span>
            {isOwn ? (
              <span className={styles.selfTag}>{r.selfSuffix}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: r.cScoreColumn,
      width: 112,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatScore(row.cScore)}</span>
      ),
    },
    {
      title: r.eScoreColumn,
      width: 112,
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
      width: 116,
      render: (_value, row) => (
        <span className={styles.scoreValue}>{formatScore(row.totalScore)}</span>
      ),
    },
  ];

  const finalColumns: ColumnsType<FinalResult> = [
    {
      title: r.rankColumn,
      width: 84,
      render: (_value, row, index) => renderFinalEnterpriseRank(row, index),
    },
    {
      title: r.companyColumn,
      minWidth: 220,
      render: (_value, row) => {
        const isOwn = Boolean(
          me?.team?.id &&
            (row.subjectId === me.team.id || row.teamId === me.team.id),
        );
        return (
          <div className={styles.subjectCell}>
            <span className={styles.subjectName}>{row.displayName}</span>
            {isOwn ? (
              <span className={styles.selfTag}>{r.myTeamSuffix}</span>
            ) : null}
          </div>
        );
      },
    },
    {
      title: r.cShortColumn,
      width: 84,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatScore(row.cScore)}</span>
      ),
    },
    {
      title: r.rShortColumn,
      width: 84,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatScore(row.rScore)}</span>
      ),
    },
    {
      title: r.eShortColumn,
      width: 84,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatScore(row.eScore)}</span>
      ),
    },
    {
      title: r.oShortColumn,
      width: 84,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatScore(row.oScore)}</span>
      ),
    },
    {
      title: r.sShortColumn,
      width: 84,
      render: (_value, row) => (
        <span className={styles.numericCell}>{formatScore(row.sScore)}</span>
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
      title: r.grandTotalColumn,
      width: 114,
      render: (_value, row) => (
        <span className={styles.scoreValue}>{formatScore(row.totalScore)}</span>
      ),
    },
    {
      title: r.awardColumn,
      width: 108,
      render: (_value, row, index) =>
        renderAwardTag(
          normalizeFinalAwardLevel(row.awardLevel, row.ranking ?? index + 1),
        ),
    },
  ];

  const renderPinnedPersonalRow = () => {
    const rankLabel = myPersonalRow
      ? myPersonalRow.ranking != null
        ? I18N.template(r.posterRankSummary, {
            rank: String(myPersonalRow.ranking),
          })
        : r.outsideTopTenBadge
      : me?.participant
      ? r.unrankedStatus
      : r.notRegisteredRank;

    const displayName = myPersonalRow?.displayName || fallbackUserName || '—';
    const personalMedal = myPersonalRow
      ? medalMap.personalBySubjectId.get(myPersonalRow.subjectId)
      : undefined;
    const enterpriseMedal = myPersonalRow?.teamId
      ? medalMap.enterpriseByTeamId.get(myPersonalRow.teamId)
      : me?.team?.id
      ? medalMap.enterpriseByTeamId.get(me.team.id)
      : undefined;

    return (
      <div className={styles.pinnedRow}>
        <div className={styles.pinnedMain}>
          <span className={styles.pinnedLabel}>{r.myRankPinnedTitle}</span>
          <span className={styles.pinnedRank}>{rankLabel}</span>
          <div className={styles.subjectCell}>
            <span className={styles.subjectName}>{displayName}</span>
            <CompetitionAwardMedals
              personal={personalMedal}
              enterprise={enterpriseMedal}
              compact
            />
          </div>
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
    );
  };

  const renderPinnedTeamRow = () => {
    const hasTeam = Boolean(myTeamRow || me?.team || fallbackCompanyName);
    const rankLabel = myTeamRow
      ? myTeamRow.ranking != null
        ? I18N.template(r.posterRankSummary, {
            rank: String(myTeamRow.ranking),
          })
        : r.outsideTopTenBadge
      : hasTeam
      ? r.unrankedStatus
      : r.noTeamJoined;

    const displayName =
      myTeamRow?.displayName || fallbackCompanyName || r.noTeamJoined;
    const teamKey = myTeamRow?.teamId || myTeamRow?.subjectId || me?.team?.id;
    const enterpriseMedal = teamKey
      ? medalMap.enterpriseByTeamId.get(teamKey)
      : undefined;

    return (
      <div className={styles.pinnedRow}>
        <div className={styles.pinnedMain}>
          <span className={styles.pinnedLabel}>{r.myTeamRankPinnedTitle}</span>
          <span className={styles.pinnedRank}>{rankLabel}</span>
          <div className={styles.subjectCell}>
            <span className={styles.subjectName}>{displayName}</span>
            <CompetitionAwardMedals enterprise={enterpriseMedal} compact />
          </div>
        </div>
      </div>
    );
  };

  const renderGroupSwitcher = (
    value: BoardGroup,
    onChange: (next: BoardGroup) => void,
  ) => (
    <div className={styles.groupSwitcherWrap}>
      <Segmented
        className={styles.groupSwitcher}
        size='large'
        value={value}
        options={[
          { value: 'TEAM', label: r.enterpriseGroupTab },
          { value: 'PARTICIPANT', label: r.personalGroupTab },
        ]}
        onChange={next => onChange(next as BoardGroup)}
      />
    </div>
  );

  const renderPreliminaryBoards = () => {
    const isTeam = preliminaryGroup === 'TEAM';
    return (
      <div className={styles.preliminaryStack}>
        <section className={styles.boardSection}>
          {renderGroupSwitcher(preliminaryGroup, setPreliminaryGroup)}
          <div className={styles.boardHeader}>
            <div className={styles.boardTitleGroup}>
              <h2>
                {isTeam ? r.enterpriseTopTenTitle : r.personalTopTenTitle}
              </h2>
              <p>
                {isTeam
                  ? r.preliminaryEnterpriseHint
                  : r.preliminaryPersonalHint}
              </p>
            </div>
          </div>
          <div className={styles.tableCard}>
            {isTeam ? (
              <Table<PreliminaryResult>
                className={styles.resultTable}
                rowKey='subjectId'
                dataSource={topTenTeams}
                columns={teamColumns}
                pagination={false}
                scroll={{ x: 640 }}
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
            ) : (
              <Table<PreliminaryResult>
                className={styles.resultTable}
                rowKey='subjectId'
                dataSource={topTenPersonal}
                columns={personalColumns}
                pagination={false}
                scroll={{ x: 640 }}
                rowClassName={row =>
                  me?.participant?.id && row.subjectId === me.participant.id
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
            )}
          </div>
        </section>

        {showPinnedDock ? (
          <div className={styles.pinnedDock}>
            {!authenticated ? (
              <div className={styles.pinnedRow}>
                <div className={styles.pinnedMain}>
                  <span className={styles.pinnedLabel}>
                    {r.myRankPinnedTitle}
                  </span>
                  <span className={styles.pinnedMuted}>
                    {r.loginToViewMyRank}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {showPinnedPersonal ? renderPinnedPersonalRow() : null}
                {showPinnedTeam ? renderPinnedTeamRow() : null}
              </>
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const renderFinalBoard = () => {
    const isTeam = finalGroup === 'TEAM';
    return (
      <div className={styles.preliminaryStack}>
        <section className={styles.boardSection}>
          {renderGroupSwitcher(finalGroup, setFinalGroup)}
          <div className={styles.boardHeader}>
            <div className={styles.boardTitleGroup}>
              <h2>
                {isTeam ? r.finalTopSixTitle : r.finalPersonalTopTenTitle}
              </h2>
              <p>{isTeam ? r.finalBoardHint : r.finalPersonalHint}</p>
            </div>
          </div>

          {isTeam ? (
            finalRows.length === 0 ? (
              <div className={styles.finalEmpty}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={r.finalPendingHint}
                />
              </div>
            ) : (
              <div className={styles.tableCard}>
                <Table<FinalResult>
                  className={styles.resultTable}
                  rowKey='subjectId'
                  dataSource={finalRows.slice(0, 6)}
                  columns={finalColumns}
                  pagination={false}
                  scroll={{ x: 960 }}
                  rowClassName={row =>
                    me?.team?.id &&
                    (row.subjectId === me.team.id || row.teamId === me.team.id)
                      ? styles.ownRow
                      : ''
                  }
                />
              </div>
            )
          ) : (
            <div className={styles.tableCard}>
              <Table<PreliminaryResult>
                className={styles.resultTable}
                rowKey='subjectId'
                dataSource={topTenPersonal}
                columns={personalColumns}
                pagination={false}
                scroll={{ x: 640 }}
                rowClassName={row =>
                  me?.participant?.id && row.subjectId === me.participant.id
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
          )}
        </section>
      </div>
    );
  };

  return (
    <section className={styles.panel}>
      {error ? <Alert type='error' message={error} showIcon /> : null}

      {batch?.id && (authenticated || usingMockData) ? (
        <div className={styles.toolbar}>
          <div className={styles.posterActions}>
            <Button
              type='primary'
              icon={<FileImageOutlined />}
              onClick={() => openPoster('PERSONAL')}
            >
              {r.generatePersonalPoster}
            </Button>
            {!authenticated || me?.team || fallbackCompanyName ? (
              <Button
                icon={<TrophyOutlined />}
                onClick={() => openPoster('ENTERPRISE')}
              >
                {r.generateEnterprisePoster}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Spin spinning={busy}>
        {!batch?.id ? (
          <Alert type='info' showIcon message={t.notPublished} />
        ) : (
          <Tabs
            className={styles.stageTabs}
            activeKey={stageTab}
            onChange={key => setStageTab(key as StageTab)}
            items={[
              {
                key: 'PRELIMINARY',
                label: r.preliminaryTab,
                children: renderPreliminaryBoards(),
              },
              {
                key: 'FINAL',
                label: r.finalTab,
                children: renderFinalBoard(),
              },
            ]}
          />
        )}
      </Spin>

      <ResultPosterModal
        open={Boolean(posterPayload)}
        payload={posterPayload}
        loading={posterBusy}
        onClose={() => setPosterPayload(undefined)}
      />
    </section>
  );
}
