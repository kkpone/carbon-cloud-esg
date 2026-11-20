import { useQuery } from '@tanstack/react-query';

import {
  getProductionLedgerDetailApi,
  getProductionLedgerPageApi,
} from '../services';
import type { ProductionLedgerListParams } from '../types';

/** 生产台账查询键按列表和详情分组，便于审核生产数据后整组刷新。 */
export const productionLedgerQueryKeys = {
  all: ['production-ledger'] as const,
  list: (params: ProductionLedgerListParams) =>
    [...productionLedgerQueryKeys.all, 'list', params] as const,
  detail: (id: number) =>
    [...productionLedgerQueryKeys.all, 'detail', id] as const,
};

/** 查询按月拆分的生产台账。 */
export function useProductionLedgerPage(params: ProductionLedgerListParams) {
  return useQuery({
    queryKey: productionLedgerQueryKeys.list(params),
    queryFn: () =>
      getProductionLedgerPageApi(params).then(response => response.data.data),
  });
}

/** 按需查询生产台账详情。 */
export function useProductionLedgerDetail(id?: number) {
  return useQuery({
    queryKey: productionLedgerQueryKeys.detail(id ?? 0),
    queryFn: () =>
      getProductionLedgerDetailApi(id as number).then(
        response => response.data.data,
      ),
    enabled: id !== undefined,
  });
}
