/** 发电、钢铁、水泥熟料、铝冶炼四类碳配额行业编码。 */
export type CarbonQuotaIndustry = 1 | 2 | 3 | 4;
/** 发电机组类型编码；仅发电行业明细使用。 */
export type PowerUnitType = 1 | 2 | 3 | 4;

/** 碳配额明细输入；行业不适用的字段不提交。 */
export interface CarbonQuotaDetailInput {
  detailName: string;
  powerUnitType?: PowerUnitType;
  generation?: number | string;
  heatSupply?: number | string;
  loadRate?: number | string;
  annualEmission?: number | string;
  ironEmission?: number | string;
  sinterEmission?: number | string;
  ironOutput?: number | string;
  productEmissionIntensity?: number | string;
  industryBalance?: number | string;
  intensityCorrectionFactor?: number | string;
}

/** 服务端返回的明细及已固化政策计算结果，配额单位为 tCO₂e。 */
export interface CarbonQuotaDetail extends CarbonQuotaDetailInput {
  id: number;
  powerUnitTypeName?: string;
  peakCorrectionFactor?: number | string;
  generationQuota?: number | string;
  heatQuota?: number | string;
  quotaAmount: number | string;
}

/** 碳配额测算主表及详情。 */
export interface CarbonQuotaRecord {
  algorithmVersion?: number | null;
  id: number;
  orgId: number;
  orgName: string;
  quotaYear: number;
  industry: CarbonQuotaIndustry;
  industryName: string;
  quotaAmount: number | string;
  updateByName?: string;
  updateTime?: string;
  details: CarbonQuotaDetail[];
}

/** 碳配额分页结果。 */
export interface CarbonQuotaPage {
  pageNum: number;
  pageSize: number;
  total: number;
  records: CarbonQuotaRecord[];
}

/** 新增或编辑碳配额的请求字段。 */
export interface CarbonQuotaSave {
  orgId: number;
  quotaYear: number;
  industry: CarbonQuotaIndustry;
  details: CarbonQuotaDetailInput[];
}
