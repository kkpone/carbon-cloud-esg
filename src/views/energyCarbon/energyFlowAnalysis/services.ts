import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  EnergyFlowAnalysisRequest,
  EnergyFlowAnalysisResponse,
} from './types';

/**
 * @description 业务检索：能流分析图 - 按当前组织和自然周期查询四项指标及桑基图数据
 * @param data 当前组织、月/季/年统计维度和自然周期
 */
export const getEnergyFlowAnalysisApi = (data: EnergyFlowAnalysisRequest) =>
  request<ResponseData<EnergyFlowAnalysisResponse>>({
    method: 'POST',
    url: '/energy/energyStatistics/flowAnalysis',
    data,
  });
