import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  EnergyLedgerListParams,
  EnergyLedgerPage,
  EnergyLedgerRecord,
} from './types';

/**
 * @description 业务检索：能耗台账 - 查询审核通过后按日拆分的台账分页
 */
export const getEnergyLedgerPageApi = (params: EnergyLedgerListParams) =>
  request<ResponseData<EnergyLedgerPage>>({
    method: 'GET',
    url: '/energy/energyConsumptionLedger/page',
    params,
  });

/**
 * @description 业务检索：能耗台账 - 查询单条逐日能耗台账详情
 */
export const getEnergyLedgerDetailApi = (id: number) =>
  request<ResponseData<EnergyLedgerRecord>>({
    method: 'GET',
    url: '/energy/energyConsumptionLedger/detail',
    params: { id },
  });
