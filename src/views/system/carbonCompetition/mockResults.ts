import type {
  FinalResult,
  Me,
  PreliminaryResult,
  PublishedResults,
} from './types';

const MOCK_TEAM_ROWS: PreliminaryResult[] = [
  {
    subjectType: 'TEAM',
    subjectId: 'mock-team-01',
    teamId: 'mock-team-01',
    displayName: '绿能智造科技集团有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 57.6,
    eScore: 38.4,
    bonusRate: 0.1,
    totalScore: 105.6,
    ranking: 1,
    qualified: 1,
    awardLevel: 'GOLD',
    certificateNo: 'CCMA-2026-EV31-000001',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectType: 'TEAM',
    subjectId: 'mock-team-02',
    teamId: 'mock-team-02',
    displayName: '远景碳联新能源有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 56.2,
    eScore: 37.8,
    bonusRate: 0.08,
    totalScore: 101.52,
    ranking: 2,
    qualified: 1,
    awardLevel: 'SILVER',
    certificateNo: 'CCMA-2026-EV31-000002',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectType: 'TEAM',
    subjectId: 'mock-team-03',
    teamId: 'mock-team-03',
    displayName: '华碳零排工业股份有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 55.4,
    eScore: 36.9,
    bonusRate: 0.08,
    totalScore: 99.68,
    ranking: 3,
    qualified: 1,
    awardLevel: 'BRONZE',
    certificateNo: 'CCMA-2026-EV31-000003',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectType: 'TEAM',
    subjectId: 'mock-team-04',
    teamId: 'mock-team-04',
    displayName: '新瑞精密制造（苏州）有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 54.1,
    eScore: 36.2,
    bonusRate: 0.06,
    totalScore: 95.72,
    ranking: 4,
    qualified: 1,
  },
  {
    subjectType: 'TEAM',
    subjectId: 'mock-team-05',
    teamId: 'mock-team-05',
    displayName: '清源绿色建材集团',
    trackSnapshot: 'ENTERPRISE',
    cScore: 53.5,
    eScore: 35.4,
    bonusRate: 0.06,
    totalScore: 94.23,
    ranking: 5,
    qualified: 1,
  },
  {
    subjectType: 'TEAM',
    subjectId: 'mock-team-06',
    teamId: 'mock-team-06',
    displayName: '星海供应链科技有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 52.8,
    eScore: 34.9,
    bonusRate: 0.04,
    totalScore: 91.21,
    ranking: 6,
    qualified: 1,
  },
  {
    subjectType: 'TEAM',
    subjectId: 'mock-team-07',
    teamId: 'mock-team-07',
    displayName: '中科低碳新材料研究院',
    trackSnapshot: 'ENTERPRISE',
    cScore: 51.6,
    eScore: 34.5,
    bonusRate: 0.04,
    totalScore: 89.54,
    ranking: 7,
    qualified: 1,
  },
  {
    subjectType: 'TEAM',
    subjectId: 'mock-team-08',
    teamId: 'mock-team-08',
    displayName: '海川智慧能源有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 50.9,
    eScore: 33.8,
    bonusRate: 0.04,
    totalScore: 88.09,
    ranking: 8,
    qualified: 1,
  },
  {
    subjectType: 'TEAM',
    subjectId: 'mock-team-09',
    teamId: 'mock-team-09',
    displayName: '云杉环保装备股份公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 49.8,
    eScore: 33.4,
    bonusRate: 0.02,
    totalScore: 84.86,
    ranking: 9,
    qualified: 1,
  },
  {
    subjectType: 'TEAM',
    subjectId: 'mock-team-10',
    teamId: 'mock-team-10',
    displayName: '博雅循环包装有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 49.1,
    eScore: 32.7,
    bonusRate: 0.02,
    totalScore: 83.44,
    ranking: 10,
    qualified: 1,
  },
];

const MOCK_PERSONAL_ROWS: PreliminaryResult[] = [
  {
    subjectType: 'PARTICIPANT',
    subjectId: 'mock-person-01',
    teamId: 'mock-team-01',
    displayName: '陈思远',
    teamNameSnapshot: '绿能智造科技集团有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 58.5,
    eScore: 39.2,
    bonusRate: 0.1,
    totalScore: 107.47,
    ranking: 1,
    qualified: 1,
    awardLevel: 'GOLD',
    certificateNo: 'CCMA-2026-PV31-000001',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectType: 'PARTICIPANT',
    subjectId: 'mock-person-02',
    teamId: 'mock-team-02',
    displayName: '林若曦',
    teamNameSnapshot: '远景碳联新能源有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 57.1,
    eScore: 38.5,
    bonusRate: 0.08,
    totalScore: 103.25,
    ranking: 2,
    qualified: 1,
    awardLevel: 'SILVER',
    certificateNo: 'CCMA-2026-PV31-000002',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectType: 'PARTICIPANT',
    subjectId: 'mock-person-03',
    displayName: '周明轩',
    trackSnapshot: 'INDIVIDUAL',
    cScore: 56.4,
    eScore: 37.9,
    bonusRate: 0.08,
    totalScore: 101.84,
    ranking: 3,
    qualified: 1,
    awardLevel: 'SILVER',
    certificateNo: 'CCMA-2026-PV31-000003',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectType: 'PARTICIPANT',
    subjectId: 'mock-person-04',
    teamId: 'mock-team-03',
    displayName: '许嘉禾',
    teamNameSnapshot: '华碳零排工业股份有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 55.6,
    eScore: 36.8,
    bonusRate: 0.06,
    totalScore: 97.94,
    ranking: 4,
    qualified: 1,
    awardLevel: 'BRONZE',
    certificateNo: 'CCMA-2026-PV31-000004',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectType: 'PARTICIPANT',
    subjectId: 'mock-person-05',
    teamId: 'mock-team-01',
    displayName: '宋知行',
    teamNameSnapshot: '绿能智造科技集团有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 54.9,
    eScore: 36.4,
    bonusRate: 0.06,
    totalScore: 96.78,
    ranking: 5,
    qualified: 1,
    awardLevel: 'BRONZE',
    certificateNo: 'CCMA-2026-PV31-000005',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectType: 'PARTICIPANT',
    subjectId: 'mock-person-06',
    displayName: '陆景深',
    trackSnapshot: 'INDIVIDUAL',
    cScore: 54.2,
    eScore: 35.9,
    bonusRate: 0.06,
    totalScore: 95.51,
    ranking: 6,
    qualified: 1,
    awardLevel: 'BRONZE',
    certificateNo: 'CCMA-2026-PV31-000006',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectType: 'PARTICIPANT',
    subjectId: 'mock-person-07',
    teamId: 'mock-team-02',
    displayName: '唐清晏',
    teamNameSnapshot: '远景碳联新能源有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 53.3,
    eScore: 35.1,
    bonusRate: 0.04,
    totalScore: 91.94,
    ranking: 7,
    qualified: 1,
  },
  {
    subjectType: 'PARTICIPANT',
    subjectId: 'mock-person-08',
    teamId: 'mock-team-04',
    displayName: '顾念安',
    teamNameSnapshot: '新瑞精密制造（苏州）有限公司',
    trackSnapshot: 'ENTERPRISE',
    cScore: 52.5,
    eScore: 34.6,
    bonusRate: 0.04,
    totalScore: 90.58,
    ranking: 8,
    qualified: 1,
  },
  {
    subjectType: 'PARTICIPANT',
    subjectId: 'mock-person-09',
    displayName: '沈亦辰',
    trackSnapshot: 'INDIVIDUAL',
    cScore: 51.8,
    eScore: 34.2,
    bonusRate: 0.02,
    totalScore: 87.72,
    ranking: 9,
    qualified: 1,
  },
  {
    subjectType: 'PARTICIPANT',
    subjectId: 'mock-person-10',
    teamId: 'mock-team-05',
    displayName: '何语桐',
    teamNameSnapshot: '清源绿色建材集团',
    trackSnapshot: 'ENTERPRISE',
    cScore: 51.0,
    eScore: 33.7,
    bonusRate: 0.02,
    totalScore: 86.39,
    ranking: 10,
    qualified: 1,
  },
];

const MOCK_FINAL_ROWS: FinalResult[] = [
  {
    subjectId: 'mock-team-01',
    teamId: 'mock-team-01',
    displayName: '绿能智造科技集团有限公司',
    preliminaryScore: 105.6,
    rScore: 19.2,
    oScore: 9.5,
    sScore: 19.1,
    finalScore: 47.8,
    totalScore: 153.4,
    ranking: 1,
    awardLevel: 'GOLD',
    certificateNo: 'CCMA-2026-EV31-F00001',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectId: 'mock-team-02',
    teamId: 'mock-team-02',
    displayName: '远景碳联新能源有限公司',
    preliminaryScore: 101.52,
    rScore: 18.4,
    oScore: 9.1,
    sScore: 18.6,
    finalScore: 46.1,
    totalScore: 147.62,
    ranking: 2,
    awardLevel: 'SILVER',
    certificateNo: 'CCMA-2026-EV31-F00002',
    issuedAt: '2026-11-26T10:00:00Z',
  },
  {
    subjectId: 'mock-team-03',
    teamId: 'mock-team-03',
    displayName: '华碳零排工业股份有限公司',
    preliminaryScore: 99.68,
    rScore: 17.8,
    oScore: 8.8,
    sScore: 18.2,
    finalScore: 44.8,
    totalScore: 144.48,
    ranking: 3,
    awardLevel: 'BRONZE',
    certificateNo: 'CCMA-2026-EV31-F00003',
    issuedAt: '2026-11-26T10:00:00Z',
  },
];

export function hydrateResultsWithMockFallback(
  batch: PublishedResults | undefined,
  options: {
    me?: Me;
    fallbackUserName?: string;
    fallbackCompanyName?: string;
  } = {},
): { batch: PublishedResults | undefined; usingMockData: boolean } {
  if (!batch?.id) return { batch, usingMockData: false };

  const rawRows = batch.results || [];
  const rawTeams = rawRows.filter(
    row => (row.subjectType || '').toUpperCase() === 'TEAM',
  );
  const rawPersonal = rawRows.filter(
    row => (row.subjectType || '').toUpperCase() === 'PARTICIPANT',
  );
  const rawFinal = batch.finalResults || [];

  const teamsHaveScores =
    rawTeams.length > 0 &&
    rawTeams.some(row => row.totalScore != null || row.ranking != null);
  const personalHasScores =
    rawPersonal.length > 0 &&
    rawPersonal.some(row => row.totalScore != null || row.ranking != null);
  const finalHasData = rawFinal.length > 0;

  let usingMockData = false;

  const teamResults: PreliminaryResult[] = teamsHaveScores
    ? rawTeams
    : MOCK_TEAM_ROWS.map((mockRow, index) => {
        const real = rawTeams[index];
        usingMockData = true;
        return {
          ...mockRow,
          subjectId: real?.subjectId || mockRow.subjectId,
          teamId: real?.teamId || real?.subjectId || mockRow.teamId,
          displayName: real?.displayName || mockRow.displayName,
        };
      });

  const personalResults: PreliminaryResult[] = personalHasScores
    ? rawPersonal
    : (() => {
        usingMockData = true;
        return MOCK_PERSONAL_ROWS.map(row => {
          const teamIdx = MOCK_TEAM_ROWS.findIndex(
            team => team.subjectId === row.teamId,
          );
          if (teamIdx >= 0 && teamResults[teamIdx]) {
            return {
              ...row,
              teamId:
                teamResults[teamIdx].teamId || teamResults[teamIdx].subjectId,
              teamNameSnapshot: teamResults[teamIdx].displayName,
            };
          }
          return { ...row };
        });
      })();

  const finalResults: FinalResult[] = finalHasData
    ? rawFinal
    : (() => {
        usingMockData = true;
        return MOCK_FINAL_ROWS.map((row, index) => {
          const linkedTeam = teamResults[index];
          return {
            ...row,
            subjectId: linkedTeam?.subjectId || row.subjectId,
            teamId: linkedTeam?.teamId || linkedTeam?.subjectId || row.teamId,
            displayName: linkedTeam?.displayName || row.displayName,
            preliminaryScore: linkedTeam?.totalScore ?? row.preliminaryScore,
            totalScore: Number(
              (
                (linkedTeam?.totalScore ?? row.preliminaryScore ?? 0) +
                (row.finalScore ?? 0)
              ).toFixed(2),
            ),
          };
        });
      })();

  const { me, fallbackUserName, fallbackCompanyName } = options;

  // 若当前登录用户 / 所属企业不在返回榜单中且正在使用模拟数据时，补充一条前十之外的模拟记录用于演示底部固定栏。
  const extraRows: PreliminaryResult[] = [];
  if (usingMockData) {
    const myParticipantId = me?.participant?.id || 'mock-current-user';
    const hasMyPersonal = personalResults.some(
      row => row.subjectId === myParticipantId,
    );
    if (!hasMyPersonal && (me?.participant?.realName || fallbackUserName)) {
      extraRows.push({
        subjectType: 'PARTICIPANT',
        subjectId: myParticipantId,
        teamId: me?.team?.id || 'mock-current-team',
        displayName: me?.participant?.realName || fallbackUserName || '',
        teamNameSnapshot: me?.team?.enterpriseName || fallbackCompanyName,
        trackSnapshot:
          me?.team || fallbackCompanyName ? 'ENTERPRISE' : 'INDIVIDUAL',
        cScore: 47.4,
        eScore: 31.2,
        bonusRate: 0.04,
        totalScore: 81.74,
        ranking: 14,
        qualified: 0,
        certificateNo: 'CCMA-2026-PV31-000014',
        issuedAt: batch.publishedAt || '2026-11-26T10:00:00Z',
      });
    }

    const myTeamId = me?.team?.id || 'mock-current-team';
    const hasMyTeam = teamResults.some(
      row =>
        row.subjectId === myTeamId ||
        row.teamId === myTeamId ||
        (fallbackCompanyName && row.displayName === fallbackCompanyName),
    );
    if (!hasMyTeam && (me?.team?.enterpriseName || fallbackCompanyName)) {
      extraRows.push({
        subjectType: 'TEAM',
        subjectId: myTeamId,
        teamId: myTeamId,
        displayName: me?.team?.enterpriseName || fallbackCompanyName || '',
        trackSnapshot: 'ENTERPRISE',
        cScore: 46.8,
        eScore: 30.6,
        bonusRate: 0.04,
        totalScore: 80.5,
        ranking: 12,
        qualified: 0,
        certificateNo: 'CCMA-2026-EV31-000012',
        issuedAt: batch.publishedAt || '2026-11-26T10:00:00Z',
      });
    }
  }

  return {
    usingMockData,
    batch: {
      ...batch,
      results: [...teamResults, ...personalResults, ...extraRows],
      finalResults,
      finalStatus: batch.finalStatus || 'PUBLISHED',
      finalPublishedAt:
        batch.finalPublishedAt || batch.publishedAt || '2026-11-26T10:00:00Z',
    },
  };
}
