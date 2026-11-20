/** 国家能耗标准、行业领先者、节能减排目标编码。 */
export type BenchmarkType = 1 | 2 | 3;
/** 十项能效对标指标编码。 */
export type BenchmarkMetric = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
/** 数值为空表示缺失或不适用，不等同于数值 0。 */
export type DecimalValue = number | string | null;

/** 指标名称、单位及不同对标类型的适用范围。 */
export interface BenchmarkMetricOption {
  value: BenchmarkMetric;
  label: string;
  unit?: string;
  nationalApplicable: boolean;
  industryApplicable: boolean;
  targetApplicable: boolean;
  available: boolean;
}

/** 对标类型或目标组织选项；目标组织来自当前数据权限范围。 */
export interface BenchmarkOption {
  value: number;
  label: string;
}

/** 对标页面选项；标准产品名称和单位由当前租户主数据动态返回。 */
export interface BenchmarkOptions {
  types: BenchmarkOption[];
  metrics: BenchmarkMetricOption[];
  targetOrganizations: BenchmarkOption[];
  standardProductId?: number;
  standardProductName?: string;
  standardProductMetricName: string;
  standardProductMetricUnit?: string;
}

/** 年度对标数据记录；不适用指标保持为空。 */
export interface BenchmarkDataRecord {
  id: number;
  benchmarkYear: number;
  benchmarkType: BenchmarkType;
  benchmarkTypeName: string;
  benchmarkName: string;
  dataSource?: string;
  comprehensiveEnergy?: DecimalValue;
  energyConsumption?: DecimalValue;
  mediumConsumption?: DecimalValue;
  rawMaterialConsumption?: DecimalValue;
  cleanEnergyRate?: DecimalValue;
  renewableEnergyRate?: DecimalValue;
  energyEfficiency?: DecimalValue;
  outputValueIntensity?: DecimalValue;
  addedValueIntensity?: DecimalValue;
  standardProductIntensity?: DecimalValue;
  standardProductMetricName: string;
  standardProductMetricUnit?: string;
  updateByName?: string;
  updateTime?: string;
}

/** 对标数据分页结果。 */
export interface BenchmarkDataPage {
  pageNum: number;
  pageSize: number;
  total: number;
  records: BenchmarkDataRecord[];
}

/** 对标数据保存字段，不提交服务端动态反显字段。 */
export type BenchmarkDataSave = Omit<
  BenchmarkDataRecord,
  | 'id'
  | 'benchmarkTypeName'
  | 'standardProductMetricName'
  | 'standardProductMetricUnit'
  | 'updateByName'
  | 'updateTime'
>;

/** 单周期对标查询；周期只支持月、季度和年，年度由 periodDate 归一得到。 */
export interface BenchmarkAnalysisRequest {
  orgId: number;
  periodType: 2 | 3 | 4;
  periodDate: string;
  metrics: BenchmarkMetric[];
  benchmarkTypes: BenchmarkType[];
}

/** 单周期实际值和年度对标值；缺失或不适用 value 保持为空。 */
export interface BenchmarkAnalysisResponse {
  organizationName: string;
  period: string;
  metrics: Array<{
    metric: BenchmarkMetric;
    metricName: string;
    unit?: string;
    organizationValue?: DecimalValue;
    benchmarkValues: Array<{
      benchmarkType: BenchmarkType;
      benchmarkTypeName: string;
      benchmarkName?: string;
      value?: DecimalValue;
    }>;
  }>;
}
