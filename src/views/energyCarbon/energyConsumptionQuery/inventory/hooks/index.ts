import I18N from '@/lang/I18N';
import type { RootState } from '@/store';
import { IMPORT_STATUS } from '@/views/energyCarbon/components/ImportFileModal/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';
import { useSelector } from 'react-redux';
import {
  addInventoryApi,
  deleteInventoryApi,
  editInventoryApi,
  getInventoryBoundariesApi,
  getInventoryDetailApi,
  getInventoryDocumentNoApi,
  getInventoryImportRecordsApi,
  getInventoryPageApi,
  getInventoryResourcesApi,
  getInventoryTemplateApi,
  importInventoryApi,
} from '../services';
import type {
  InventoryImportFile,
  InventoryImportLogPage,
  InventoryImportPageParams,
  InventoryListParams,
  InventorySave,
} from '../types';

/** 库存列表/详情/选项归组，写后预算缓存一并刷新。 */
export const inventoryQueryKeys = {
  all: ['energy-inventory'] as const,
  list: (params: InventoryListParams) =>
    ['energy-inventory', 'list', params] as const,
  detail: (id?: number) => ['energy-inventory', 'detail', id] as const,
  boundaries: (orgId?: number) =>
    ['energy-inventory', 'boundaries', orgId] as const,
  resources: (boundaryId?: number) =>
    ['energy-inventory', 'resources', boundaryId] as const,
  importRecords: ['energy-inventory', 'import-records'] as const,
  importPage: (
    companyId: number | undefined,
    userId: number | undefined,
    params: InventoryImportPageParams,
  ) =>
    ['energy-inventory', 'import-records', companyId, userId, params] as const,
};
/** 查询库存分页。 */
export function useInventoryPage(params: InventoryListParams) {
  return useQuery({
    queryKey: inventoryQueryKeys.list(params),
    queryFn: () => getInventoryPageApi(params).then(r => r.data.data),
  });
}
/** 抽屉打开后才读取详情，保留快照。 */
export function useInventoryDetail(id?: number) {
  return useQuery({
    queryKey: inventoryQueryKeys.detail(id),
    enabled: id !== undefined,
    queryFn: () => getInventoryDetailApi(id!).then(r => r.data.data),
  });
}
/** 组织边界选项独立使用库存权限。 */
export function useInventoryBoundaries(orgId?: number, enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.boundaries(orgId),
    enabled: enabled && orgId !== undefined,
    queryFn: () => getInventoryBoundariesApi(orgId!).then(r => r.data.data),
  });
}
/** 能源、产品随当前统计边界取数，查询键防止旧响应覆盖新边界。 */
export function useInventoryResources(boundaryId?: number, enabled = true) {
  return useQuery({
    queryKey: inventoryQueryKeys.resources(boundaryId),
    enabled: enabled && boundaryId !== undefined,
    queryFn: () => getInventoryResourcesApi(boundaryId!).then(r => r.data.data),
  });
}
/** 用户选择组织后生成可编辑单号。 */
export function useInventoryDocumentNo() {
  return useMutation({
    mutationFn: (orgId: number) =>
      getInventoryDocumentNoApi(orgId).then(r => r.data.data),
  });
}
/** 成功写入后失效库存列表/详情和预算，无审批及台账回填。 */
function useInventoryWritten() {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  return () => {
    message.success(I18N.common.feedback.saveSuccess);
    queryClient.invalidateQueries({ queryKey: inventoryQueryKeys.all });
    queryClient.invalidateQueries({ queryKey: ['energy-budget'] });
  };
}
/** 保存库存时显示处理状态，后端决定快照与最终唯一性。 */
export function useSaveInventory(editing: boolean) {
  const onSuccess = useInventoryWritten();
  return useMutation({
    mutationFn: (data: InventorySave) =>
      (editing ? editInventoryApi(data) : addInventoryApi(data)).then(
        r => r.data.data,
      ),
    onSuccess,
  });
}
/** 删除成功后刷新库存和预算。 */
export function useDeleteInventory() {
  const onSuccess = useInventoryWritten();
  return useMutation({ mutationFn: deleteInventoryApi, onSuccess });
}
/** 异步受理提示处理中，最终结果从本人导入记录读取。 */
export function useImportInventory() {
  const onWritten = useInventoryWritten();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: InventoryImportFile) =>
      importInventoryApi(file).then(r => r.data.data),
    onSuccess: result => {
      if (result.processing) {
        message.info(I18N.energyCarbon.inventoryImportProcessing);
      } else if (result.successCount) {
        onWritten();
      }
    },
    onSettled: () =>
      queryClient.invalidateQueries({
        queryKey: inventoryQueryKeys.importRecords,
      }),
  });
}
/** 本人导入记录按租户和用户分开缓存，导入中记录沿用公共状态轮询。 */
export function useInventoryImportRecords(params: InventoryImportPageParams) {
  const queryClient = useQueryClient();
  const userInfo = useSelector(
    (state: RootState) => state.companyUserInfo.userInfo,
  );
  const userId = userInfo?.userId;
  const queryKey = inventoryQueryKeys.importPage(
    userInfo?.companyId,
    userId,
    params,
  );
  return useQuery({
    queryKey,
    enabled: userId !== undefined,
    queryFn: async () => {
      const page = (await getInventoryImportRecordsApi(params)).data.data;
      const previous =
        queryClient.getQueryData<InventoryImportLogPage>(queryKey);
      const previousStatus = new Map(
        previous?.records.map(record => [
          record.id,
          Number(record.importStatus),
        ]),
      );
      // 首次读到成功也刷新，覆盖后台任务早于首轮轮询完成的情况。
      // 不失效导入记录自身，避免成功记录触发持续轮询。
      if (
        page.records.some(
          record =>
            Number(record.importStatus) === IMPORT_STATUS.IMPORTED &&
            previousStatus.get(record.id) !== IMPORT_STATUS.IMPORTED,
        )
      ) {
        queryClient.invalidateQueries({
          queryKey: ['energy-inventory', 'list'],
        });
        queryClient.invalidateQueries({
          queryKey: ['energy-inventory', 'detail'],
        });
        queryClient.invalidateQueries({ queryKey: ['energy-budget'] });
      }
      return page;
    },
    refetchInterval: data =>
      data?.records.some(
        record => Number(record.importStatus) === IMPORT_STATUS.PENDING,
      )
        ? 3000
        : false,
  });
}
/** 模板下载使用既有请求客户端，不创建公共导入历史。 */
export function useInventoryTemplate() {
  return useMutation({
    mutationFn: async () => {
      const fileName = I18N.energyCarbon.inventoryImportTemplateFileName;
      const response = await getInventoryTemplateApi();
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });
}
