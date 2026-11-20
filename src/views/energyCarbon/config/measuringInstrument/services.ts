import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';
import type {
  MeasuringInstrumentAddReq,
  MeasuringInstrumentEditReq,
  MeasuringInstrumentListParams,
  MeasuringInstrumentPage,
} from './types';

/**
 * @description 查询当前数据权限组织内去重的名称、编号筛选选项。
 */
export const getMeasuringInstrumentOptionsApi = (orgId?: number) =>
  request<ResponseData<{ names: string[]; codes: string[] }>>({
    method: 'GET',
    url: '/energy/measuringInstrument/options',
    params: { orgId },
  });

/** 查询计量器具分页。 */
export const getMeasuringInstrumentPageApi = (
  params: MeasuringInstrumentListParams,
) =>
  request<ResponseData<MeasuringInstrumentPage>>({
    method: 'GET',
    url: '/energy/measuringInstrument/page',
    params,
  });

/** 新增计量器具。 */
export const addMeasuringInstrumentApi = (data: MeasuringInstrumentAddReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/measuringInstrument/add',
    data,
  });

/** 编辑计量器具。 */
export const editMeasuringInstrumentApi = (data: MeasuringInstrumentEditReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/measuringInstrument/edit',
    data,
  });

/** 逻辑删除计量器具。 */
export const deleteMeasuringInstrumentApi = (id: number) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/measuringInstrument/delete',
    data: { id },
  });
