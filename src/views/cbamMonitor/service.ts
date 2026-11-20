import { IPageList, request, ResponseData } from '@/api/request';

import {
  MonitorAssociatedBusiness,
  MonitorBusinessType,
  FactoryOption,
  FactoryLocationRequest,
  FactoryLocationResult,
  MonitorChildDeleteRequest,
  MonitorCnOption,
  MonitorEvidence,
  MonitorEvidenceRelation,
  MonitorOverview,
  MonitorPlanDetail,
  MonitorPlanPage,
  MonitorPlanPayload,
  MonitorPlanQuery,
  MonitorPlanSaveResult,
  MonitorPrecursorOption,
  MonitorPrecursorQuery,
} from './types';

export const getMonitorOverview = (
  params: Omit<MonitorPlanQuery, 'pageNum' | 'pageSize'>,
) =>
  request<ResponseData<MonitorOverview>>({
    method: 'GET',
    url: '/cbam2/monitor/overview',
    params,
  });

export const getMonitorPage = (params: MonitorPlanQuery) =>
  request<ResponseData<MonitorPlanPage>>({
    method: 'GET',
    url: '/cbam2/monitor/page',
    params,
  });

export const getMonitorFactoryPage = (params: MonitorPlanQuery) =>
  request<ResponseData<MonitorPlanPage>>({
    method: 'GET',
    url: '/cbam2/monitor/factory/page',
    params,
  });

export const getMonitorYears = () =>
  request<ResponseData<number[]>>({
    method: 'GET',
    url: '/cbam2/monitor/years',
  });

export const getMonitorUserCompany = () =>
  request<ResponseData<{ companyName?: string }>>({
    method: 'GET',
    url: '/management/user/queryUserCompany',
  });

export const getMonitorDetail = (id: number | string) =>
  request<ResponseData<MonitorPlanDetail>>({
    method: 'GET',
    url: `/cbam2/monitor/plans/${id}`,
  });

export const copyMonitorPlan = (id: number) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: `/cbam2/monitor/plans/${id}/copy`,
    silentResponseError: true,
  });

export type MonitorPlanReportLanguage = 'EN' | 'ZH';

export const generateMonitorPlanReport = (
  id: number,
  language: MonitorPlanReportLanguage,
) =>
  request<Blob>({
    method: 'POST',
    url: `/cbam2/monitor/plans/${id}/reports/${language}`,
    responseType: 'blob',
    silentResponseError: true,
  });

export const saveMonitorDraft = (data: MonitorPlanPayload) =>
  request<ResponseData<MonitorPlanSaveResult>>({
    method: 'POST',
    url: '/cbam2/monitor/plans/save-draft',
    data,
    silentResponseError: true,
  });

export const saveMonitor = (data: MonitorPlanPayload) =>
  request<ResponseData<MonitorPlanSaveResult>>({
    method: 'POST',
    url: '/cbam2/monitor/plans/save',
    data,
    silentResponseError: true,
  });

export const deleteMonitorChild = (
  id: number | string,
  data: MonitorChildDeleteRequest,
) =>
  request<ResponseData<MonitorPlanSaveResult>>({
    method: 'DELETE',
    url: `/cbam2/monitor/plans/${id}/children`,
    data,
  });

export const deleteMonitorPlan = (id: number) =>
  request<ResponseData<void>>({
    method: 'DELETE',
    url: `/cbam2/monitor/plans/${id}`,
  });

export const getMonitorFactories = (params: {
  pageNum: number;
  pageSize: number;
  factoryName?: string;
}) =>
  request<ResponseData<IPageList<FactoryOption>>>({
    method: 'GET',
    url: '/cbam2/factory',
    params,
  });

export const getMonitorCnOptions = () =>
  request<ResponseData<IPageList<MonitorCnOption>>>({
    method: 'GET',
    url: '/cbam2/defaultCn',
    params: {
      pageNum: 1,
      pageSize: 10000,
      deduplicateCode: true,
    },
  });

export const getMonitorPrecursorPage = (params: MonitorPrecursorQuery) =>
  request<ResponseData<IPageList<MonitorPrecursorOption>>>({
    method: 'GET',
    url: '/cbam2/supplyInfo/findAuditPage',
    params,
  });

export const createMonitorFactory = (data: FactoryOption) =>
  request<ResponseData<boolean>>({
    method: 'POST',
    url: '/cbam2/factory',
    data,
  });

export const getMonitorFactory = (id: number) =>
  request<ResponseData<FactoryOption>>({
    method: 'GET',
    url: `/cbam2/factory/${id}`,
  });

export const updateMonitorFactory = (data: FactoryOption) =>
  request<ResponseData<boolean>>({
    method: 'PUT',
    url: '/cbam2/factory',
    data,
  });

export const deleteMonitorFactory = (id: number) =>
  request<ResponseData<boolean>>({
    method: 'DELETE',
    url: `/cbam2/factory/${id}`,
  });

export const getMonitorEvidences = (planId: number) =>
  request<ResponseData<MonitorEvidence[]>>({
    method: 'GET',
    url: `/cbam2/monitor/plans/${planId}/evidences`,
  });

export const createMonitorEvidence = (planId: number, data: MonitorEvidence) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: `/cbam2/monitor/plans/${planId}/evidences`,
    data,
  });

export const updateMonitorEvidence = (
  planId: number,
  evidenceId: number,
  data: MonitorEvidence,
) =>
  request<ResponseData<MonitorEvidence>>({
    method: 'PUT',
    url: `/cbam2/monitor/plans/${planId}/evidences/${evidenceId}`,
    data,
    silentResponseError: true,
  });

export const createMonitorEvidenceRelation = (
  planId: number,
  data: Omit<MonitorEvidenceRelation, 'id'>,
) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: `/cbam2/monitor/plans/${planId}/evidence-relations`,
    data,
  });

export interface MonitorOrgOption {
  id: number;
  name: string;
  children?: MonitorOrgOption[];
}

export const getMonitorOrgTree = () =>
  request<ResponseData<MonitorOrgOption[]>>({
    method: 'GET',
    url: '/cbam2/cbam/orgList',
  });

/** 查询计划直接关联的业务及待推送状态。 */
export const getMonitorAssociatedBusiness = (
  planId: number | string,
  type: MonitorBusinessType,
) =>
  request<ResponseData<MonitorAssociatedBusiness[]>>({
    method: 'GET',
    url: `/cbam2/monitor/plans/${planId}/${type}`,
    silentResponseError: true,
  });

/** 推送已保存计划；请求不携带前端尚未保存的表单内容。 */
export const pushMonitorBusiness = (
  planId: number | string,
  type: MonitorBusinessType,
  ids: number[],
) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: `/cbam2/monitor/plans/${type}/sync/edit`,
    data: {
      planId,
      ...(type === 'accounting-tasks'
        ? { cbamIdList: ids }
        : { operationIdList: ids }),
    },
    silentResponseError: true,
  });

/** 仅查询当前地址的定位建议，不保存工厂；离开抽屉时取消前端等待。 */
export const calculateFactoryLocation = (
  data: FactoryLocationRequest,
  signal: AbortSignal,
) =>
  request<ResponseData<FactoryLocationResult>>({
    method: 'POST',
    url: '/cbam2/factory/calculateLocation',
    timeout: 110000,
    data,
    signal,
    silentResponseError: true,
  });
