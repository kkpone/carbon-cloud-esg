import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  EnergyConsumptionAuditReq,
  EnergyConsumptionDetail,
  EnergyConsumptionListParams,
  EnergyConsumptionOptions,
  EnergyConsumptionRecord,
  EnergyConsumptionSaveReq,
  PageData,
} from './types';

/** @description 业务检索：能耗数据填报 - 查询分页列表。 */
export const getEnergyConsumptionPageApi = (
  params: EnergyConsumptionListParams,
) =>
  request<ResponseData<PageData<EnergyConsumptionRecord>>>({
    method: 'GET',
    url: '/energy/energyConsumptionData/page',
    params,
  });

/** @description 业务检索：能耗数据填报 - 查询单据详情。 */
export const getEnergyConsumptionDetailApi = (id: number) =>
  request<ResponseData<EnergyConsumptionDetail>>({
    method: 'GET',
    url: '/energy/energyConsumptionData/detail',
    params: { id },
  });

/** @description 业务检索：能耗数据填报 - 分配组织当日下一单据号。 */
export const getNextDocumentNoApi = (orgId: number) =>
  request<ResponseData<string>>({
    method: 'GET',
    url: '/energy/energyConsumptionData/nextDocumentNo',
    params: { orgId },
  });

/** @description 业务检索：能耗数据填报 - 查询组织统计边界二级选项。 */
export const getBoundaryOptionsApi = (orgId: number) =>
  request<ResponseData<EnergyConsumptionOptions>>({
    method: 'GET',
    url: '/energy/energyConsumptionData/boundaryOptions',
    params: { orgId },
  });

/** @description 业务检索：能耗数据填报 - 查询边界资源或租户级独立资源。 */
export const getResourceOptionsApi = (params: { boundaryId?: number }) =>
  request<ResponseData<EnergyConsumptionOptions>>({
    method: 'GET',
    url: '/energy/energyConsumptionData/resourceOptions',
    params,
  });

/** @description 业务检索：能耗数据填报 - 新增填报单据。 */
export const addEnergyConsumptionApi = (data: EnergyConsumptionSaveReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/energyConsumptionData/add',
    data,
  });

/** @description 业务检索：能耗数据填报 - 编辑填报单据。 */
export const editEnergyConsumptionApi = (
  data: EnergyConsumptionSaveReq & { id: number },
) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/energyConsumptionData/edit',
    data,
  });

/** @description 业务检索：能耗数据填报 - 提交单据进入审核。 */
export const submitEnergyConsumptionApi = (id: number) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/energyConsumptionData/submit',
    data: { id },
  });

/** @description 业务检索：能耗数据填报 - 审核并同步生成或清理台账。 */
export const auditEnergyConsumptionApi = (data: EnergyConsumptionAuditReq) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/energyConsumptionData/audit',
    data,
  });

/** @description 业务检索：能耗数据填报 - 删除单据及其关联台账。 */
export const deleteEnergyConsumptionApi = (id: number) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/energyConsumptionData/delete',
    data: { id },
  });
