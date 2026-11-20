import { QUICK_ACCOUNT_LIFE_CYCLE } from '@/views/carbonFootprint3/constant';
import type { QuickAccountLifeCycleStage } from '@/views/carbonFootprint3/type';
import type {
  GlobalFactorPreferenceFormValues,
  SourceConfiguration,
  FactorDatabaseSourceOption,
  FactorSourceId,
} from './type';

export const preferenceStages = Object.values(QUICK_ACCOUNT_LIFE_CYCLE);

export const resolveSourceIdsByOptions = (
  sourceIds: FactorSourceId[] = [],
  sourceOptions: FactorDatabaseSourceOption[] = [],
) => {
  if (sourceOptions.length === 0) {
    return sourceIds.filter(
      sourceId =>
        sourceId !== undefined && sourceId !== null && sourceId !== '',
    );
  }
  const resolvedSourceIds = new Map<string, FactorSourceId>();
  sourceIds.forEach(sourceId => {
    const matchedOption = sourceOptions.find(
      option => String(option.id) === String(sourceId),
    );
    if (matchedOption) {
      resolvedSourceIds.set(String(matchedOption.id), matchedOption.id);
    }
  });
  return Array.from(resolvedSourceIds.values());
};

export function getPreferenceSourceIds(
  value: SourceConfiguration,
  stage?: number,
) {
  if (value.stageEnabled !== 1) return value.sourceIds;
  return stage === undefined
    ? []
    : value.stageSourceIds?.[stage as QuickAccountLifeCycleStage] ?? [];
}

export function getPreferenceSaveValues(
  values: SourceConfiguration & { name: string; remark?: string },
  sourceOptions: FactorDatabaseSourceOption[] = [],
): GlobalFactorPreferenceFormValues {
  const { name, remark, stageEnabled, sourceIds, stageSourceIds } = values;
  return {
    name,
    remark,
    stageEnabled,
    ...(stageEnabled === 1
      ? {
          stageSourceIds: Object.fromEntries(
            Object.entries(stageSourceIds).map(([stage, ids]) => [
              stage,
              resolveSourceIdsByOptions(ids ?? [], sourceOptions),
            ]),
          ),
        }
      : { sourceIds: resolveSourceIdsByOptions(sourceIds, sourceOptions) }),
  };
}
