import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  ProductionLedgerListParams,
  ProductionLedgerPage,
  ProductionLedgerRecord,
} from './types';

/**
 * @description 业务检索：生产台账 - 查询审核通过后生成的生产台账分页
 */
export const getProductionLedgerPageApi = (
  params: ProductionLedgerListParams,
) =>
  request<ResponseData<ProductionLedgerPage>>({
    method: 'GET',
    url: '/energy/productionLedger/page',
    params,
  });

/**
 * @description 业务检索：生产台账 - 查询单条生产台账详情
 */
export const getProductionLedgerDetailApi = (id: number) =>
  request<ResponseData<ProductionLedgerRecord>>({
    method: 'GET',
    url: '/energy/productionLedger/detail',
    params: { id },
  });
