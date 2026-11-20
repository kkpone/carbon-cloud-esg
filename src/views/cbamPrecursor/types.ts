export interface DefaultCnOption {
  id?: number;
  productCategoryId?: number;
  name?: string;
  defaultCode?: string;
  defaultName?: string;
}

export interface PrecursorCnCard {
  defaultCnId: number;
  productCategoryId: number;
  productCategoryName?: string;
  cnCode: string;
  cnName?: string;
  functionalUnit?: string;
  functionalUnitName?: string;
  visibleCount: number;
}

export interface PrecursorFileObject {
  name?: string;
  size?: string;
  unit?: string;
  url?: string;
  uploadTime?: string;
}

export interface Precursor {
  id: number;
  productCategoryId: number;
  defaultCnId: number;
  productCategoryName?: string;
  cnCode: string;
  cnName?: string;
  functionalUnitName?: string;
  sourceType: 1 | 2;
  sourceTypeName?: string;
  fillTaskName?: string;
  systemName?: string;
  precursorName: string;
  supplierName: string;
  sourceFacility: string;
  countryValue: string;
  countryName?: string;
  directEmission: string;
  indirectEmission?: string;
  embeddedEmission: string;
  electricityUsage?: string;
  electricityFactor?: string;
  verifierName: string;
  reportNo: string;
  reportYear: number;
  issueDate: string;
  expiryDate: string;
  verificationStartDate: string;
  verificationEndDate: string;
  files: PrecursorFileObject[];
  hidden: boolean;
  updateTime?: string;
}

export interface PrecursorPayload {
  cnCode: string;
  precursorName: string;
  supplierName: string;
  sourceFacility: string;
  countryValue: string;
  directEmission: string;
  indirectEmission?: string;
  electricityUsage?: string;
  electricityFactor?: string;
  verifierName: string;
  reportNo: string;
  reportYear: number;
  issueDate: string;
  expiryDate: string;
  verificationStartDate: string;
  verificationEndDate: string;
  files: PrecursorFileObject[];
}
