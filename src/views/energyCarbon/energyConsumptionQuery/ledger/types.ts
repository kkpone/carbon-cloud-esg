import type {
  EnergyConsumptionDataTypeResponse,
  EnergyFlowDirectionResponse,
  PageData,
} from '../dataFill/types';

export interface EnergyLedgerResource {
  id: number;
  name?: string | null;
  code?: string | null;
}

export interface EnergyLedgerRecord {
  id: number;
  documentId: number;
  detailId: number;
  orgId: number;
  orgName?: string;
  documentNo: string;
  ledgerDate: string;
  boundaryName: string;
  dataType: EnergyConsumptionDataTypeResponse;
  flowDirection: EnergyFlowDirectionResponse;
  relatedBoundaryName: string;
  energyName?: string | null;
  unitName?: string | null;
  quantity: string | number;
  cost?: string | number | null;
  dataSource?: string | null;
  remark?: string | null;
  products: EnergyLedgerResource[];
  equipments: EnergyLedgerResource[];
  measuringInstruments: EnergyLedgerResource[];
}

export interface EnergyLedgerListParams {
  pageNum: number;
  pageSize: number;
  orgId?: number;
  startDate?: string;
  endDate?: string;
  energyName?: string;
}

export type EnergyLedgerPage = PageData<EnergyLedgerRecord>;
