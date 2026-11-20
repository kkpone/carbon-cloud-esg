import type { EnergyType } from '../config/energyList/types';

/** 组织边界类型，与后端 OrgBoundaryType 枚举编码一致。 */
export type OrgBoundaryType = 1 | 2 | 3;

/** 组织边界分页行。 */
export interface OrgBoundaryRecord {
  id: number;
  orgId: number;
  boundaryType: OrgBoundaryType;
  boundaryName: string;
  boundaryAbbr: string;
  boundaryCode: string;
}

/** 组织边界分页查询参数。 */
export interface OrgBoundaryListParams {
  pageNum: number;
  pageSize: number;
  orgId: number;
  boundaryType: OrgBoundaryType;
}

/** 组织边界分页响应。 */
export interface OrgBoundaryPage {
  pageNum: number;
  pageSize: number;
  size: number;
  total: number;
  pages: number;
  records: OrgBoundaryRecord[];
}

/** 边界设置中的能源。 */
export interface OrgBoundaryEnergyItem {
  energyId: number;
  energyName?: string | null;
  energyType: EnergyType;
  unitName?: string | null;
}

/** 边界设置中的关联产品。 */
export interface OrgBoundaryProductItem {
  productId: number;
  productName?: string | null;
  productCode?: string | null;
  unitName?: string | null;
}

/** 边界设置中的用能设备。 */
export interface OrgBoundaryEquipmentItem {
  equipmentId: number;
  equipmentName?: string | null;
  equipmentCode?: string | null;
  keyEnergyEquipment?: boolean | null;
}

/** 边界设置中的计量器具。 */
export interface OrgBoundaryInstrumentItem {
  instrumentId: number;
  instrumentName?: string | null;
  instrumentCode?: string | null;
  energyName?: string | null;
}

/** 组织边界详情。 */
export interface OrgBoundaryDetail extends OrgBoundaryRecord {
  remark?: string | null;
  energies: OrgBoundaryEnergyItem[];
  products: OrgBoundaryProductItem[];
  equipments: OrgBoundaryEquipmentItem[];
  measuringInstruments: OrgBoundaryInstrumentItem[];
}

/** 组织边界可编辑业务字段。 */
export interface OrgBoundaryEditableFields {
  boundaryName: string;
  boundaryAbbr: string;
  boundaryCode: string;
  remark?: string;
  energyIds: number[];
  productIds: number[];
  equipmentIds: number[];
  measuringInstrumentIds: number[];
}

/** 新增组织边界请求。 */
export interface OrgBoundaryAddReq extends OrgBoundaryEditableFields {
  orgId: number;
  boundaryType: OrgBoundaryType;
}

/** 编辑组织边界请求。 */
export interface OrgBoundaryEditReq extends OrgBoundaryEditableFields {
  id: number;
}

/** 删除组织边界请求。 */
export interface OrgBoundaryDeleteReq {
  id: number;
}

/** 组织当前生效的综合能耗统计边界。 */
export interface OrgStatisticsBoundaryConfig {
  orgId: number;
  boundaryType: OrgBoundaryType;
}

/** 保存组织综合能耗统计边界请求。 */
export interface OrgStatisticsBoundaryConfigSaveReq {
  orgId: number;
  boundaryType: OrgBoundaryType;
}
