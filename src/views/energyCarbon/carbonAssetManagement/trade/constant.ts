import I18N from '@/lang/I18N';
import type { CarbonAsset, CarbonTradeType } from './types';

export const CARBON_TRADE_PAGE_PERMISSION =
  '/energyCarbon/carbonAssetManagement/trade';

export const CARBON_TRADE_BUTTON_PERMISSION = {
  ADD: '/energyCarbon/carbonAssetManagement/trade/add',
  IMPORT: '/energyCarbon/carbonAssetManagement/trade/import',
  EDIT: '/energyCarbon/carbonAssetManagement/trade/edit',
  DELETE: '/energyCarbon/carbonAssetManagement/trade/delete',
  DETAIL: '/energyCarbon/carbonAssetManagement/trade/detail',
} as const;

export const CARBON_ASSET_OPTIONS: {
  label: string;
  value: CarbonAsset;
}[] = [
  { label: 'CEA', value: 1 },
  { label: 'CCER', value: 2 },
];

export interface CarbonTradeTypeOption {
  label: string;
  value: CarbonTradeType;
  carbonAsset: CarbonAsset;
  marketTrade: boolean;
}

/** 23 种交易类型与后端账户影响矩阵使用同一编码。 */
/** 本轮追加113、114，仅减少CEA登记账户，原编码保持不变。 */
export const getCarbonTradeTypeOptions = (): CarbonTradeTypeOption[] => [
  {
    label: I18N.energyCarbon.assetRegistryInitialization,
    value: 101,
    carbonAsset: 1,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetAdvanceAllowance,
    value: 102,
    carbonAsset: 1,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetSupplementaryAllowance,
    value: 103,
    carbonAsset: 1,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetRegistryTransferOut,
    value: 104,
    carbonAsset: 1,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetRegistryTransferIn,
    value: 105,
    carbonAsset: 1,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetComplianceSurrender,
    value: 106,
    carbonAsset: 1,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetTradingInitialization,
    value: 107,
    carbonAsset: 1,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetOneWayAuctionPurchase,
    value: 108,
    carbonAsset: 1,
    marketTrade: true,
  },
  {
    label: I18N.energyCarbon.assetListedAgreementPurchase,
    value: 109,
    carbonAsset: 1,
    marketTrade: true,
  },
  {
    label: I18N.energyCarbon.assetListedAgreementSale,
    value: 110,
    carbonAsset: 1,
    marketTrade: true,
  },
  {
    label: I18N.energyCarbon.assetBlockAgreementPurchase,
    value: 111,
    carbonAsset: 1,
    marketTrade: true,
  },
  {
    label: I18N.energyCarbon.assetBlockAgreementSale,
    value: 112,
    carbonAsset: 1,
    marketTrade: true,
  },
  {
    label: I18N.energyCarbon.tradeWithdraw,
    value: 113,
    carbonAsset: 1,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.tradeVoluntaryCancel,
    value: 114,
    carbonAsset: 1,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetRegistryInitialization,
    value: 201,
    carbonAsset: 2,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetVerifiedIssuance,
    value: 202,
    carbonAsset: 2,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetRegistryTransferOut,
    value: 203,
    carbonAsset: 2,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetRegistryTransferIn,
    value: 204,
    carbonAsset: 2,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.tradeCcerCompliance,
    value: 205,
    carbonAsset: 2,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetNeutralityCancellation,
    value: 206,
    carbonAsset: 2,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetTradingInitialization,
    value: 207,
    carbonAsset: 2,
    marketTrade: false,
  },
  {
    label: I18N.energyCarbon.assetOpenMarketPurchase,
    value: 208,
    carbonAsset: 2,
    marketTrade: true,
  },
  {
    label: I18N.energyCarbon.assetOpenMarketSale,
    value: 209,
    carbonAsset: 2,
    marketTrade: true,
  },
  {
    label: I18N.energyCarbon.assetNegotiatedTransferPurchase,
    value: 210,
    carbonAsset: 2,
    marketTrade: true,
  },
  {
    label: I18N.energyCarbon.assetNegotiatedTransferSale,
    value: 211,
    carbonAsset: 2,
    marketTrade: true,
  },
];

/** 判断交易类型是否为需要市场字段的交易。 */
export function isMarketTrade(tradeType?: CarbonTradeType) {
  return (
    getCarbonTradeTypeOptions().find(option => option.value === tradeType)
      ?.marketTrade ?? false
  );
}
