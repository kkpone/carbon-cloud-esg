import { useMutation } from '@tanstack/react-query';

import { getEnergyFlowAnalysisApi } from '../services';
import type {
  EnergyFlowAnalysisRequest,
  EnergyFlowAnalysisResponse,
} from '../types';

/** 能流分析图查询结果只由当前页面持有，避免跨组织复用过期图数据。 */
export function useEnergyFlowAnalysisMutation() {
  return useMutation<
    EnergyFlowAnalysisResponse,
    Error,
    EnergyFlowAnalysisRequest
  >({
    mutationFn: async data => {
      // 先按页面已校验的当前组织和自然周期调用能流分析接口。
      const response = await getEnergyFlowAnalysisApi(data);
      // 再取统一响应包中的能流指标、阶段、节点和连线，交由页面渲染。
      return response.data.data;
    },
  });
}
