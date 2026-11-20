import I18N from '@/lang/I18N';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  addEnergyEquipmentApi,
  deleteEnergyEquipmentApi,
  editEnergyEquipmentApi,
  getEnergyEquipmentOptionsApi,
  getEnergyEquipmentPageApi,
} from '../services';
import type {
  EnergyEquipmentAddReq,
  EnergyEquipmentEditReq,
  EnergyEquipmentListParams,
} from '../types';

/** 名称、编号候选复用列表缓存前缀，新增编辑删除后同步失效。 */
export function useEnergyEquipmentOptions(orgId?: number) {
  return useQuery({
    queryKey: [...energyEquipmentQueryKeys.lists(), 'options', orgId],
    queryFn: () =>
      getEnergyEquipmentOptionsApi(orgId).then(response => response.data.data),
  });
}

/** 用能设备 Query Key。 */
export const energyEquipmentQueryKeys = {
  all: ['energy-equipment'] as const,
  lists: () => [...energyEquipmentQueryKeys.all, 'list'] as const,
  list: (params: EnergyEquipmentListParams) =>
    [...energyEquipmentQueryKeys.lists(), params] as const,
};

/** 查询当前条件用能设备分页。 */
export function useEnergyEquipmentPage(params: EnergyEquipmentListParams) {
  return useQuery({
    queryKey: energyEquipmentQueryKeys.list(params),
    queryFn: () =>
      getEnergyEquipmentPageApi(params).then(response => response.data.data),
  });
}

/** 新增用能设备并刷新列表。 */
export function useAddEnergyEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnergyEquipmentAddReq) =>
      addEnergyEquipmentApi(data).then(response => response.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.addSuccess);
      queryClient.invalidateQueries({
        queryKey: energyEquipmentQueryKeys.lists(),
      });
    },
  });
}

/** 编辑用能设备并刷新列表。 */
export function useEditEnergyEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EnergyEquipmentEditReq) =>
      editEnergyEquipmentApi(data).then(response => response.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.saveSuccess);
      queryClient.invalidateQueries({
        queryKey: energyEquipmentQueryKeys.lists(),
      });
    },
  });
}

/** 删除用能设备并刷新列表。 */
export function useDeleteEnergyEquipment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteEnergyEquipmentApi,
    onSuccess: () => {
      message.success(I18N.common.feedback.deleteSuccess);
      queryClient.invalidateQueries({
        queryKey: energyEquipmentQueryKeys.lists(),
      });
    },
  });
}
