import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type { EnergyBudgetDetail, EnergyBudgetSave } from './types';

/**
 * @description 查询组织预算设置及实际、目标、预测年度趋势；实际缺失由响应保留为空。
 */
export const getEnergyBudgetDetailApi = (orgId: number) =>
  request<ResponseData<EnergyBudgetDetail>>({
    method: 'GET',
    url: '/energy/energyBudget/detail',
    params: { orgId },
  });

/**
 * @description 覆盖保存组织预算设置，服务端校验基准数据后计算复利规划线。
 */
export const saveEnergyBudgetApi = (data: EnergyBudgetSave) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/energyBudget/save',
    data,
  });
