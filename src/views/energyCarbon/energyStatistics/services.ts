import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  ConsumptionStatisticsResponse,
  EnergyStatisticsResponse,
  IntensityStatisticsResponse,
  StatisticsOptions,
  StatisticsRequest,
  StatisticsScopeNode,
} from './types';

/**
 * @description 业务检索：能耗统计 - 查询三个统计页面共享的组织和边界树
 */
export const getStatisticsScopeTreeApi = () =>
  request<ResponseData<StatisticsScopeNode[]>>({
    method: 'GET',
    url: '/energy/energyStatistics/scopeTree',
  });

/**
 * @description 业务检索：能耗统计 - 查询三个统计页面共享的能源和产品选项
 */
export const getStatisticsOptionsApi = () =>
  request<ResponseData<StatisticsOptions>>({
    method: 'GET',
    url: '/energy/energyStatistics/options',
  });

/**
 * @description 业务检索：能耗查询 - 查询能源数量和折标煤
 */
export const getEnergyStatisticsApi = (data: StatisticsRequest) =>
  request<ResponseData<EnergyStatisticsResponse>>({
    method: 'POST',
    url: '/energy/energyStatistics/energyQuery',
    data,
  });

/**
 * @description 业务检索：能源消费量计算 - 查询综合能耗和能源占比
 */
export const getConsumptionStatisticsApi = (data: StatisticsRequest) =>
  request<ResponseData<ConsumptionStatisticsResponse>>({
    method: 'POST',
    url: '/energy/energyStatistics/consumption',
    data,
  });

/**
 * @description 业务检索：能耗强度计算 - 查询组织综合能耗强度
 */
export const getIntensityStatisticsApi = (data: StatisticsRequest) =>
  request<ResponseData<IntensityStatisticsResponse>>({
    method: 'POST',
    url: '/energy/energyStatistics/intensity',
    data,
  });
