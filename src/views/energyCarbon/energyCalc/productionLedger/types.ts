import type {
  PageData,
  ProductionIndicatorType,
} from '../productionFill/types';

export interface ProductionLedgerRecord {
  id: number;
  documentId: number;
  orgId: number;
  orgName?: string;
  documentNo: string;
  ledgerMonth: string;
  indicatorType: ProductionIndicatorType;
  productId?: number | null;
  indicatorName?: string;
  quantity: string | number;
  unit?: string | null;
  unitName?: string | null;
  dataSource?: string | null;
  standardCoefficientSnapshot?: string | number | null;
  updateByName?: string;
  updateTime?: string;
}

export interface ProductionLedgerListParams {
  pageNum: number;
  pageSize: number;
  startMonth?: string;
  endMonth?: string;
  indicatorType?: ProductionIndicatorType;
  productId?: number;
  orgId?: number;
}

export type ProductionLedgerPage = PageData<ProductionLedgerRecord>;
