/** 顶部单个碳资产余量汇总。 */
export interface CarbonAssetSummary {
  carbonAsset: 1 | 2;
  carbonAssetName: 'CEA' | 'CCER';
  balance: string;
}

/** 单个可见组织的两类碳资产余量。 */
export interface CarbonOrganizationBalance {
  orgId: number;
  orgName: string;
  /** 后端基于当前租户、组织权限和未删除碳交易记录返回，不通过余额推断。 */
  hasTrade?: boolean;
  ceaBalance: string;
  ccerBalance: string;
  ceaRegistryBalance: string;
  ceaTradingBalance: string;
  ccerRegistryBalance: string;
  ccerTradingBalance: string;
}

/** 碳账户详情表的一行展示数据。 */
export interface CarbonAccountDetailRow {
  key: 'CEA' | 'CCER';
  carbonAssetName: string;
  balance: string;
  registryBalance: string;
  tradingBalance: string;
}

/** 碳账户概览响应。 */
export interface CarbonAccountOverview {
  assetSummary: CarbonAssetSummary[];
  organizations: CarbonOrganizationBalance[];
}
