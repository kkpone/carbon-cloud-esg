export type DashboardSummary = {
  activeSupplierCount: number;
  footprintDataCount: number;
};

export type DashboardSupplier = {
  id: number;
  name: string;
  number?: string;
};

export type DashboardProduct = {
  id: number;
  name: string;
  specification?: string;
  unit?: string;
};

export type ProductAnalysis = {
  productName?: string;
  unit?: string;
  suppliers: Array<{
    supplierId: number;
    supplierName?: string;
    emission: number;
  }>;
  lifecycle: Array<{
    key: string;
    name: string;
    emission: number;
  }>;
  sources: Array<{
    name: string;
    type?: number;
    emission: number;
  }>;
  sourceTypes?: ProductEmissionType[];
  sourceChart?: ProductChartRow[];
  lifecycleStages?: string[];
  lifecycleChart?: ProductChartRow[];
};

export type ProductChartRow = {
  supplierId: number;
  supplierName?: string;
  values: Record<string, number>;
};

export type ProductEmissionType = {
  code: number;
  name: string;
};

export type EnterpriseYearOption = {
  year: string;
};

export type EnterpriseScopeTrendPoint = {
  year: string;
  scopeOne: number;
  scopeTwo: number;
  scopeThree: number;
  total?: number;
  supplierNames?: string[];
};

export type EnterpriseAnalysis = {
  scope: string;
  structureYear?: string;
  trend: Array<{
    year: string;
    value: number;
    scopeOne?: number;
    scopeTwo?: number;
    scopeThree?: number;
    supplierNames?: string[];
  }>;
  scopeTrend?: EnterpriseScopeTrendPoint[];
  structure: Array<{
    supplierId: number;
    supplierName?: string;
    scopeOne: number;
    scopeTwo: number;
    scopeThree: number;
    total: number;
  }>;
  supplierTrend: Array<{
    supplierId: number;
    supplierName?: string;
    values: Array<{ year: string; value: number }>;
  }>;
};

export type EnterpriseTrendAnalysis = Pick<EnterpriseAnalysis, 'trend'>;

export type EnterpriseStructureAnalysis = Pick<
  EnterpriseAnalysis,
  'structureYear' | 'structure'
>;

export type EnterpriseSupplierTrendAnalysis = Pick<
  EnterpriseAnalysis,
  'scope' | 'supplierTrend'
>;
