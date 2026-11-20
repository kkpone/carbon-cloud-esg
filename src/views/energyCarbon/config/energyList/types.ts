/** 能源分类，与后端 EnergyType 编码一致。 */
export type EnergyType = 1 | 2;

/** 能源分页行。 */
export interface EnergyRecord {
  id: number;
  energyName: string;
  unit: string;
  unitName: string;
  energyType: EnergyType;
  energyForm?: 1 | 2 | null;
  coalCoefficient: string | number;
  cleanEnergy: boolean;
  renewableEnergy: boolean;
  remark?: string | null;
  updateByName?: string;
  updateTime?: string;
}

/** 能源下拉选项。 */
export interface EnergyOption {
  id: number;
  name: string;
}

/** 能源下拉选项查询参数。 */
export interface EnergyOptionParams {
  energyName?: string;
}

/** 能源分页查询参数。 */
export interface EnergyListParams {
  pageNum: number;
  pageSize: number;
  energyName?: string;
  energyType?: EnergyType;
}

/** 能源分页响应。 */
export interface EnergyPage {
  pageNum: number;
  pageSize: number;
  size: number;
  total: number;
  pages: number;
  records: EnergyRecord[];
}

/** 能源新增业务字段。 */
export interface EnergyAddReq {
  energyName: string;
  unit: string;
  energyType: EnergyType;
  energyForm?: 1 | 2;
  coalCoefficient: string;
  cleanEnergy: boolean;
  renewableEnergy: boolean;
  remark?: string;
}

/** 能源编辑请求。 */
export interface EnergyEditReq extends EnergyAddReq {
  id: number;
}
