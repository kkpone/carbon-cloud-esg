/** 用能设备列表查询参数。 */
export interface EnergyEquipmentListParams {
  pageNum: number;
  pageSize: number;
  orgId?: number;
  equipmentName?: string;
  equipmentCode?: string;
  keyEnergyEquipment?: boolean;
}

/** 用能设备列表记录。 */
export interface EnergyEquipmentRecord {
  id: number;
  orgId?: number | null;
  orgName?: string | null;
  equipmentName: string;
  equipmentCode: string;
  equipmentModel?: string;
  technicalParameters?: string;
  keyEnergyEquipment: boolean;
  remark?: string;
  updateBy?: number;
  updateByName?: string;
  updateTime?: string;
}

/** 用能设备分页响应。 */
export interface EnergyEquipmentPage {
  current: number;
  size: number;
  total: number;
  pages: number;
  records: EnergyEquipmentRecord[];
}

/** 用能设备新增业务字段。 */
export interface EnergyEquipmentAddReq {
  /** 新增所属组织，必须来自当前账号数据权限组织树。 */
  orgId: number;
  equipmentName: string;
  equipmentCode: string;
  equipmentModel?: string;
  technicalParameters?: string;
  keyEnergyEquipment: boolean;
  remark?: string;
}

/** 用能设备编辑请求。 */
export type EnergyEquipmentEditReq = Omit<EnergyEquipmentAddReq, 'orgId'> & {
  id: number;
};
