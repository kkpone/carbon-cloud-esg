import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  EnergyFlowSettingDetail,
  EnergyFlowSettingSaveReq,
} from './types';

/**
 * @description 业务检索：能流设置 - 查询组织阶段开关、已选资源和当前可用选项
 */
export const getEnergyFlowSettingDetailApi = (orgId: number) =>
  request<ResponseData<EnergyFlowSettingDetail>>({
    method: 'GET',
    url: '/energy/energyFlowSetting/detail',
    params: { orgId },
  });

/**
 * @description 业务检索：能流设置 - 覆盖保存组织阶段开关和五组资源选择
 */
export const saveEnergyFlowSettingApi = (data: EnergyFlowSettingSaveReq) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/energyFlowSetting/save',
    data,
  });
