export type StatisticsScopeType = 1 | 2;
export type StatisticsPeriodType = 1 | 2 | 3 | 4;
export type IntensityIndicatorType = 1 | 2 | 3 | 4;
export type StatisticsChartType = 1 | 2;
export type StatisticsPageKind = 'energy' | 'consumption' | 'intensity';

export interface StatisticsScopeNode {
  key: string;
  name: string;
  scopeType?: StatisticsScopeType;
  orgId?: number;
  boundaryId?: number;
  boundaryType?: 1 | 2 | 3;
  selectable: boolean;
  children: StatisticsScopeNode[];
}

export interface StatisticsOption {
  id: number;
  name?: string;
  unit?: string;
  unitName?: string;
}

export interface StatisticsOptions {
  energies: StatisticsOption[];
  products: StatisticsOption[];
}

export interface StatisticsRequest {
  scopeType: StatisticsScopeType;
  orgId: number;
  boundaryId?: number;
  periodType: StatisticsPeriodType;
  startDate: string;
  endDate: string;
  energyId?: number;
  indicatorType?: IntensityIndicatorType;
  productId?: number;
}

export interface StatisticsChartSeries {
  name?: string;
  unit?: string;
  chartType: StatisticsChartType | `${StatisticsChartType}`;
  stack?: string;
  values: Array<number | string | null>;
}

export interface StatisticsChart {
  categories: string[];
  leftUnit?: string;
  rightUnit?: string;
  series: StatisticsChartSeries[];
}

export interface EnergyStatisticsRow {
  period: string;
  energyName?: string;
  consumption: number;
  unit?: string;
  standardCoal: number;
  boundaryName?: string;
}

export interface ConsumptionStatisticsRow {
  period: string;
  totalConsumption: number;
  energyConsumption: number;
  mediumConsumption: number;
  rawMaterialConsumption: number;
  cleanEnergyRate?: number | null;
  renewableEnergyRate?: number | null;
  unit: string;
  boundaryName?: string;
}

export interface IntensityStatisticsRow {
  period: string;
  indicatorName?: string;
  quantity: number;
  unit?: string;
  intensity?: number | null;
  organizationName?: string;
}

export interface EnergyStatisticsResponse {
  chart: StatisticsChart;
  table: EnergyStatisticsRow[];
}

export interface ConsumptionStatisticsResponse {
  chart: StatisticsChart;
  table: ConsumptionStatisticsRow[];
}

export interface IntensityStatisticsResponse {
  chart: StatisticsChart;
  table: IntensityStatisticsRow[];
}

export type StatisticsResponse =
  | EnergyStatisticsResponse
  | ConsumptionStatisticsResponse
  | IntensityStatisticsResponse;
