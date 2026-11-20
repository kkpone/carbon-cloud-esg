import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';
import type {
  EnergyEquipmentAddReq,
  EnergyEquipmentEditReq,
  EnergyEquipmentListParams,
  EnergyEquipmentPage,
} from './types';

/**
 * @description 查询当前数据权限组织内去重的名称、编号筛选选项。
 */
export const getEnergyEquipmentOptionsApi = (orgId?: number) =>
  request<ResponseData<{ names: string[]; codes: string[] }>>({
    method: 'GET',
    url: '/energy/energyEquipment/options',
    params: { orgId },
  });

/**
 * @description 查询用能设备分页。
 */
export const getEnergyEquipmentPageApi = (params: EnergyEquipmentListParams) =>
  request<ResponseData<EnergyEquipmentPage>>({
    method: 'GET',
    url: '/energy/energyEquipment/page',
    params,
  });

/**
 * @description 新增用能设备。
 */
export const addEnergyEquipmentApi = (data: EnergyEquipmentAddReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/energyEquipment/add',
    data,
  });

/**
 * @description 编辑用能设备。
 */
export const editEnergyEquipmentApi = (data: EnergyEquipmentEditReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/energyEquipment/edit',
    data,
  });

/**
 * @description 逻辑删除用能设备。
 */
export const deleteEnergyEquipmentApi = (id: number) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/energyEquipment/delete',
    data: { id },
  });
