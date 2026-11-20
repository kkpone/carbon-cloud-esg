import I18N from '@/lang/I18N';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';

import {
  addEnergyConsumptionApi,
  auditEnergyConsumptionApi,
  deleteEnergyConsumptionApi,
  editEnergyConsumptionApi,
  getBoundaryOptionsApi,
  getEnergyConsumptionDetailApi,
  getEnergyConsumptionPageApi,
  getNextDocumentNoApi,
  getResourceOptionsApi,
  submitEnergyConsumptionApi,
} from '../services';
import type {
  EnergyConsumptionAuditReq,
  EnergyConsumptionListParams,
  EnergyConsumptionSaveReq,
} from '../types';

/** 能耗填报查询键覆盖单据、边界及资源选项，写操作后可整组刷新。 */
export const energyConsumptionQueryKeys = {
  all: ['energy-consumption'] as const,
  lists: () => [...energyConsumptionQueryKeys.all, 'list'] as const,
  list: (params: EnergyConsumptionListParams) =>
    [...energyConsumptionQueryKeys.lists(), params] as const,
  detail: (id: number) =>
    [...energyConsumptionQueryKeys.all, 'detail', id] as const,
  boundaries: (orgId: number) =>
    [...energyConsumptionQueryKeys.all, 'boundaries', orgId] as const,
  independentResources: () =>
    [...energyConsumptionQueryKeys.all, 'independent-resources'] as const,
  resources: (boundaryId: number) =>
    [...energyConsumptionQueryKeys.all, 'resources', boundaryId] as const,
};

/** 按用户选择组织显式分配下一单据号，避免抽屉重复渲染时重复占号。 */
export function useNextDocumentNo() {
  return useMutation({
    mutationFn: (orgId: number) =>
      getNextDocumentNoApi(orgId).then(response => response.data.data),
  });
}

/** 查询能耗填报分页。 */
export function useEnergyConsumptionPage(params: EnergyConsumptionListParams) {
  return useQuery({
    queryKey: energyConsumptionQueryKeys.list(params),
    queryFn: () =>
      getEnergyConsumptionPageApi(params).then(response => response.data.data),
  });
}

/** 按需查询单据详情。 */
export function useEnergyConsumptionDetail(id?: number) {
  return useQuery({
    queryKey: energyConsumptionQueryKeys.detail(id ?? 0),
    queryFn: () =>
      getEnergyConsumptionDetailApi(id as number).then(
        response => response.data.data,
      ),
    enabled: id !== undefined,
  });
}

/** 查询组织可选统计边界。 */
export function useBoundaryOptions(orgId?: number, enabled = true) {
  return useQuery({
    queryKey: energyConsumptionQueryKeys.boundaries(orgId ?? 0),
    queryFn: () =>
      getBoundaryOptionsApi(orgId as number).then(
        response => response.data.data,
      ),
    enabled: enabled && orgId !== undefined,
  });
}

/** 查询不依赖边界的租户级关联产品；设备和器具按边界单独查询。 */
export function useIndependentResourceOptions(enabled = true) {
  return useQuery({
    queryKey: energyConsumptionQueryKeys.independentResources(),
    queryFn: () =>
      getResourceOptionsApi({}).then(response => response.data.data),
    enabled,
  });
}

/** 查询明细级联资源。 */
export function useResourceOptions(boundaryId?: number, enabled = true) {
  return useQuery({
    queryKey: energyConsumptionQueryKeys.resources(boundaryId ?? 0),
    queryFn: () =>
      getResourceOptionsApi({
        boundaryId: boundaryId as number,
      }).then(response => response.data.data),
    enabled: enabled && boundaryId !== undefined,
  });
}

/** 业务检索：能耗数据填报 - 写操作成功后提示并刷新单据与台账缓存。 */
function useRefreshAfterMutation(successText: string) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return () => {
    message.success(successText);
    queryClient.invalidateQueries({
      queryKey: energyConsumptionQueryKeys.all,
    });
    queryClient.invalidateQueries({ queryKey: ['energy-ledger'] });
  };
}

/** 新增能耗填报并刷新列表。 */
export function useAddEnergyConsumption() {
  const onSuccess = useRefreshAfterMutation(I18N.common.feedback.addSuccess);
  return useMutation({
    mutationFn: (data: EnergyConsumptionSaveReq) =>
      addEnergyConsumptionApi(data).then(response => response.data.data),
    onSuccess,
  });
}

/** 编辑能耗填报并刷新列表。 */
export function useEditEnergyConsumption() {
  const onSuccess = useRefreshAfterMutation(I18N.common.feedback.saveSuccess);
  return useMutation({
    mutationFn: (data: EnergyConsumptionSaveReq & { id: number }) =>
      editEnergyConsumptionApi(data).then(response => response.data.data),
    onSuccess,
  });
}

/** 提交能耗填报并刷新状态。 */
export function useSubmitEnergyConsumption() {
  const onSuccess = useRefreshAfterMutation(I18N.common.shared.submitSuccess);
  return useMutation({
    mutationFn: submitEnergyConsumptionApi,
    onSuccess,
  });
}

/** 审核能耗填报并同步刷新台账。 */
export function useAuditEnergyConsumption() {
  const onSuccess = useRefreshAfterMutation(
    I18N.energyCarbon.analysisReviewCompleted,
  );
  return useMutation({
    mutationFn: (data: EnergyConsumptionAuditReq) =>
      auditEnergyConsumptionApi(data).then(response => response.data.data),
    onSuccess,
  });
}

/** 删除能耗填报并同步刷新台账。 */
export function useDeleteEnergyConsumption() {
  const onSuccess = useRefreshAfterMutation(I18N.common.feedback.deleteSuccess);
  return useMutation({
    mutationFn: deleteEnergyConsumptionApi,
    onSuccess,
  });
}
