import { useMutation } from '@tanstack/react-query';
import {
  getFormAnalysisApi,
  getBoundaryAnalysisApi,
  getEfficiencyAnalysisApi,
  getEnergyOverviewApi,
  getStructureAnalysisApi,
} from './services';

import type {
  AnalysisKind,
  AnalysisResponse,
  EfficiencyAnalysisRequest,
  SinglePeriodAnalysisRequest,
} from './types';

type AnalysisRequest = SinglePeriodAnalysisRequest | EfficiencyAnalysisRequest;

/** 按页面调用对应能源分析接口，查询结果只由当前页面 mutation 持有。 */
export function useEnergyAnalysisMutation(kind: AnalysisKind) {
  return useMutation<AnalysisResponse, Error, AnalysisRequest>({
    mutationFn: async data => {
      if (kind === 'form') {
        return getFormAnalysisApi(data as SinglePeriodAnalysisRequest).then(
          response => response.data.data,
        );
      }
      if (kind === 'overview') {
        return getEnergyOverviewApi(data as SinglePeriodAnalysisRequest).then(
          response => response.data.data,
        );
      }
      if (kind === 'boundary') {
        return getBoundaryAnalysisApi(data as SinglePeriodAnalysisRequest).then(
          response => response.data.data,
        );
      }
      if (kind === 'structure') {
        return getStructureAnalysisApi(
          data as SinglePeriodAnalysisRequest,
        ).then(response => response.data.data);
      }
      return getEfficiencyAnalysisApi(data as EfficiencyAnalysisRequest).then(
        response => response.data.data,
      );
    },
  });
}
