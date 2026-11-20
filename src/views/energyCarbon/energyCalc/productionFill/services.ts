import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  PageData,
  ProductionDataAuditReq,
  ProductionDataDetail,
  ProductionDataListParams,
  ProductionDataRecord,
  ProductionDataSaveReq,
  ProductionIndicatorOption,
} from './types';

/** @description 业务检索：生产数据填报 - 查询分页列表。 */
export const getProductionDataPageApi = (params: ProductionDataListParams) =>
  request<ResponseData<PageData<ProductionDataRecord>>>({
    method: 'GET',
    url: '/energy/productionData/page',
    params,
  });

/** @description 业务检索：生产数据填报 - 查询单据详情。 */
export const getProductionDataDetailApi = (id: number) =>
  request<ResponseData<ProductionDataDetail>>({
    method: 'GET',
    url: '/energy/productionData/detail',
    params: { id },
  });

/** @description 业务检索：生产数据填报 - 查询固定指标和产品选项。 */
export const getProductionIndicatorOptionsApi = () =>
  request<ResponseData<ProductionIndicatorOption[]>>({
    method: 'GET',
    url: '/energy/productionData/indicatorOptions',
  });

/** @description 业务检索：生产数据填报 - 按组织生成当前秒单据号。 */
export const getProductionDocumentNoApi = (orgId: number) =>
  request<ResponseData<string>>({
    method: 'GET',
    url: '/energy/productionData/nextDocumentNo',
    params: { orgId },
  });

/** @description 业务检索：生产数据填报 - 新增填报单据。 */
export const addProductionDataApi = (data: ProductionDataSaveReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/productionData/add',
    data,
  });

/** @description 业务检索：生产数据填报 - 编辑填报单据。 */
export const editProductionDataApi = (
  data: ProductionDataSaveReq & { id: number },
) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/productionData/edit',
    data,
  });

/** @description 业务检索：生产数据填报 - 提交单据进入审核。 */
export const submitProductionDataApi = (id: number) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/productionData/submit',
    data: { id },
  });

/** @description 业务检索：生产数据填报 - 审核并同步生成或清理台账。 */
export const auditProductionDataApi = (data: ProductionDataAuditReq) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/productionData/audit',
    data,
  });

/** @description 业务检索：生产数据填报 - 删除单据及关联台账。 */
export const deleteProductionDataApi = (id: number) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/productionData/delete',
    data: { id },
  });
