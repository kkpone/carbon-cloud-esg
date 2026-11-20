import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';
import type {
  BoundaryAnalysisResponse,
  EfficiencyAnalysisRequest,
  EfficiencyAnalysisResponse,
  FormAnalysisResponse,
  OverviewResponse,
  SinglePeriodAnalysisRequest,
  StructureAnalysisResponse,
} from './types';

/**
 * @description 能源形态分析，读取排除原料用能和耗能工质后的形态审核快照汇总。
 */
export const getFormAnalysisApi = (data: SinglePeriodAnalysisRequest) =>
  request<ResponseData<FormAnalysisResponse>>({
    method: 'POST',
    url: '/energy/energyStatistics/formAnalysis',
    data,
  });

/**
 * @description 业务检索：能耗数据概览 - 查询单周期十项指标及同比环比
 */
export const getEnergyOverviewApi = (data: SinglePeriodAnalysisRequest) =>
  request<ResponseData<OverviewResponse>>({
    method: 'POST',
    url: '/energy/energyStatistics/overview',
    data,
  });

/**
 * @description 业务检索：边界能耗分析 - 查询边界 TOP10 图表和全量表格
 */
export const getBoundaryAnalysisApi = (data: SinglePeriodAnalysisRequest) =>
  request<ResponseData<BoundaryAnalysisResponse>>({
    method: 'POST',
    url: '/energy/energyStatistics/boundaryAnalysis',
    data,
  });

/**
 * @description 业务检索：能耗结构分析 - 查询结构摘要、饼图和全量表格
 */
export const getStructureAnalysisApi = (data: SinglePeriodAnalysisRequest) =>
  request<ResponseData<StructureAnalysisResponse>>({
    method: 'POST',
    url: '/energy/energyStatistics/structureAnalysis',
    data,
  });

/**
 * @description 业务检索：能源效率分析 - 查询组织或具体边界连续周期效率
 */
export const getEfficiencyAnalysisApi = (data: EfficiencyAnalysisRequest) =>
  request<ResponseData<EfficiencyAnalysisResponse>>({
    method: 'POST',
    url: '/energy/energyStatistics/efficiencyAnalysis',
    data,
  });
