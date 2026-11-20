/** 快速核算分配配置，百分数与数量统一按十进制字符串传输。 */
export interface AllocationConfig {
  enabled?: boolean;
  rule?: number;
  method?: number;
  unitCode?: string;
  unitName?: string;
  totalAmount?: string;
  currentAmount?: string;
  percentage?: string;
}

/** 生命周期阶段配置的稳定字段，避免通过展示名称匹配。 */
export interface StageAllocationConfig {
  material?: AllocationConfig;
  production?: AllocationConfig;
  distribution?: AllocationConfig;
  use?: AllocationConfig;
  endOfLife?: AllocationConfig;
}

export const STAGE_KEYS = [
  'material',
  'production',
  'distribution',
  'use',
  'endOfLife',
] as const;

export interface AllocationAccount {
  id?: number | string;
  type?: number;
  amount?: string | number;
  productAmount?: string;
  unitCode?: string;
  unitName?: string;
  scopeValue?: string;
  stageAllocation?: StageAllocationConfig;
}
