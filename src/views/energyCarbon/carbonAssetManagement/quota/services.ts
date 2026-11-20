import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  CarbonQuotaIndustry,
  CarbonQuotaPage,
  CarbonQuotaRecord,
  CarbonQuotaSave,
} from './types';

/**
 * @description 查询当前数据权限组织内的碳配额测算分页。
 */
export const getCarbonQuotaPageApi = (params: {
  pageNum: number;
  pageSize: number;
  orgId?: number;
  industry?: CarbonQuotaIndustry;
}) =>
  request<ResponseData<CarbonQuotaPage>>({
    method: 'GET',
    url: '/energy/carbonQuota/page',
    params,
  });

/**
 * @description 查询单条碳配额测算及其政策计算明细。
 */
export const getCarbonQuotaDetailApi = (id: number) =>
  request<ResponseData<CarbonQuotaRecord>>({
    method: 'GET',
    url: '/energy/carbonQuota/detail',
    params: { id },
  });

/**
 * @description 新增碳配额测算，服务端按行业政策公式生成明细结果。
 */
export const addCarbonQuotaApi = (data: CarbonQuotaSave) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/carbonQuota/add',
    data,
  });

/**
 * @description 编辑碳配额测算并整体覆盖原政策计算明细。
 */
export const editCarbonQuotaApi = (data: CarbonQuotaSave & { id: number }) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/carbonQuota/edit',
    data,
  });

/**
 * @description 逻辑删除指定碳配额测算。
 */
export const deleteCarbonQuotaApi = (id: number) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/carbonQuota/delete',
    data: { id },
  });
