import type { FileInfo } from '@/views/energyCarbon/components/FileUpload';

export type CarbonAsset = 1 | 2;

export type CarbonTradeType =
  | 101
  | 102
  | 103
  | 104
  | 105
  | 106
  | 107
  | 108
  | 109
  | 110
  | 111
  | 112
  | 113
  | 114
  | 201
  | 202
  | 203
  | 204
  | 205
  | 206
  | 207
  | 208
  | 209
  | 210
  | 211;

/** 碳交易分页查询参数。 */
export interface CarbonTradeListParams {
  pageNum: number;
  pageSize: number;
  carbonAsset?: CarbonAsset;
  orgId?: number;
  year?: number;
}

/** 碳交易分页行。 */
export interface CarbonTradeRecord {
  id: number;
  carbonAsset: CarbonAsset;
  carbonAssetName: string;
  orgId: number;
  orgName: string;
  tradeType: CarbonTradeType;
  tradeTypeName: string;
  documentNo: string;
  quantity: string;
  tradeDate: string;
  complianceYear?: number | null;
  updateByName?: string;
  updateTime?: string;
}

export interface CarbonTradePage {
  pageNum: number;
  pageSize: number;
  size: number;
  total: number;
  pages: number;
  records: CarbonTradeRecord[];
}

/** 碳交易全部可编辑业务字段。 */
export interface CarbonTradeSaveReq {
  complianceYear?: number;
  carbonAsset: CarbonAsset;
  orgId: number;
  tradeType: CarbonTradeType;
  documentNo: string;
  tradeDate: string;
  counterparty?: string;
  quantity: string;
  tradePrice?: string;
  feeRate?: string;
  contractNo?: string;
  contractName?: string;
  contractFile?: FileInfo;
}

export interface CarbonTradeEditReq extends CarbonTradeSaveReq {
  id: number;
}

/** 碳交易详情，不包含后端账户影响快照。 */
export interface CarbonTradeDetail extends CarbonTradeRecord {
  counterparty?: string;
  tradePrice?: string;
  tradeAmount?: string;
  feeRate?: string;
  settlementFee?: string;
  contractNo?: string;
  contractName?: string;
  contractFile?: FileInfo;
}
