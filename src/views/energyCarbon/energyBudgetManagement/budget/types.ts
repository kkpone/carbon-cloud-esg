/** 单年度预算趋势；基准年目标和预测为空，actualEnergy 为空表示没有审核通过实际台账，0 表示有数据但净值为0。 */
export interface EnergyBudgetYearValue {
  year: number;
  actualEnergy?: number | string | null;
  targetEnergy: number | string | null;
  forecastEnergy: number | string | null;
  orgName: string;
}

/** 组织预算设置及年度趋势响应。未配置设置时年份和比例字段为空。 */
export interface EnergyBudgetDetail {
  orgId: number;
  orgName: string;
  baseYear?: number;
  forecastYear?: number;
  outputValueGrowthRate?: number | string;
  intensityReductionRate?: number | string;
  years: EnergyBudgetYearValue[];
}

/** 预算保存字段；比例为百分数，服务端按距基准年的 n 做复利计算。 */
export interface EnergyBudgetSave {
  orgId: number;
  baseYear: number;
  forecastYear: number;
  outputValueGrowthRate: number | string;
  intensityReductionRate: number | string;
}
