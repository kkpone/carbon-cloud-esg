export interface SensitivityItem {
  id: string;
  dataType: 'activity' | 'factor';
  dataTypeName: string;
  stageNames: string;
  sourceNames: string;
  sourceTypes: string;
  sensitivity: string;
}

export interface SensitivityConfig {
  scope: string;
  description: string;
}

export type SensitivityConfigs = Record<string, SensitivityConfig>;
