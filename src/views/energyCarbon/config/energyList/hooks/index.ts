import I18N from '@/lang/I18N';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

import {
  addEnergyApi,
  deleteEnergyApi,
  editEnergyApi,
  getEnergyOptionsApi,
  getEnergyPageApi,
} from '../services';
import type {
  EnergyAddReq,
  EnergyEditReq,
  EnergyListParams,
  EnergyOptionParams,
} from '../types';

/** 能源列表 Query Key。 */
export const energyQueryKeys = {
  all: ['energy-catalog'] as const,
  lists: () => [...energyQueryKeys.all, 'list'] as const,
  list: (params: EnergyListParams) =>
    [...energyQueryKeys.lists(), params] as const,
  optionLists: () => [...energyQueryKeys.all, 'options'] as const,
  options: (energyName?: string) =>
    [...energyQueryKeys.all, 'options', energyName] as const,
};

/** 查询当前条件能源分页。 */
export function useEnergyPage(params: EnergyListParams) {
  return useQuery({
    queryKey: energyQueryKeys.list(params),
    queryFn: () =>
      getEnergyPageApi(params).then(response => response.data.data),
  });
}

/** 查询当前登录租户可用的能源下拉选项。 */
export function useEnergyOptions(energyName?: string) {
  const keyword = energyName?.trim() || undefined;
  const params: EnergyOptionParams | undefined = keyword
    ? { energyName: keyword }
    : undefined;
  return useQuery({
    queryKey: energyQueryKeys.options(keyword),
    queryFn: () =>
      getEnergyOptionsApi(params).then(response => response.data.data),
  });
}

/** 新增能源并刷新列表。 */
export function useAddEnergy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnergyAddReq) =>
      addEnergyApi(data).then(response => response.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.addSuccess);
      queryClient.invalidateQueries({ queryKey: energyQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: energyQueryKeys.optionLists(),
      });
    },
  });
}

/** 编辑能源并刷新列表。 */
export function useEditEnergy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnergyEditReq) =>
      editEnergyApi(data).then(response => response.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.saveSuccess);
      queryClient.invalidateQueries({ queryKey: energyQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: energyQueryKeys.optionLists(),
      });
    },
  });
}

/** 删除能源并刷新列表。 */
export function useDeleteEnergy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEnergyApi,
    onSuccess: () => {
      message.success(I18N.common.feedback.deleteSuccess);
      queryClient.invalidateQueries({ queryKey: energyQueryKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: energyQueryKeys.optionLists(),
      });
    },
  });
}
