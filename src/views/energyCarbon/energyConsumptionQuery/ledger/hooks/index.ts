import { useQuery } from '@tanstack/react-query';

import { getEnergyLedgerDetailApi, getEnergyLedgerPageApi } from '../services';
import type { EnergyLedgerListParams } from '../types';

/** 能耗台账查询键按列表和详情分组，便于能耗审核后整组刷新。 */
export const energyLedgerQueryKeys = {
  all: ['energy-ledger'] as const,
  list: (params: EnergyLedgerListParams) =>
    [...energyLedgerQueryKeys.all, 'list', params] as const,
  detail: (id: number) => [...energyLedgerQueryKeys.all, 'detail', id] as const,
};

/** 查询逐日能耗台账分页。 */
export function useEnergyLedgerPage(params: EnergyLedgerListParams) {
  return useQuery({
    queryKey: energyLedgerQueryKeys.list(params),
    queryFn: () =>
      getEnergyLedgerPageApi(params).then(response => response.data.data),
  });
}

/** 按需查询单条台账详情。 */
export function useEnergyLedgerDetail(id?: number) {
  return useQuery({
    queryKey: energyLedgerQueryKeys.detail(id ?? 0),
    queryFn: () =>
      getEnergyLedgerDetailApi(id as number).then(
        response => response.data.data,
      ),
    enabled: id !== undefined,
  });
}
