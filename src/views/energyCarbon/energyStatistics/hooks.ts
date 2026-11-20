import { useMutation, useQuery } from '@tanstack/react-query';

import {
  getConsumptionStatisticsApi,
  getEnergyStatisticsApi,
  getIntensityStatisticsApi,
  getStatisticsOptionsApi,
  getStatisticsScopeTreeApi,
} from './services';
import type {
  StatisticsPageKind,
  StatisticsRequest,
  StatisticsResponse,
} from './types';

/** 三个统计页共享范围树和选项缓存，具体查询结果由各页面 mutation 独立持有。 */
export const energyStatisticsQueryKeys = {
  all: ['energy-statistics'] as const,
  scopeTree: () => [...energyStatisticsQueryKeys.all, 'scope-tree'] as const,
  options: () => [...energyStatisticsQueryKeys.all, 'options'] as const,
};

interface UseStatisticsScopeTreeOptions {
  /** 是否启用统计范围树请求；概览页使用系统数据权限组织树时关闭该请求。 */
  enabled?: boolean;
}

/** 查询统计范围树。 */
export function useStatisticsScopeTree(
  options?: UseStatisticsScopeTreeOptions,
) {
  return useQuery({
    queryKey: energyStatisticsQueryKeys.scopeTree(),
    enabled: options?.enabled ?? true,
    queryFn: () =>
      getStatisticsScopeTreeApi().then(response => response.data.data),
  });
}

/** 查询统计能源和产品选项。 */
export function useStatisticsOptions() {
  return useQuery({
    queryKey: energyStatisticsQueryKeys.options(),
    queryFn: () =>
      getStatisticsOptionsApi().then(response => response.data.data),
  });
}

/** 根据当前页面调用独立统计接口，查询按钮触发，不缓存其他页面结果。 */
export function useStatisticsMutation(kind: StatisticsPageKind) {
  return useMutation<StatisticsResponse, Error, StatisticsRequest>({
    mutationFn: async data => {
      if (kind === 'energy') {
        return getEnergyStatisticsApi(data).then(
          response => response.data.data,
        );
      }
      if (kind === 'consumption') {
        return getConsumptionStatisticsApi(data).then(
          response => response.data.data,
        );
      }
      return getIntensityStatisticsApi(data).then(
        response => response.data.data,
      );
    },
  });
}
