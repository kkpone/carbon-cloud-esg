import { useEffect, useState } from 'react';
import { getToken } from '@/utils/cookie';
import { resolveCurrentUserAwards } from '../carbonCompetition/awards';
import {
  call,
  getCompetitionResults,
  overview,
  prefix,
} from '../carbonCompetition/service';
import type { CompetitionAwardSummary, Me } from '../carbonCompetition/types';

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
      const [batch, me] = await Promise.all([
        getCompetitionResults(event.code).catch(() => undefined),
        call<Me>(`${prefix(event.id)}/me`).catch(() => undefined),
      ]);
      const summary = resolveCurrentUserAwards(batch, me);
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
  const [awards, setAwards] = useState<CompetitionAwardSummary>({});

  useEffect(() => {
    const token = authenticated ? getToken() : '';
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
  }, [authenticated]);

  return awards;
}
