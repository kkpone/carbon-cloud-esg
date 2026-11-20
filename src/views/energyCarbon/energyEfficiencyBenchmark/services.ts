import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';

import type {
  BenchmarkAnalysisRequest,
  BenchmarkAnalysisResponse,
  BenchmarkDataPage,
  BenchmarkDataRecord,
  BenchmarkDataSave,
  BenchmarkOptions,
} from './types';

/**
 * @description 查询对标类型、指标适用范围、数据权限组织和动态标准产品选项。
 */
export const getBenchmarkOptionsApi = () =>
  request<ResponseData<BenchmarkOptions>>({
    method: 'GET',
    url: '/energy/benchmarkData/options',
  });

/**
 * @description 按当前租户和可选年度查询对标数据分页。
 */
export const getBenchmarkDataPageApi = (params: {
  pageNum: number;
  pageSize: number;
  year?: number;
}) =>
  request<ResponseData<BenchmarkDataPage>>({
    method: 'GET',
    url: '/energy/benchmarkData/page',
    params,
  });

/**
 * @description 查询单条对标数据，响应中的标准产品名称和单位来自当前主数据。
 */
export const getBenchmarkDataDetailApi = (id: number) =>
  request<ResponseData<BenchmarkDataRecord>>({
    method: 'GET',
    url: '/energy/benchmarkData/detail',
    params: { id },
  });

/**
 * @description 新增年度对标数据，服务端校验类型适用指标和至少一项指标。
 */
export const addBenchmarkDataApi = (data: BenchmarkDataSave) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/benchmarkData/add',
    data,
  });

/**
 * @description 编辑年度对标数据，未填写或不适用指标由服务端清空处理。
 */
export const editBenchmarkDataApi = (
  data: BenchmarkDataSave & { id: number },
) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/benchmarkData/edit',
    data,
  });

/**
 * @description 逻辑删除指定年度对标数据。
 */
export const deleteBenchmarkDataApi = (id: number) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: '/energy/benchmarkData/delete',
    data: { id },
  });

/**
 * @description 查询单周期组织实际指标与所选年度对标值；缺失或不适用值由响应保留为空。
 */
export const getBenchmarkAnalysisApi = (data: BenchmarkAnalysisRequest) =>
  request<ResponseData<BenchmarkAnalysisResponse>>({
    method: 'POST',
    url: '/energy/energyStatistics/benchmarkAnalysis',
    data,
  });
