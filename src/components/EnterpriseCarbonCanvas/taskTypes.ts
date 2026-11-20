export type EnterpriseCarbonTaskOptionValue = string | number;

export const ENTERPRISE_CARBON_TASK_TYPE = {
  ACCOUNTING_FACTOR_COLLECTION: 'accounting_factor_collection',
  ACTIVITY_DATA_COLLECTION: 'activity_data_collection',
} as const;

export type EnterpriseCarbonTaskType =
  (typeof ENTERPRISE_CARBON_TASK_TYPE)[keyof typeof ENTERPRISE_CARBON_TASK_TYPE];

export const ENTERPRISE_CARBON_TASK_TYPES: EnterpriseCarbonTaskType[] = [
  ENTERPRISE_CARBON_TASK_TYPE.ACTIVITY_DATA_COLLECTION,
  ENTERPRISE_CARBON_TASK_TYPE.ACCOUNTING_FACTOR_COLLECTION,
];

export type EnterpriseCarbonTaskAvailabilityItem = {
  activeTaskStatus?: string | null;
  available: boolean;
  reason?: string | null;
};

export type EnterpriseCarbonTaskAvailabilities = Partial<
  Record<EnterpriseCarbonTaskType, EnterpriseCarbonTaskAvailabilityItem>
>;

export const getAvailableEnterpriseCarbonTaskTypes = (
  source?: {
    taskAvailabilities?: EnterpriseCarbonTaskAvailabilities;
  },
  accountingFactorCollectionSupported = false,
) =>
  ENTERPRISE_CARBON_TASK_TYPES.filter(
    taskType =>
      (taskType !== ENTERPRISE_CARBON_TASK_TYPE.ACCOUNTING_FACTOR_COLLECTION ||
        accountingFactorCollectionSupported) &&
      source?.taskAvailabilities?.[taskType]?.available === true,
  );
