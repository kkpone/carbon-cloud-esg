import type {
  ENERGY_FLOW_ANALYSIS_STAGE,
  getEnergyFlowAnalysisPeriodOptions,
} from './constant';

/** 能流分析图支持的统计维度。 */
export type EnergyFlowAnalysisPeriodType = ReturnType<
  typeof getEnergyFlowAnalysisPeriodOptions
>[number]['value'];

/** 能流分析图的固定阶段 key。 */
export type EnergyFlowStageKey =
  (typeof ENERGY_FLOW_ANALYSIS_STAGE)[keyof typeof ENERGY_FLOW_ANALYSIS_STAGE];

/** 后端能流阶段编码，与能源台账数据类型和响应 stageType 对齐。 */
export type EnergyFlowStageType = 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** 后端 BigDecimal 兼容值；前端展示前统一转为有限数字。 */
export type EnergyFlowDecimalValue = number | string;

/** 能流分析图查询请求。组织范围只包含当前 orgId，不向下展开组织树。 */
export interface EnergyFlowAnalysisRequest {
  orgId: number;
  periodType: EnergyFlowAnalysisPeriodType;
  periodDate: string;
}

/** 能流分析图上方固定展示的四项指标。 */
export interface EnergyFlowMetrics {
  comprehensiveEnergy?: EnergyFlowDecimalValue | null;
  comprehensiveEnergyUnit?: string;
  cleanEnergyRate?: EnergyFlowDecimalValue | null;
  cleanEnergyRateUnit?: string;
  renewableEnergyRate?: EnergyFlowDecimalValue | null;
  renewableEnergyRateUnit?: string;
  energyEfficiency?: EnergyFlowDecimalValue | null;
  energyEfficiencyUnit?: string;
}

/** 桑基图的动态阶段列；enabled=false 的列不会绘制。 */
export interface EnergyFlowStage {
  stageType: EnergyFlowStageType;
  stageName?: string;
  enabled: boolean;
  nodeIds?: string[];
}

/** 桑基图节点，名称和数值来自当前组织当前周期的能耗台账汇总。 */
export interface EnergyFlowNode {
  id: string | number;
  name: string;
  stageType?: EnergyFlowStageType;
  value?: EnergyFlowDecimalValue | null;
  unit?: string;
}

/** 桑基图边，value 为折标煤 tce；非正边由前端跳过绘制。 */
export interface EnergyFlowLink {
  source: string | number;
  target: string | number;
  value: EnergyFlowDecimalValue;
  unit?: string;
}

/** 能流分析图接口响应；stages 由组织能流设置决定。 */
export interface EnergyFlowAnalysisResponse {
  metrics: EnergyFlowMetrics;
  stages: EnergyFlowStage[];
  nodes: EnergyFlowNode[];
  links: EnergyFlowLink[];
}
