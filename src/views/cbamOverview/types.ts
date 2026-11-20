import { OperationReportOverview } from '@/views/cbamOperationReport/types';

export interface OverviewOption {
  value: string;
  label: string;
}

export interface DataOverviewOptions {
  defaultYear: number;
  years: OverviewOption[];
  reports: OverviewOption[];
  facilities: OverviewOption[];
  products: OverviewOption[];
  precursors: OverviewOption[];
  trendProducts: OverviewOption[];
}

export interface DataOverviewSummary {
  facilityCount: number;
  productCount: number;
  totalEmbeddedEmission: string;
  estimatedTax: string;
}

export interface DataOverviewEmission {
  key: string;
  name: string;
  subName?: string;
  reportName?: string;
  cnCode?: string;
  directEmission: string;
  indirectEmission: string;
  totalEmission: string;
}

export interface DataOverviewTrend {
  year: number;
  costBeforeDeduction: string;
  estimatedTax: string;
}

export type DataOverviewCompliance = OperationReportOverview;
