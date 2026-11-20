import { useEffect, useRef } from 'react';

import { getGlobalFactorPreferencePlanInfo } from '@/views/carbonFootprint3/FootprintAccount/component/GlobalFactorPreference/service';

export function useFactorPreferenceStage({
  enabled,
  visible,
  factorPrefId,
  stage,
  recordKey,
}: {
  enabled?: boolean;
  visible: boolean;
  factorPrefId?: number | string;
  stage?: number;
  recordKey: string;
}) {
  const id = Number(factorPrefId);
  const currentKey = `${enabled}:${visible}:${id}:${stage}:${recordKey}`;
  const latestKey = useRef(currentKey);
  latestKey.current = currentKey;
  useEffect(() => {
    latestKey.current = currentKey;
    return () => {
      latestKey.current = '';
    };
  }, [currentKey]);

  // Resolve on matching, not on drawer initialization.
  return async (): Promise<{ stage?: number } | undefined> => {
    if (!visible || latestKey.current !== currentKey) return undefined;
    if (
      !enabled ||
      !Number.isFinite(id) ||
      id <= 0 ||
      stage === undefined ||
      !Number.isInteger(stage) ||
      stage < 0 ||
      stage > 4
    )
      return {};
    const plan = await getGlobalFactorPreferencePlanInfo(id).catch(
      () => undefined,
    );
    if (latestKey.current !== currentKey) return undefined;
    return plan?.stageEnabled === 1 ? { stage } : {};
  };
}
