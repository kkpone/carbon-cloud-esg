import I18N from '@/lang/I18N';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { App } from 'antd';

import {
  addOrgBoundaryApi,
  deleteOrgBoundaryApi,
  editOrgBoundaryApi,
  getOrgBoundaryDetailApi,
  getOrgBoundaryPageApi,
  getOrgStatisticsBoundaryConfigApi,
  saveOrgStatisticsBoundaryConfigApi,
} from '../services';
import type {
  OrgBoundaryAddReq,
  OrgBoundaryEditReq,
  OrgBoundaryListParams,
  OrgStatisticsBoundaryConfigSaveReq,
} from '../types';

/** 组织边界模块 Query Key。 */
export const orgBoundaryQueryKeys = {
  all: ['energy-org-boundary'] as const,
  lists: () => [...orgBoundaryQueryKeys.all, 'list'] as const,
  list: (params: OrgBoundaryListParams) =>
    [...orgBoundaryQueryKeys.lists(), params] as const,
  details: () => [...orgBoundaryQueryKeys.all, 'detail'] as const,
  detail: (id: number) => [...orgBoundaryQueryKeys.details(), id] as const,
  statisticsConfigs: () =>
    [...orgBoundaryQueryKeys.all, 'statistics-config'] as const,
  statisticsConfig: (orgId: number) =>
    [...orgBoundaryQueryKeys.statisticsConfigs(), orgId] as const,
};

/** 按当前组织和边界类型查询分页数据。 */
export function useOrgBoundaries(
  params: OrgBoundaryListParams,
  enabled: boolean,
) {
  return useQuery({
    queryKey: orgBoundaryQueryKeys.list(params),
    queryFn: () => getOrgBoundaryPageApi(params).then(r => r.data.data),
    enabled,
  });
}

/** 查询组织边界详情，关闭抽屉时不发起请求。 */
export function useOrgBoundaryDetail(id: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: orgBoundaryQueryKeys.detail(id ?? 0),
    queryFn: () => getOrgBoundaryDetailApi(id as number).then(r => r.data.data),
    enabled: enabled && id !== undefined,
  });
}

/** 查询组织默认综合能耗统计边界，未配置时后端返回生产系统。 */
export function useOrgStatisticsBoundaryConfig(
  orgId: number | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: orgBoundaryQueryKeys.statisticsConfig(orgId ?? 0),
    queryFn: () =>
      getOrgStatisticsBoundaryConfigApi(orgId as number).then(r => r.data.data),
    enabled: enabled && orgId !== undefined,
  });
}

/** 业务检索：边界管理 - 保存综合能耗统计边界并刷新组织配置缓存。 */
export function useSaveOrgStatisticsBoundaryConfig() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrgStatisticsBoundaryConfigSaveReq) =>
      saveOrgStatisticsBoundaryConfigApi(data).then(r => r.data.data),
    onSuccess: data => {
      message.success(I18N.common.feedback.saveSuccess);
      queryClient.invalidateQueries({
        queryKey: orgBoundaryQueryKeys.statisticsConfig(data.orgId),
        exact: true,
      });
    },
  });
}

/** 业务检索：边界管理 - 新增组织边界并刷新当前分页缓存。 */
export function useAddOrgBoundary(params: OrgBoundaryListParams) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrgBoundaryAddReq) =>
      addOrgBoundaryApi(data).then(r => r.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.addSuccess);
      queryClient.invalidateQueries({
        queryKey: orgBoundaryQueryKeys.list(params),
        exact: true,
      });
    },
  });
}

/** 业务检索：边界管理 - 编辑组织边界并刷新列表与详情缓存。 */
export function useEditOrgBoundary(params: OrgBoundaryListParams) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: OrgBoundaryEditReq) =>
      editOrgBoundaryApi(data).then(r => r.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.saveSuccess);
      queryClient.invalidateQueries({
        queryKey: orgBoundaryQueryKeys.list(params),
        exact: true,
      });
      queryClient.invalidateQueries({
        queryKey: orgBoundaryQueryKeys.details(),
      });
    },
  });
}

/** 业务检索：边界管理 - 删除组织边界并刷新当前分页缓存。 */
export function useDeleteOrgBoundary(params: OrgBoundaryListParams) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) =>
      deleteOrgBoundaryApi({ id }).then(r => r.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.deleteSuccess);
      queryClient.invalidateQueries({
        queryKey: orgBoundaryQueryKeys.list(params),
        exact: true,
      });
    },
  });
}
