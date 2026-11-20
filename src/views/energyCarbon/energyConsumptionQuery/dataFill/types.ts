import type { FileInfo } from '@/views/energyCarbon/components/FileUpload';

export type EnergyConsumptionStatus = 1 | 2 | 3 | 4;
export type EnergyConsumptionTimeType = 'year' | 'month';
export type EnergyConsumptionDataType = 1 | 2 | 3 | 4 | 5;
export type EnergyConsumptionDataTypeResponse =
  | EnergyConsumptionDataType
  | `${EnergyConsumptionDataType}`;
export type EnergyFlowDirection = 1 | 2;
export type EnergyFlowDirectionResponse =
  | EnergyFlowDirection
  | `${EnergyFlowDirection}`;

export interface EnergyConsumptionRecord {
  id: number;
  orgId: number;
  orgName: string;
  documentNo: string;
  status: EnergyConsumptionStatus;
  status_name?: string;
  years?: string;
  period?: string;
  submitByName?: string;
  submitTime?: string;
  auditByName?: string;
  auditTime?: string;
  updateTime?: string;
}

export interface PageData<T> {
  pageNum: number;
  pageSize: number;
  size: number;
  total: number;
  pages: number;
  records: T[];
}

export interface EnergyConsumptionListParams {
  pageNum: number;
  pageSize: number;
  orgId?: number;
  documentNo?: string;
  status?: EnergyConsumptionStatus;
  year?: number;
  startDate?: string;
  endDate?: string;
}

export interface ResourceSnapshot {
  id: number;
  name: string;
  code?: string | null;
}

export interface EnergyConsumptionDetailItem {
  id?: number;
  startDate: string;
  endDate: string;
  boundaryId: number;
  boundaryType?: number;
  boundaryName?: string;
  dataType: EnergyConsumptionDataTypeResponse;
  flowDirection: EnergyFlowDirectionResponse;
  relatedBoundaryId: number;
  relatedBoundaryName?: string;
  energyId: number;
  energyName?: string;
  energyUnit?: string;
  energyUnitName?: string;
  quantity: string | number;
  cost?: string | number | null;
  dataSource?: string | null;
  remark?: string | null;
  products?: ResourceSnapshot[];
  equipments?: ResourceSnapshot[];
  measuringInstruments?: ResourceSnapshot[];
  productIds?: number[];
  equipmentIds?: number[];
  measuringInstrumentIds?: number[];
}

export interface EnergyConsumptionDetail {
  id: number;
  orgId: number;
  orgName: string;
  documentNo: string;
  status: EnergyConsumptionStatus;
  attachments: FileInfo[];
  details: EnergyConsumptionDetailItem[];
  submitByName?: string;
  submitTime?: string;
  auditByName?: string;
  auditTime?: string;
  auditOpinion?: string | null;
}

export interface EnergyConsumptionSaveReq {
  id?: number;
  orgId: number;
  documentNo: string;
  attachments: FileInfo[];
  startDate: string;
  endDate: string;
  boundaryId: number;
  dataType: EnergyConsumptionDataType;
  flowDirection: EnergyFlowDirection;
  relatedBoundaryId: number;
  energyId: number;
  quantity: string;
  cost?: string;
  dataSource?: string;
  remark?: string;
  productIds: number[];
  equipmentIds: number[];
  measuringInstrumentIds: number[];
}

export interface OptionItem {
  id: number;
  name: string;
  code?: string | null;
  unit?: string | null;
  unitName?: string | null;
}

export interface BoundaryGroup {
  type: number;
  typeName: string;
  children: OptionItem[];
}

export interface EnergyConsumptionOptions {
  boundaries: BoundaryGroup[];
  relatedBoundaries: OptionItem[];
  energies: OptionItem[];
  products: OptionItem[];
  equipments: OptionItem[];
  measuringInstruments: OptionItem[];
}

export interface EnergyConsumptionAuditReq {
  id: number;
  approved: boolean;
  opinion?: string;
}
