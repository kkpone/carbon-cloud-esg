/** 计量器具分页行。 */
export interface MeasuringInstrumentRecord {
  id: number;
  orgId?: number | null;
  orgName?: string | null;
  instrumentName: string;
  instrumentCode: string;
  specification?: string | null;
  model?: string | null;
  energyId: number;
  energyName?: string | null;
  manufacturer?: string | null;
  remark?: string | null;
  updateByName?: string;
  updateTime?: string;
}

/** 计量器具分页查询参数。 */
export interface MeasuringInstrumentListParams {
  pageNum: number;
  pageSize: number;
  orgId?: number;
  instrumentName?: string;
  instrumentCode?: string;
  energyId?: number;
}

/** 计量器具分页响应。 */
export interface MeasuringInstrumentPage {
  pageNum: number;
  pageSize: number;
  size: number;
  total: number;
  pages: number;
  records: MeasuringInstrumentRecord[];
}

/** 计量器具新增业务字段。 */
export interface MeasuringInstrumentAddReq {
  /** 新增所属组织，必须来自当前账号数据权限组织树。 */
  orgId: number;
  instrumentName: string;
  instrumentCode: string;
  specification?: string;
  model?: string;
  energyId: number;
  manufacturer?: string;
  remark?: string;
}

/** 计量器具编辑请求。 */
export type MeasuringInstrumentEditReq = Omit<
  MeasuringInstrumentAddReq,
  'orgId'
> & {
  id: number;
};
