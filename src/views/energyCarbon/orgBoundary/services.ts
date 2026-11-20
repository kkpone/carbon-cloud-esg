import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  OrgBoundaryAddReq,
  OrgBoundaryDeleteReq,
  OrgBoundaryDetail,
  OrgBoundaryEditReq,
  OrgBoundaryListParams,
  OrgBoundaryPage,
  OrgStatisticsBoundaryConfig,
  OrgStatisticsBoundaryConfigSaveReq,
} from './types';

/**
 * @description 按组织和边界类型分页查询组织边界。
 */
export const getOrgBoundaryPageApi = (params: OrgBoundaryListParams) =>
  request<ResponseData<OrgBoundaryPage>>({
    method: 'GET',
    url: '/energy/orgBoundary/page',
    params,
  });

/** 查询组织边界详情及四类边界设置。 */
export const getOrgBoundaryDetailApi = (id: number) =>
  request<ResponseData<OrgBoundaryDetail>>({
    method: 'GET',
    url: '/energy/orgBoundary/detail',
    params: { id },
  });

/**
 * @description 在当前组织下新增指定类型的组织边界。
 */
export const addOrgBoundaryApi = (data: OrgBoundaryAddReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/orgBoundary/add',
    data,
  });

/**
 * @description 编辑组织边界基础信息和边界设置。
 */
export const editOrgBoundaryApi = (data: OrgBoundaryEditReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/orgBoundary/edit',
    data,
  });

/**
 * @description 逻辑删除一条组织边界。
 */
export const deleteOrgBoundaryApi = (data: OrgBoundaryDeleteReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/orgBoundary/delete',
    data,
  });

/**
 * @description 查询组织当前综合能耗统计边界；接口无记录时返回生产系统。
 */
export const getOrgStatisticsBoundaryConfigApi = (orgId: number) =>
  request<ResponseData<OrgStatisticsBoundaryConfig>>({
    method: 'GET',
    url: '/energy/orgBoundary/statisticsConfig',
    params: { orgId },
  });

/**
 * @description 保存组织唯一的综合能耗统计边界类型。
 */
export const saveOrgStatisticsBoundaryConfigApi = (
  data: OrgStatisticsBoundaryConfigSaveReq,
) =>
  request<ResponseData<OrgStatisticsBoundaryConfig>>({
    method: 'POST',
    url: '/energy/orgBoundary/statisticsConfig',
    data,
  });
