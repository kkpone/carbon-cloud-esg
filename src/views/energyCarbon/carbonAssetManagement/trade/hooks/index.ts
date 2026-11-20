import I18N from '@/lang/I18N';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';

import { carbonAccountQueryKeys } from '../../account/hooks';
import {
  addCarbonTradeApi,
  deleteCarbonTradeApi,
  editCarbonTradeApi,
  getCarbonTradeDetailApi,
  getCarbonTradePageApi,
  getNextCarbonTradeDocumentNoApi,
} from '../services';
import type {
  CarbonTradeEditReq,
  CarbonTradeListParams,
  CarbonTradeSaveReq,
} from '../types';

/** 碳交易查询键集中管理，写操作可按列表、详情和账户概览分组失效缓存。 */
export const carbonTradeQueryKeys = {
  all: ['carbon-trade'] as const,
  lists: () => [...carbonTradeQueryKeys.all, 'list'] as const,
  list: (params: CarbonTradeListParams) =>
    [...carbonTradeQueryKeys.lists(), params] as const,
  details: () => [...carbonTradeQueryKeys.all, 'detail'] as const,
  detail: (id: number | undefined) =>
    [...carbonTradeQueryKeys.details(), id] as const,
};

/** 按当前 URL 筛选和分页参数查询碳交易列表。 */
export function useCarbonTradePage(params: CarbonTradeListParams) {
  return useQuery({
    queryKey: carbonTradeQueryKeys.list(params),
    queryFn: () =>
      getCarbonTradePageApi(params).then(response => response.data.data),
  });
}

/** 打开详情抽屉后查询单条交易，未选中记录时不发送请求。 */
export function useCarbonTradeDetail(id: number | undefined) {
  return useQuery({
    queryKey: carbonTradeQueryKeys.detail(id),
    queryFn: () =>
      getCarbonTradeDetailApi(id as number).then(
        response => response.data.data,
      ),
    enabled: id !== undefined,
  });
}

/** 按所属组织占用当天下一交易单据号，仅由新增表单主动触发。 */
export function useNextCarbonTradeDocumentNo() {
  return useMutation({
    mutationFn: (orgId: number) =>
      getNextCarbonTradeDocumentNoApi(orgId).then(
        response => response.data.data,
      ),
  });
}

/** 交易写入会同时改变列表、详情和账户余额，成功后统一刷新三类缓存。 */
function useRefreshCarbonAsset() {
  const queryClient = useQueryClient();
  return () => {
    // 列表与详情可能包含本次交易字段，账户概览则需要重新读取交易后的四账户余额。
    queryClient.invalidateQueries({
      queryKey: carbonTradeQueryKeys.lists(),
    });
    queryClient.invalidateQueries({
      queryKey: carbonTradeQueryKeys.details(),
    });
    queryClient.invalidateQueries({
      queryKey: carbonAccountQueryKeys.all,
    });
  };
}

/** 新增交易成功后刷新交易数据和账户概览。 */
export function useAddCarbonTrade() {
  const refresh = useRefreshCarbonAsset();
  return useMutation({
    mutationFn: (data: CarbonTradeSaveReq) =>
      addCarbonTradeApi(data).then(response => response.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.addSuccess);
      refresh();
    },
  });
}

/** 编辑交易成功后刷新新字段、账户冲正结果和当前概览。 */
export function useEditCarbonTrade() {
  const refresh = useRefreshCarbonAsset();
  return useMutation({
    mutationFn: (data: CarbonTradeEditReq) =>
      editCarbonTradeApi(data).then(response => response.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.saveSuccess);
      refresh();
    },
  });
}

/** 删除交易成功后移除列表记录，并刷新账户冲正后的余量。 */
export function useDeleteCarbonTrade() {
  const refresh = useRefreshCarbonAsset();
  return useMutation({
    mutationFn: deleteCarbonTradeApi,
    onSuccess: () => {
      message.success(I18N.common.feedback.deleteSuccess);
      refresh();
    },
  });
}
