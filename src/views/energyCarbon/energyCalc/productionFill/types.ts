import type { FileInfo } from '@/views/energyCarbon/components/FileUpload';

export type ProductionStatus = 1 | 2 | 3 | 4;
export type ProductionIndicatorType = 1 | 2 | 3;

export interface PageData<T> {
  pageNum: number;
  pageSize: number;
  size: number;
  total: number;
  pages: number;
  records: T[];
}

export interface ProductionDataRecord {
  id: number;
  orgId: number;
  orgName?: string;
  documentNo: string;
  statisticalYears?: string;
  period?: string;
  status: ProductionStatus;
  status_name?: string;
  submitByName?: string;
  submitTime?: string;
  auditByName?: string;
  auditTime?: string;
  updateByName?: string;
  updateTime?: string;
}

export interface ProductionDataListParams {
  pageNum: number;
  pageSize: number;
  orgId?: number;
  documentNo?: string;
  status?: ProductionStatus;
  year?: number;
}

export interface ProductionIndicatorOption {
  indicatorType: ProductionIndicatorType;
  productId?: number | null;
  indicatorName: string;
  unit?: string | null;
  unitName?: string | null;
}

export interface ProductionDataDetail {
  id: number;
  orgId: number;
  orgName?: string;
  documentNo: string;
  startMonth: string;
  endMonth: string;
  indicatorType: ProductionIndicatorType;
  productId?: number | null;
  indicatorName?: string;
  unit?: string | null;
  unitName?: string | null;
  quantity: string | number;
  dataSource?: string | null;
  remark?: string | null;
  attachments: FileInfo[];
  status: ProductionStatus;
  submitByName?: string;
  submitTime?: string;
  auditByName?: string;
  auditTime?: string;
  auditOpinion?: string | null;
  updateByName?: string;
  updateTime?: string;
}

export interface ProductionDataSaveReq {
  id?: number;
  orgId: number;
  documentNo: string;
  startMonth: string;
  endMonth: string;
  indicatorType: ProductionIndicatorType;
  productId?: number;
  quantity: string;
  dataSource?: string;
  remark?: string;
  attachments: FileInfo[];
}

export interface ProductionDataAuditReq {
  id: number;
  approved: boolean;
  opinion?: string;
}
