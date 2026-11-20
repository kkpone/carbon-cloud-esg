import I18N from '@/lang/I18N';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { energyQueryKeys } from '../../energyList/hooks';
import { getEnergyOptionsApi } from '../../energyList/services';
import {
  addMeasuringInstrumentApi,
  deleteMeasuringInstrumentApi,
  editMeasuringInstrumentApi,
  getMeasuringInstrumentOptionsApi,
  getMeasuringInstrumentPageApi,
} from '../services';
import type {
  MeasuringInstrumentAddReq,
  MeasuringInstrumentEditReq,
  MeasuringInstrumentListParams,
} from '../types';

/** 名称、编号候选复用列表缓存前缀，新增编辑删除后同步失效。 */
export function useMeasuringInstrumentOptions(orgId?: number) {
  return useQuery({
    queryKey: [...measuringInstrumentQueryKeys.lists(), 'options', orgId],
    queryFn: () =>
      getMeasuringInstrumentOptionsApi(orgId).then(
        response => response.data.data,
      ),
  });
}

/** 计量器具 Query Key。 */
export const measuringInstrumentQueryKeys = {
  all: ['measuring-instrument'] as const,
  lists: () => [...measuringInstrumentQueryKeys.all, 'list'] as const,
  list: (params: MeasuringInstrumentListParams) =>
    [...measuringInstrumentQueryKeys.lists(), params] as const,
};

/** 查询当前条件计量器具分页。 */
export function useMeasuringInstrumentPage(
  params: MeasuringInstrumentListParams,
) {
  return useQuery({
    queryKey: measuringInstrumentQueryKeys.list(params),
    queryFn: () =>
      getMeasuringInstrumentPageApi(params).then(
        response => response.data.data,
      ),
  });
}

/** 从能源列表按名称加载可选计量能源，支持超过首批数据后的远程搜索。 */
export function useMeasuringEnergyOptions(energyName?: string) {
  const keyword = energyName?.trim() || undefined;
  return useQuery({
    queryKey: energyQueryKeys.options(keyword),
    queryFn: () =>
      getEnergyOptionsApi(keyword ? { energyName: keyword } : undefined).then(
        response => response.data.data,
      ),
  });
}

/** 新增计量器具并刷新列表。 */
export function useAddMeasuringInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MeasuringInstrumentAddReq) =>
      addMeasuringInstrumentApi(data).then(response => response.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.addSuccess);
      queryClient.invalidateQueries({
        queryKey: measuringInstrumentQueryKeys.lists(),
      });
    },
  });
}

/** 编辑计量器具并刷新列表。 */
export function useEditMeasuringInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: MeasuringInstrumentEditReq) =>
      editMeasuringInstrumentApi(data).then(response => response.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.saveSuccess);
      queryClient.invalidateQueries({
        queryKey: measuringInstrumentQueryKeys.lists(),
      });
    },
  });
}

/** 删除计量器具并刷新列表。 */
export function useDeleteMeasuringInstrument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteMeasuringInstrumentApi,
    onSuccess: () => {
      message.success(I18N.common.feedback.deleteSuccess);
      queryClient.invalidateQueries({
        queryKey: measuringInstrumentQueryKeys.lists(),
      });
    },
  });
}
