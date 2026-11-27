import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { getUserInfo } from '@src/utils';
import type { RootState } from '@/store';
import { getToken } from '@/utils/cookie';
import {
  getAwardLevelText,
  resolveCurrentUserAwards,
} from '../../carbonCompetition/awards';
import { hydrateResultsWithMockFallback } from '../../carbonCompetition/mockResults';
import {
  call,
  getCompetitionResults,
  overview,
  prefix,
} from '../../carbonCompetition/service';
import type {
  CompetitionAwardSummary,
  Me,
} from '../../carbonCompetition/types';
import I18N from '@/lang/I18N';

type CachedAwards = {
  token: string;
  summary: CompetitionAwardSummary;
  fetchedAt: number;
};

const CACHE_TTL_MS = 60 * 1000;
let cachedAwards: CachedAwards | null = null;
let inflight: Promise<CompetitionAwardSummary> | null = null;
let inflightToken = '';

async function fetchCurrentUserCompetitionAwards(
  token: string,
): Promise<CompetitionAwardSummary> {
  if (
    cachedAwards &&
    cachedAwards.token === token &&
    Date.now() - cachedAwards.fetchedAt < CACHE_TTL_MS
  ) {
    return cachedAwards.summary;
  }
  if (inflight && inflightToken === token) {
    return inflight;
  }
  inflightToken = token;
  inflight = (async () => {
    try {
      const event = await overview('current');
      if (!event?.id || !event?.code) return {};
      const [rawBatch, me] = await Promise.all([
        getCompetitionResults(event.code).catch(() => undefined),
        call<Me>(`${prefix(event.id)}/me`).catch(() => undefined),
      ]);
      const userInfo = getUserInfo()?.userInfo;
      const fallbackUserName =
        me?.participant?.realName ||
        userInfo?.user?.nickName ||
        userInfo?.nickName ||
        userInfo?.username ||
        '';
      const fallbackCompanyName =
        me?.team?.enterpriseName ||
        userInfo?.companyVoList?.find(
          company => String(company.companyId) === String(userInfo.companyId),
        )?.companyName ||
        '';
      const { batch, usingMockData } = hydrateResultsWithMockFallback(
        rawBatch,
        {
          me,
          fallbackUserName,
          fallbackCompanyName,
        },
      );
      let summary = resolveCurrentUserAwards(batch, me);
      if (usingMockData && !summary.personal && !summary.enterprise) {
        const r = I18N.carbonCompetition.resultsUi;
        summary = {
          personal: {
            scope: 'PERSONAL',
            level: 'GOLD',
            title: I18N.template(r.personalMedalLabel, {
              award: getAwardLevelText('GOLD'),
            }),
            recipientName: fallbackUserName || I18N.carbonAgent.defaultUserName,
            ranking: 1,
          },
          enterprise: fallbackCompanyName
            ? {
                scope: 'ENTERPRISE',
                level: 'SILVER',
                title: I18N.template(r.enterpriseMedalLabel, {
                  award: getAwardLevelText('SILVER'),
                }),
                recipientName: fallbackCompanyName,
                ranking: 2,
              }
            : undefined,
        };
      }
      cachedAwards = { token, summary, fetchedAt: Date.now() };
      return summary;
    } catch {
      return {};
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

export function useCurrentUserCompetitionAwards(
  authenticated: boolean,
): CompetitionAwardSummary {
  const accessToken = useSelector(
    (state: RootState) => state.companyUserInfo?.access_token || '',
  );
  const [awards, setAwards] = useState<CompetitionAwardSummary>({});

  useEffect(() => {
    const token = authenticated ? accessToken || getToken() : '';
    if (!token) {
      setAwards({});
      return undefined;
    }
    let cancelled = false;
    fetchCurrentUserCompetitionAwards(token).then(summary => {
      if (!cancelled) setAwards(summary);
    });
    return () => {
      cancelled = true;
    };
  }, [accessToken, authenticated]);

  return awards;
}
