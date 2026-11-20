import type {
  StatisticsChart,
  StatisticsPeriodType,
  StatisticsScopeType,
} from '../energyStatistics/types';

export type AnalysisKind =
  | 'overview'
  | 'boundary'
  | 'structure'
  | 'form'
  | 'efficiency';
export type SinglePeriodType = 2 | 3 | 4;
export type BoundaryType = 1 | 2 | 3;
export type DecimalValue = number | string;

export interface SinglePeriodAnalysisRequest {
  orgId: number;
  periodType: SinglePeriodType;
  periodDate: string;
  boundaryType?: BoundaryType;
}

export interface EfficiencyAnalysisRequest {
  scopeType: StatisticsScopeType;
  orgId: number;
  boundaryId?: number;
  periodType: StatisticsPeriodType;
  startDate: string;
  endDate: string;
}

export interface MetricComparison {
  change?: DecimalValue | null;
  changeUnit?: string;
  rate?: DecimalValue | null;
}

export interface OverviewMetric {
  value?: DecimalValue | null;
  unit?: string;
  yearOnYear?: MetricComparison | null;
  monthOnMonth?: MetricComparison | null;
}

export interface OverviewResponse {
  comprehensiveEnergy: OverviewMetric;
  energyConsumption: OverviewMetric;
  mediumConsumption: OverviewMetric;
  rawMaterialConsumption: OverviewMetric;
  cleanEnergyRate: OverviewMetric;
  renewableEnergyRate: OverviewMetric;
  energyEfficiency: OverviewMetric;
  outputValueIntensity: OverviewMetric;
  addedValueIntensity: OverviewMetric;
  standardProductIntensity: OverviewMetric;
}

export interface BoundaryAnalysisRow {
  period?: string;
  orgId: number;
  orgName?: string;
  boundaryId: number;
  boundaryName?: string;
  comprehensiveEnergy: DecimalValue;
  cleanEnergyRate?: DecimalValue | null;
  renewableEnergyRate?: DecimalValue | null;
}

export interface BoundaryAnalysisResponse {
  chart: StatisticsChart;
  table: BoundaryAnalysisRow[];
}

export interface StructureSummary {
  cleanEnergyRate?: DecimalValue | null;
  renewableEnergyRate?: DecimalValue | null;
  largestEnergyName?: string | null;
  largestEnergyRate?: DecimalValue | null;
}

export interface StructurePieItem {
  energyId?: number | null;
  energyName?: string;
  consumption?: DecimalValue | null;
  unit?: string | null;
  standardCoal: DecimalValue;
  rate: DecimalValue;
  other: boolean;
}

export interface StructureAnalysisRow {
  period?: string;
  boundaryName?: string;
  energyId: number;
  energyName?: string;
  consumption: DecimalValue;
  unit?: string;
  standardCoal: DecimalValue;
  rate?: DecimalValue | null;
}

export interface StructureAnalysisResponse {
  summary: StructureSummary;
  pie: StructurePieItem[];
  table: StructureAnalysisRow[];
}

export interface EfficiencyAnalysisRow {
  period: string;
  boundaryName?: string;
  energyEfficiency: DecimalValue;
}

export interface EfficiencyAnalysisResponse {
  chart: StatisticsChart;
  table: EfficiencyAnalysisRow[];
}

export type AnalysisResponse =
  | FormAnalysisResponse
  | OverviewResponse
  | BoundaryAnalysisResponse
  | StructureAnalysisResponse
  | EfficiencyAnalysisResponse;

/** 形态分析表格与饼图共用同一汇总行，零总量占比为空。 */
export interface FormAnalysisRow {
  period: string;
  energyForm: 1 | 2;
  energyFormName: string;
  standardCoal: DecimalValue;
  rate: DecimalValue | null;
  boundaryName?: string;
}

export interface FormAnalysisResponse {
  table: FormAnalysisRow[];
  pie: FormAnalysisRow[];
}
