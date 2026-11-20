import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  EnergyAddReq,
  EnergyEditReq,
  EnergyListParams,
  EnergyOption,
  EnergyOptionParams,
  EnergyPage,
} from './types';

/** 查询能源列表分页。 */
export const getEnergyPageApi = (params: EnergyListParams) =>
  request<ResponseData<EnergyPage>>({
    method: 'GET',
    url: '/energy/energy/page',
    params,
  });

/** 查询当前登录租户可用的能源下拉选项。 */
export const getEnergyOptionsApi = (params?: EnergyOptionParams) =>
  request<ResponseData<EnergyOption[]>>({
    method: 'GET',
    url: '/energy/energy/options',
    params,
  });

/** 新增能源。 */
export const addEnergyApi = (data: EnergyAddReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/energy/add',
    data,
  });

/** 编辑能源。 */
export const editEnergyApi = (data: EnergyEditReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/energy/edit',
    data,
  });

/** 逻辑删除能源。 */
export const deleteEnergyApi = (id: number) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/energy/delete',
    data: { id },
  });
