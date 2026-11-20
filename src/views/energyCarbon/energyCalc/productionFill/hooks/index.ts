import I18N from '@/lang/I18N';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';

import {
  addProductionDataApi,
  auditProductionDataApi,
  deleteProductionDataApi,
  editProductionDataApi,
  getProductionDataDetailApi,
  getProductionDataPageApi,
  getProductionDocumentNoApi,
  getProductionIndicatorOptionsApi,
  submitProductionDataApi,
} from '../services';
import type {
  ProductionDataAuditReq,
  ProductionDataListParams,
  ProductionDataSaveReq,
} from '../types';

/** 生产填报查询键统一归组，写操作可同步刷新填报列表、详情和生产台账。 */
export const productionDataQueryKeys = {
  all: ['production-data'] as const,
  list: (params: ProductionDataListParams) =>
    [...productionDataQueryKeys.all, 'list', params] as const,
  detail: (id: number) =>
    [...productionDataQueryKeys.all, 'detail', id] as const,
  options: () => [...productionDataQueryKeys.all, 'indicator-options'] as const,
};

/** 查询生产数据填报分页。 */
export function useProductionDataPage(params: ProductionDataListParams) {
  return useQuery({
    queryKey: productionDataQueryKeys.list(params),
    queryFn: () =>
      getProductionDataPageApi(params).then(response => response.data.data),
  });
}

/** 按需查询生产数据详情。 */
export function useProductionDataDetail(id?: number) {
  return useQuery({
    queryKey: productionDataQueryKeys.detail(id ?? 0),
    queryFn: () =>
      getProductionDataDetailApi(id as number).then(
        response => response.data.data,
      ),
    enabled: id !== undefined,
  });
}

/** 查询生产指标选项。 */
export function useProductionIndicatorOptions() {
  return useQuery({
    queryKey: productionDataQueryKeys.options(),
    queryFn: () =>
      getProductionIndicatorOptionsApi().then(response => response.data.data),
  });
}

/** 用户选择组织后显式生成单据号，避免抽屉渲染重复占号。 */
export function useProductionDocumentNo() {
  return useMutation({
    mutationFn: (orgId: number) =>
      getProductionDocumentNoApi(orgId).then(response => response.data.data),
  });
}

/** 业务检索：生产数据填报 - 写操作成功后提示并刷新单据与台账缓存。 */
function useRefreshAfterMutation(successText: string) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return () => {
    message.success(successText);
    queryClient.invalidateQueries({
      queryKey: productionDataQueryKeys.all,
    });
    queryClient.invalidateQueries({ queryKey: ['production-ledger'] });
  };
}

/** 新增生产数据并刷新列表。 */
export function useAddProductionData() {
  const onSuccess = useRefreshAfterMutation(I18N.common.feedback.addSuccess);
  return useMutation({
    mutationFn: (data: ProductionDataSaveReq) =>
      addProductionDataApi(data).then(response => response.data.data),
    onSuccess,
  });
}

/** 编辑生产数据并刷新列表。 */
export function useEditProductionData() {
  const onSuccess = useRefreshAfterMutation(I18N.common.feedback.saveSuccess);
  return useMutation({
    mutationFn: (data: ProductionDataSaveReq & { id: number }) =>
      editProductionDataApi(data).then(response => response.data.data),
    onSuccess,
  });
}

/** 提交生产数据并刷新状态。 */
export function useSubmitProductionData() {
  const onSuccess = useRefreshAfterMutation(I18N.common.shared.submitSuccess);
  return useMutation({
    mutationFn: submitProductionDataApi,
    onSuccess,
  });
}

/** 审核生产数据并同步刷新台账。 */
export function useAuditProductionData() {
  const onSuccess = useRefreshAfterMutation(
    I18N.energyCarbon.analysisReviewCompleted,
  );
  return useMutation({
    mutationFn: (data: ProductionDataAuditReq) =>
      auditProductionDataApi(data).then(response => response.data.data),
    onSuccess,
  });
}

/** 删除生产数据并同步刷新台账。 */
export function useDeleteProductionData() {
  const onSuccess = useRefreshAfterMutation(I18N.common.feedback.deleteSuccess);
  return useMutation({
    mutationFn: deleteProductionDataApi,
    onSuccess,
  });
}
