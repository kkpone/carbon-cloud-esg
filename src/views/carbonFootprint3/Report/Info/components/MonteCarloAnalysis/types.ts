import type { Options } from '../../types';

export type MonteCarloValue = string | number;
export type MonteCarloDistribution =
  | 'NORMAL'
  | 'LOG_NORMAL'
  | 'UNIFORM'
  | 'TRIANGULAR';
export type MonteCarloOrigin = 'MANUAL' | 'DEFAULT' | 'DATA_QUALITY';

export interface MonteCarloParameter {
  id: string;
  qualityCategory?: number;
  dataType: 'activity' | 'factor';
  stage: number;
  sourceType: number;
  sourceName: string;
  unit: string;
  mean: MonteCarloValue | null;
  uncertainty: MonteCarloValue | null;
  standardDeviation?: MonteCarloValue | null;
  distribution?: MonteCarloDistribution;
  uncertaintySource?: MonteCarloOrigin;
  note?: string;
  configuration?: MonteCarloUncertaintyConfig;
  valueHidden?: boolean;
}

export interface MonteCarloConfig {
  iterations: number | null;
  parameters: MonteCarloParameter[];
}

export interface MonteCarloResult {
  calculationId: string;
  mean: MonteCarloValue;
  median: MonteCarloValue;
  standardDeviation: MonteCarloValue;
  lowerConfidence: MonteCarloValue;
  upperConfidence: MonteCarloValue;
  stale?: boolean;
  histogram: {
    lower: MonteCarloValue;
    upper: MonteCarloValue;
    count: number;
    probability: MonteCarloValue;
  }[];
}

export interface MonteCarloTask {
  calculationId: string;
  status: 'QUEUED' | 'RUNNING' | 'SUCCESS' | 'FAILED' | 'STALE';
  progress: number;
  error?: string;
}

export interface MonteCarloState {
  config: MonteCarloConfig;
  /** 页面内的配置读取状态，不随报告提交。 */
  parametersLoaded?: boolean;
  result?: MonteCarloResult;
  description: string;
  calculationId?: string;
  running?: boolean;
  progress?: number;
  stale?: boolean;
  failed?: boolean;
}

export type MonteCarloStates = Record<string, MonteCarloState>;

export interface MonteCarloQualityRow {
  dataType?: number | string;
  uncertain?: MonteCarloValue;
  activityType?: number | string;
  times?: number | string;
  region?: number | string;
  technology?: number | string;
  datas?: number | string;
  methodology?: number | string;
}

export interface MonteCarloParameterResult {
  parameters: MonteCarloParameter[];
  resultStale?: boolean;
}

export interface MonteCarloPreview {
  uncertainty: MonteCarloValue | null;
  standardDeviation: MonteCarloValue | null;
}

export interface MonteCarloRequest {
  reportId?: number;
  accountId: number;
  config?: {
    iterations: MonteCarloConfig['iterations'];
    parameters: Pick<
      MonteCarloParameter,
      | 'id'
      | 'unit'
      | 'mean'
      | 'uncertainty'
      | 'distribution'
      | 'uncertaintySource'
      | 'configuration'
      | 'note'
    >[];
  };
  calculationId?: string;
  reportActivityList?: MonteCarloQualityRow[];
  reportFactoryList?: MonteCarloQualityRow[];
}

export interface MonteCarloUncertaintyConfig {
  reference?: 'GHG_PROTOCOL' | 'ECOINVENT';
  category?: string;
  times?: number;
  region?: number;
  technology?: number;
  datas?: number;
  methodology?: number;
}

export interface MonteCarloOption<T> {
  code: T;
  name: string;
}

export interface MonteCarloOptions {
  distributions: MonteCarloOption<MonteCarloDistribution>[];
  references: MonteCarloOption<
    NonNullable<MonteCarloUncertaintyConfig['reference']>
  >[];
  categories: (MonteCarloOption<string> & {
    reference: NonNullable<MonteCarloUncertaintyConfig['reference']>;
  })[];
  completeness: MonteCarloOption<number>[];
}

export interface MonteCarloScope extends Options {
  monteCarlo: MonteCarloOptions;
}
