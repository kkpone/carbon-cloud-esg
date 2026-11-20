import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  CarbonTradeDetail,
  CarbonTradeEditReq,
  CarbonTradeListParams,
  CarbonTradePage,
  CarbonTradeSaveReq,
} from './types';

/**
 * @description 业务检索：碳交易管理 - 查询当前用户数据权限内的交易分页
 */
export const getCarbonTradePageApi = (params: CarbonTradeListParams) =>
  request<ResponseData<CarbonTradePage>>({
    method: 'GET',
    url: '/energy/carbonTrade/page',
    params,
  });

/**
 * @description 业务检索：碳交易管理 - 查询交易详情且不向页面暴露账户影响快照
 */
export const getCarbonTradeDetailApi = (id: number) =>
  request<ResponseData<CarbonTradeDetail>>({
    method: 'GET',
    url: '/energy/carbonTrade/detail',
    params: { id },
  });

/**
 * @description 业务检索：碳交易管理 - 按所属组织生成当天递增的交易单据号
 */
export const getNextCarbonTradeDocumentNoApi = (orgId: number) =>
  request<ResponseData<string>>({
    method: 'GET',
    url: '/energy/carbonTrade/nextDocumentNo',
    params: { orgId },
  });

/**
 * @description 业务检索：碳交易管理 - 新增交易并由后端计算金额、手续费及账户增量
 */
export const addCarbonTradeApi = (data: CarbonTradeSaveReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/carbonTrade/add',
    data,
  });

/**
 * @description 业务检索：碳交易管理 - 编辑交易并由后端完成旧账户冲正
 */
export const editCarbonTradeApi = (data: CarbonTradeEditReq) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/carbonTrade/edit',
    data,
  });

/**
 * @description 业务检索：碳交易管理 - 删除交易并按历史账户快照执行冲正
 */
export const deleteCarbonTradeApi = (id: number) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/carbonTrade/delete',
    data: { id },
  });
