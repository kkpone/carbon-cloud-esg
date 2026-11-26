import I18N from '@/lang/I18N';
import type {
  AwardLevel,
  CompetitionAwardMedal,
  CompetitionAwardSummary,
  FinalResult,
  Me,
  PreliminaryResult,
  PublishedResults,
} from './types';

export type MedalTier = Exclude<AwardLevel, 'COMPLETED'>;

const MEDAL_TIERS: MedalTier[] = ['GOLD', 'SILVER', 'BRONZE'];

export function normalizeAwardLevel(
  level?: string | null,
  ranking?: number | null,
): AwardLevel {
  const upper = (level || '').trim().toUpperCase();
  if (upper === 'GOLD' || upper === 'FIRST' || upper === '1') return 'GOLD';
  if (upper === 'SILVER' || upper === 'SECOND' || upper === '2')
    return 'SILVER';
  if (upper === 'BRONZE' || upper === 'THIRD' || upper === '3') return 'BRONZE';
  if (ranking != null && ranking > 0) {
    if (ranking === 1) return 'GOLD';
    if (ranking <= 3) return 'SILVER';
    if (ranking <= 6) return 'BRONZE';
  }
  return 'COMPLETED';
}

export function normalizeFinalAwardLevel(
  level?: string | null,
  ranking?: number | null,
): AwardLevel {
  const upper = (level || '').trim().toUpperCase();
  if (upper === 'GOLD' || upper === 'FIRST' || upper === '1') return 'GOLD';
  if (upper === 'SILVER' || upper === 'SECOND' || upper === '2')
    return 'SILVER';
  if (upper === 'BRONZE' || upper === 'THIRD' || upper === '3') return 'BRONZE';
  if (ranking != null && ranking > 0) {
    if (ranking === 1) return 'GOLD';
    if (ranking === 2) return 'SILVER';
    if (ranking === 3) return 'BRONZE';
  }
  return 'COMPLETED';
}

export function isMedalTier(level: AwardLevel): level is MedalTier {
  return (MEDAL_TIERS as string[]).includes(level);
}

export function getAwardLevelText(level: AwardLevel): string {
  const r = I18N.carbonCompetition.resultsUi;
  if (level === 'GOLD') return r.goldAward;
  if (level === 'SILVER') return r.silverAward;
  if (level === 'BRONZE') return r.bronzeAward;
  return r.completedAward;
}

export function sortByRankAndScore<
  T extends { ranking?: number | null; totalScore?: number | null },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const rankA = a.ranking ?? Number.POSITIVE_INFINITY;
    const rankB = b.ranking ?? Number.POSITIVE_INFINITY;
    if (rankA !== rankB) return rankA - rankB;
    const scoreA = a.totalScore ?? Number.NEGATIVE_INFINITY;
    const scoreB = b.totalScore ?? Number.NEGATIVE_INFINITY;
    return scoreB - scoreA;
  });
}

export function extractFinalResults(batch?: PublishedResults): FinalResult[] {
  if (!batch) return [];
  if (Array.isArray(batch.finalResults) && batch.finalResults.length > 0) {
    return sortByRankAndScore(batch.finalResults).slice(0, 3);
  }
  const finalTyped = (batch.results || []).filter(row => {
    const type = (row.subjectType || '').toUpperCase();
    return type === 'FINAL_TEAM' || type === 'FINAL';
  });
  if (finalTyped.length > 0) {
    return sortByRankAndScore(finalTyped)
      .slice(0, 3)
      .map((row, idx) => ({
        subjectId: row.subjectId,
        teamId: row.teamId || row.subjectId,
        displayName: row.displayName,
        preliminaryScore: row.totalScore,
        totalScore: row.totalScore,
        ranking: row.ranking ?? idx + 1,
        awardLevel: row.awardLevel,
        certificateNo: row.certificateNo,
        issuedAt: row.issuedAt,
      }));
  }
  return [];
}

export function buildAwardMedalMap(batch?: PublishedResults): {
  personalBySubjectId: Map<string, CompetitionAwardMedal>;
  enterpriseByTeamId: Map<string, CompetitionAwardMedal>;
} {
  const personalBySubjectId = new Map<string, CompetitionAwardMedal>();
  const enterpriseByTeamId = new Map<string, CompetitionAwardMedal>();
  if (!batch) return { personalBySubjectId, enterpriseByTeamId };

  const r = I18N.carbonCompetition.resultsUi;
  const personalRows = (batch.results || []).filter(
    row => (row.subjectType || '').toUpperCase() === 'PARTICIPANT',
  );
  for (const row of personalRows) {
    const level = normalizeAwardLevel(row.awardLevel, row.ranking);
    if (isMedalTier(level)) {
      personalBySubjectId.set(row.subjectId, {
        scope: 'PERSONAL',
        level,
        title: I18N.template(r.personalMedalLabel, {
          award: getAwardLevelText(level),
        }),
        recipientName: row.displayName,
        ranking: row.ranking,
      });
    }
  }

  const finalRows = extractFinalResults(batch);
  if (finalRows.length > 0) {
    for (const row of finalRows) {
      const level = normalizeFinalAwardLevel(row.awardLevel, row.ranking);
      const teamKey = row.teamId || row.subjectId;
      if (isMedalTier(level) && teamKey) {
        enterpriseByTeamId.set(teamKey, {
          scope: 'ENTERPRISE',
          level,
          title: I18N.template(r.enterpriseMedalLabel, {
            award: getAwardLevelText(level),
          }),
          recipientName: row.displayName,
          ranking: row.ranking,
        });
      }
    }
  } else {
    const teamRows = (batch.results || []).filter(
      row => (row.subjectType || '').toUpperCase() === 'TEAM',
    );
    for (const row of teamRows) {
      const level = normalizeAwardLevel(row.awardLevel, row.ranking);
      const teamKey = row.teamId || row.subjectId;
      if (isMedalTier(level) && teamKey) {
        enterpriseByTeamId.set(teamKey, {
          scope: 'ENTERPRISE',
          level,
          title: I18N.template(r.enterpriseMedalLabel, {
            award: getAwardLevelText(level),
          }),
          recipientName: row.displayName,
          ranking: row.ranking,
        });
      }
    }
  }

  return { personalBySubjectId, enterpriseByTeamId };
}

export function resolveCurrentUserAwards(
  batch?: PublishedResults,
  me?: Me,
): CompetitionAwardSummary {
  if (!batch || !me) return {};
  const { personalBySubjectId, enterpriseByTeamId } = buildAwardMedalMap(batch);
  const participantId = me.participant?.id;
  const teamId = me.team?.id;
  const personal = participantId
    ? personalBySubjectId.get(participantId)
    : undefined;
  const enterprise = teamId ? enterpriseByTeamId.get(teamId) : undefined;
  return { personal, enterprise };
}

export function buildCertificateNumber(params: {
  competitionCode?: string;
  scope: 'PERSONAL' | 'ENTERPRISE';
  subjectId?: string;
  batchVersion?: number;
  explicitNo?: string;
}) {
  if (params.explicitNo && params.explicitNo.trim()) {
    return params.explicitNo.trim();
  }
  const yearMatch = (params.competitionCode || '').match(/20\d{2}/);
  const year = yearMatch ? yearMatch[0] : '2026';
  const trackTag = params.scope === 'PERSONAL' ? 'P' : 'E';
  const suffix = (params.subjectId || '000000')
    .replace(/[^0-9A-Za-z]/g, '')
    .slice(-6)
    .toUpperCase()
    .padStart(6, '0');
  const ver = params.batchVersion ? `V${params.batchVersion}` : 'V1';
  return `CCMA-${year}-${trackTag}${ver}-${suffix}`;
}

export function filterPreliminaryByType(
  batch: PublishedResults | undefined,
  subjectType: 'TEAM' | 'PARTICIPANT',
): PreliminaryResult[] {
  if (!batch?.results) return [];
  return sortByRankAndScore(
    batch.results.filter(
      row => (row.subjectType || '').toUpperCase() === subjectType,
    ),
  );
}
