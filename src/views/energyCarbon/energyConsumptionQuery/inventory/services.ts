import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';
import type {
  InventoryImportFile,
  InventoryImportLogPage,
  InventoryImportPageParams,
  InventoryImportResult,
  InventoryListParams,
  InventoryOptions,
  InventoryPage,
  InventoryRecord,
  InventorySave,
} from './types';

/**
 * @description 库存盘点权限分页，统计日期包含首尾日期。
 */
export const getInventoryPageApi = (params: InventoryListParams) =>
  request<ResponseData<InventoryPage>>({
    method: 'GET',
    url: '/energy/energyInventory/page',
    params,
  });
/**
 * @description 查询库存详情及保存快照，历史产品不重写。
 */
export const getInventoryDetailApi = (id: number) =>
  request<ResponseData<InventoryRecord>>({
    method: 'GET',
    url: '/energy/energyInventory/detail',
    params: { id },
  });
/**
 * @description 新增库存保存即生效，单位快照由后端产生。
 */
export const addInventoryApi = (data: InventorySave) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/energyInventory/add',
    data,
  });
/**
 * @description 编辑库存，仅能源变化刷新单位和折煤快照。
 */
export const editInventoryApi = (data: InventorySave) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/energyInventory/edit',
    data,
  });
/**
 * @description 删除库存退出后续查询计算，不删除历史台账。
 */
export const deleteInventoryApi = (id: number) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/energyInventory/delete',
    data: { id },
  });
/**
 * @description 生成PD开头单号建议，可编辑。
 */
export const getInventoryDocumentNoApi = (orgId: number) =>
  request<ResponseData<string>>({
    method: 'GET',
    url: '/energy/energyInventory/nextDocumentNo',
    params: { orgId },
  });
/**
 * @description 库存入口权限下的组织边界二级选项。
 */
export const getInventoryBoundariesApi = (orgId: number) =>
  request<ResponseData<InventoryOptions>>({
    method: 'GET',
    url: '/energy/energyInventory/boundaryOptions',
    params: { orgId },
  });
/**
 * @description 查询边界配置能源、产品与单位，不调用边界查看接口。
 */
export const getInventoryResourcesApi = (boundaryId: number) =>
  request<ResponseData<InventoryOptions>>({
    method: 'GET',
    url: '/energy/energyInventory/resourceOptions',
    params: { boundaryId },
  });
/**
 * @description 下载库存专用Excel，附件通过编辑补充。
 */
export const getInventoryTemplateApi = () =>
  request<Blob>({
    method: 'GET',
    url: '/energy/energyInventory/importTemplate',
    responseType: 'blob',
  });
/**
 * @description 一行一单；任一行错误整批零保存，返回错误文件地址。
 */
export const importInventoryApi = (data: InventoryImportFile) =>
  request<ResponseData<InventoryImportResult>>({
    method: 'POST',
    url: '/energy/energyInventory/import',
    data,
  });
/**
 * @description 查询当前用户本人提交的库存盘点导入记录，用户与租户条件由服务端注入。
 */
export const getInventoryImportRecordsApi = (
  params: InventoryImportPageParams,
) =>
  request<ResponseData<InventoryImportLogPage>>({
    method: 'GET',
    url: '/energy/energyInventory/importRecords',
    params,
  });
