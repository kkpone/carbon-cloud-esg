export type MonitorPlanStatus = 0 | 1 | 2;
export type MonitorSaveType = 0 | 1;
export type MonitorChildDeleteType =
  | 'PRODUCT'
  | 'PRECURSOR'
  | 'PROCESS'
  | 'NON_CBAM_GOODS'
  | 'PROCESS_MONITOR'
  | 'FACTOR_SAMPLING'
  | 'PFC_MONITOR'
  | 'MEASURABLE_HEAT'
  | 'FACILITY_ELECTRICITY'
  | 'WASTE_GAS'
  | 'RESPONSIBILITY'
  | 'MANAGE_EVALUATE_PROCEDURE'
  | 'DATA_FLOW_PROCEDURE'
  | 'CONTROL_ACTIVITY_PROCEDURE'
  | 'OTHER_PROCEDURE'
  | 'SYSTEM_BOUNDARY_FILE'
  | 'EVIDENCE'
  | 'EVIDENCE_FILE'
  | 'EVIDENCE_RELATION';

export interface MonitorChildDeleteRequest {
  dataVersion?: number;
  target: MonitorChildDeleteType;
  itemKey?: string;
  fileUrl?: string;
  fileName?: string;
  uploadTime?: string;
  evidenceId?: number;
  relationId?: number;
}
export type MonitorSectionCode =
  | 'PLAN_IDENTITY'
  | 'FACILITY'
  | 'PRODUCT_COMPOSITION'
  | 'PROCESS_GOODS'
  | 'NON_CBAM_GOODS'
  | 'CBAM_BENCHMARK'
  | 'DATA_MONITOR_METHOD'
  | 'FACTOR_SAMPLING'
  | 'SOURCE_EMISSION_LIST'
  | 'CALCULATION_MASS_BALANCE_SOURCE'
  | 'MEASUREMENT_SOURCE'
  | 'PFC_MONITOR'
  | 'SYSTEM_BOUNDARY'
  | 'PRECURSOR_SUPPLIER_ORIGIN'
  | 'ZERO_RATED_FUEL'
  | 'MEASURABLE_HEAT'
  | 'FACILITY_ELECTRICITY'
  | 'ELECTRICITY_FACTOR'
  | 'IMPORTED_ELECTRICITY_EVIDENCE'
  | 'WASTE_GAS'
  | 'CO2_STAGE'
  | 'DATA_QUALITY_CONTROL';

export interface FileObj {
  name?: string;
  size?: string;
  unit?: string;
  url?: string;
  uploadTime?: string;
}

export interface JsonItem {
  itemKey?: string;
  sortNo?: number;
}

export interface ApplicableJson {
  itemKey?: string;
  applicable?: boolean;
  notApplicableReason?: string;
  evidenceIds?: number[];
  /** notApplicableReason 的英文内容。 */
  notApplicableReasonEn?: string;
}

export interface FacilityJson {
  operatorName?: string;
  registNo?: string;
  activityOverview?: string;
  processDescription?: string;
  /** operatorName 的英文内容。 */
  operatorNameEn?: string;
  /** activityOverview 的英文内容。 */
  activityOverviewEn?: string;
  /** processDescription 的英文内容。 */
  processDescriptionEn?: string;
}

export interface ProductItem extends JsonItem {
  cnCode?: string;
  productName?: string;
  functionalUnit?: string;
  productType?: 'SOLD_PRODUCT' | 'INTERMEDIATE_PRODUCT';
  /** productName 的英文内容。 */
  productNameEn?: string;
  /** functionalUnit 的英文内容。 */
  functionalUnitEn?: string;
}

export interface ProductJson {
  products?: ProductItem[];
}

export interface PrecursorItem extends JsonItem {
  sourceId?: number;
  cnCode?: string;
  precursorName?: string;
  emissionBasis?: 'MEASURED_VALUE' | 'DEFAULT_VALUE';
  supplierName?: string;
  sourceFacility?: string;
  originCountry?: string;
  verificationPeriod?: string;
  embeddedEmission?: number;
  /** precursorName 的英文内容。 */
  precursorNameEn?: string;
  /** supplierName 的英文内容。 */
  supplierNameEn?: string;
  /** sourceFacility 的英文内容。 */
  sourceFacilityEn?: string;
}

export interface PrecursorJson {
  precursors?: PrecursorItem[];
}

export interface ProcessItem extends JsonItem {
  processName?: string;
  productItemKeys?: string[];
  precursorItemKeys?: string[];
  productionRoute?: string;
  description?: string;
  /** processName 的英文内容。 */
  processNameEn?: string;
  /** description 的英文内容。 */
  descriptionEn?: string;
}

export interface ProcessJson {
  processes?: ProcessItem[];
}

export interface NonCbamGoodsItem extends JsonItem {
  processItemKey?: string;
  goodsName?: string;
  allocationMethod?: string;
  allocationRate?: number;
  /** goodsName 的英文内容。 */
  goodsNameEn?: string;
  /** allocationMethod 的英文内容。 */
  allocationMethodEn?: string;
}

export interface NonCbamGoodsJson {
  goods?: NonCbamGoodsItem[];
}

export interface SystemBoundaryJson {
  boundaryDescription?: string;
  files?: FileObj[];
  /** boundaryDescription 的英文内容。 */
  boundaryDescriptionEn?: string;
}

export interface ProcessMonitorItem extends JsonItem {
  evidenceIds?: number[];
  processItemKey?: string;
  sourceFlowName?: string;
  sourceType?: 'combustion' | 'process' | 'emission_source';
  ghgType?: 'CO₂' | 'N₂O';
  monitorMethod?: 'standard_calculation' | 'mass_balance' | 'measurement_cems';
  dataSource?: string;
  frequency?: string;
  equipment?: string;
  location?: string;
  uncertainty?: string;
  calibration?: string;
  missingDataMethod?: string;
  formulaCode?: string;
  /** sourceFlowName 的英文内容。 */
  sourceFlowNameEn?: string;
  /** dataSource 的英文内容。 */
  dataSourceEn?: string;
  /** frequency 的英文内容。 */
  frequencyEn?: string;
  /** equipment 的英文内容。 */
  equipmentEn?: string;
  /** location 的英文内容。 */
  locationEn?: string;
  /** calibration 的英文内容。 */
  calibrationEn?: string;
  /** missingDataMethod 的英文内容。 */
  missingDataMethodEn?: string;
}

export interface ProcessMonitorJson {
  methods?: ProcessMonitorItem[];
}

export type MonitorFrequency =
  | 'CONTINUOUS'
  | 'SHIFT'
  | 'DAILY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'ANNUAL';

export interface FactorSamplingItem extends JsonItem {
  evidenceIds?: number[];
  /** 原源流监测项标识，供因子同步及源流重命名使用。 */
  processMonitorItemKey?: string;
  sourceFlowName?: string;
  factorType?: string;
  acquisitionPath?: string;
  sourceName?: string;
  sourceVersion?: string;
  samplingPlan?: string;
  laboratory?: string;
  laboratoryMethod?: string;
  /** sourceFlowName 的英文内容。 */
  sourceFlowNameEn?: string;
  /** acquisitionPath 的英文内容。 */
  acquisitionPathEn?: string;
  /** sourceName 的英文内容。 */
  sourceNameEn?: string;
  /** samplingPlan 的英文内容。 */
  samplingPlanEn?: string;
  /** laboratory 的英文内容。 */
  laboratoryEn?: string;
  /** laboratoryMethod 的英文内容。 */
  laboratoryMethodEn?: string;
}

export interface FactorSamplingJson {
  factors?: FactorSamplingItem[];
}

export interface PfcMonitorItem extends JsonItem {
  evidenceIds?: number[];
  processItemKey?: string;
  technology?: string;
  method?: 'SLOPE_METHOD' | 'OVERVOLTAGE_METHOD';
  frequency?: string;
  dataSource?: string;
  equipment?: string;
  location?: string;
  uncertainty?: string;
  calibration?: string;
  missingDataMethod?: string;
  formulaCode?: string;
  /** technology 的英文内容。 */
  technologyEn?: string;
  /** dataSource 的英文内容。 */
  dataSourceEn?: string;
  /** frequency 的英文内容。 */
  frequencyEn?: string;
  /** equipment 的英文内容。 */
  equipmentEn?: string;
  /** location 的英文内容。 */
  locationEn?: string;
  /** calibration 的英文内容。 */
  calibrationEn?: string;
  /** missingDataMethod 的英文内容。 */
  missingDataMethodEn?: string;
}

export interface PfcMonitorJson extends ApplicableJson {
  methods?: PfcMonitorItem[];
}

export interface ZeroRatedFuelJson extends ApplicableJson {
  description?: string;
  additionalDescription?: string;
  /** description 的英文内容。 */
  descriptionEn?: string;
  /** additionalDescription 的英文内容。 */
  additionalDescriptionEn?: string;
}

export interface HeatFlowItem extends JsonItem {
  direction?: 'INPUT' | 'OUTPUT';
  medium?: string;
  counterparty?: string;
  processItemKey?: string;
  allocationMethod?: string;
  meteringPoint?: string;
  evidenceIds?: number[];
  /** medium 的英文内容。 */
  mediumEn?: string;
  /** counterparty 的英文内容。 */
  counterpartyEn?: string;
  /** allocationMethod 的英文内容。 */
  allocationMethodEn?: string;
  /** meteringPoint 的英文内容。 */
  meteringPointEn?: string;
}

export interface MeasurableHeatJson extends ApplicableJson {
  heatFlows?: HeatFlowItem[];
}

export interface FacilityElectricityItem extends JsonItem {
  generationMode?: string;
  energyProperty?: string;
  includedInOutputBoundary?: boolean;
  processItemKey?: string;
  meteringAllocationMethod?: string;
  /** 独立计量方法。 */
  meteringMethod?: string;
  /** 独立分配方法。 */
  allocationMethod?: string;
  evidenceIds?: number[];
}

export interface FacilityElectricityJson extends ApplicableJson {
  generators?: FacilityElectricityItem[];
}

export interface ElectricityFactorJson extends ApplicableJson {
  description?: string;
  additionalDescription?: string;
  /** description 的英文内容。 */
  descriptionEn?: string;
  /** additionalDescription 的英文内容。 */
  additionalDescriptionEn?: string;
}

export interface WasteGasItem extends JsonItem {
  wasteGasType?: string;
  flowModes?: ('PRODUCE' | 'USE' | 'INPUT' | 'OUTPUT')[];
  counterparty?: string;
  processItemKey?: string;
  method?: string;
  evidenceIds?: number[];
  /** wasteGasType 的英文内容。 */
  wasteGasTypeEn?: string;
  /** counterparty 的英文内容。 */
  counterpartyEn?: string;
  /** method 的英文内容。 */
  methodEn?: string;
}

export interface WasteGasJson extends ApplicableJson {
  wasteGasFlows?: WasteGasItem[];
}

export interface Co2StageJson extends ApplicableJson {
  description?: string;
}

export interface ResponsibilityItem extends JsonItem {
  positionName?: string;
  responsibility?: string;
  /** positionName 的英文内容。 */
  positionNameEn?: string;
  /** responsibility 的英文内容。 */
  responsibilityEn?: string;
}

export interface ProcedureItem extends JsonItem {
  /** 外包过程控制是否启用，未设置按启用处理。 */
  enabled?: boolean;
  title?: string;
  referenceNo?: string;
  positionOrDepartment?: string;
  frequency?: MonitorFrequency;
  recordLocation?: string;
  mainRisk?: string;
  description?: string;
  procedureType?: string;
  /** title 的英文内容。 */
  titleEn?: string;
  /** recordLocation 的英文内容。 */
  recordLocationEn?: string;
  /** mainRisk 的英文内容。 */
  mainRiskEn?: string;
  /** description 的英文内容。 */
  descriptionEn?: string;
}

export interface DivideWorkJson {
  responsibilities?: ResponsibilityItem[];
}

export interface ProcedureJson {
  procedures?: ProcedureItem[];
}

export interface ControlActivityJson extends ProcedureJson {
  writtenRiskAssessmentRef?: string;
  includedInEnvironmentalManagementSystem?: boolean;
  /** writtenRiskAssessmentRef 的英文内容。 */
  writtenRiskAssessmentRefEn?: string;
}

export interface MonitorPlanPayload {
  id?: number;
  factoryId?: number;
  planName?: string;
  planDate?: string;
  versionNo?: string;
  year: number;
  effectiveDate?: string;
  changeReason?: string;
  dataVersion?: number;
  saveType?: MonitorSaveType;
  completedCount?: number;
  publishTime?: string;
  facility: { facilityJson?: FacilityJson };
  goodsBoundary: {
    productJson?: ProductJson;
    precursorJson?: PrecursorJson;
    processJson?: ProcessJson;
    nonCbamGoodsJson?: NonCbamGoodsJson;
    systemBoundaryJson?: SystemBoundaryJson;
  };
  directEmission: {
    processMonitorJson?: ProcessMonitorJson;
    factorSamplingJson?: FactorSamplingJson;
    pfcMonitorJson?: PfcMonitorJson;
  };
  condition: {
    zeroRatedFuelJson?: ZeroRatedFuelJson;
    measurableHeatJson?: MeasurableHeatJson;
    facilityElectricityJson?: FacilityElectricityJson;
    electricityFactorJson?: ElectricityFactorJson;
    wasteGasJson?: WasteGasJson;
    co2StageJson?: Co2StageJson;
  };
  controlConfirmation: {
    divideWorkJson?: DivideWorkJson;
    manageEvaluateJson?: ProcedureJson;
    dataFlowJson?: ProcedureJson;
    controlActivityJson?: ControlActivityJson;
    otherProcedureJson?: ProcedureJson;
  };
  evidences: MonitorEvidence[];
  evidenceRelations: MonitorEvidenceRelation[];
  /** planName 的英文内容。 */
  planNameEn?: string;
  /** changeReason 的英文内容。 */
  changeReasonEn?: string;
}

export interface MonitorEvidence {
  id?: number;
  evidenceType?: string;
  reviewFrequency?: string;
  sourceName?: string;
  evidenceNo?: string;
  issueDate?: string;
  expiryDate?: string;
  remark?: string;
  file?: FileObj;
  fileStatus?: string;
  partCodes?: number[];
  partName?: string;
  relatedStatus?: string;
}

export interface MonitorEvidenceRelation {
  id?: number;
  evidenceId: number;
  partCode: number;
  itemKey: string;
}

export interface CompletionGroup {
  sectionCode: MonitorSectionCode;
  completed: boolean;
  requiredCount: number;
  filledRequiredCount: number;
  missingFields: string[];
  blockingMissingFields: string[];
}

export interface CompletionResult {
  completedCount: number;
  totalCount: 22;
  completionRate: number;
  pendingGroups: MonitorSectionCode[];
  groupStats: CompletionGroup[];
}

export interface MonitorPlanSaveResult extends CompletionResult {
  id: number;
  dataVersion: number;
  saveType: MonitorSaveType;
  status: MonitorPlanStatus;
  statusName: string;
}

export interface MonitorPlanDetail extends MonitorPlanPayload {
  status?: MonitorPlanStatus;
  statusName?: string;
  completion?: CompletionResult;
}

export interface MonitorPlanListItem {
  id: number;
  planName?: string;
  versionNo?: string;
  year: number;
  products?: string[];
  status: MonitorPlanStatus;
  statusName: string;
  completedCount: number;
  totalCount: 22;
  completionRate: number;
  updateTime?: string;
}

export interface MonitorFactoryGroup {
  factoryId: number;
  factoryName: string;
  orgId?: number;
  factoryCode?: string;
  country?: string;
  city?: string;
  locationCode?: string;
  plans: MonitorPlanListItem[];
}

export interface MonitorPlanPage {
  pageNum: number;
  pageSize: number;
  total: number;
  records: MonitorFactoryGroup[];
}

export interface MonitorOverview {
  totalCount: number;
  editingCount: number;
  effectiveCount: number;
  archivedCount: number;
}

export interface MonitorPlanQuery {
  pageNum: number;
  pageSize: number;
  name?: string;
  status?: MonitorPlanStatus;
  year?: number;
}

export interface FactoryOption {
  /** 工厂联系人及补充地址信息。 */
  authorizedRepresentative?: string;
  email?: string;
  mobile?: string;
  economicActivity?: string;
  postOfficeBox?: string;
  id?: number;
  orgId?: number;
  orgName?: string;
  factorName?: string;
  factoryNameEn?: string;
  factoryCode?: string;
  locationCode?: string;
  postalCode?: string;
  country?: string;
  countryName?: string;
  city?: string;
  detailedAddress?: string;
  addressEn?: string;
  longitude?: string;
  latitude?: string;
  ePrtrCode?: string;
}

export interface MonitorCnOption {
  defaultCode?: string;
  defaultName?: string;
  /** cnNameZh 的英文内容。 */
  cnNameZh?: string;
  /** cnNameEn 的英文内容。 */
  cnNameEn?: string;
}

export interface MonitorPrecursorQuery {
  pageNum: number;
  pageSize: number;
  applyStatus: 'APPROVED';
  type: number;
  cnCode?: string;
  supplyName?: string;
  preName?: string;
}

export interface MonitorPrecursorOption {
  id?: number;
  productPrecursorId?: number;
  cnCode?: string;
  declarationName?: string;
  companyName?: string;
  precursorName?: string;
  supplyName?: string;
  sourceFacility?: string;
  countryValue?: string;
  countryName?: string;
  applyTime?: string;
  submitTime?: string;
  verificationPeriod?: string;
  embeddedEmission?: number | string;
}

/** 关联业务类型，与后端计划侧接口路径一致。 */
export type MonitorBusinessType = 'accounting-tasks' | 'operation-reports';

/** 关联业务列表展示及版本差异。 */
export interface MonitorAssociatedBusiness {
  id: number;
  reportName: string;
  startDate?: string;
  endDate?: string;
  cbamProducts?: string;
  completed?: boolean;
  status?: number;
  versionNo?: string;
  submitTarget?: string;
  accountId?: number;
  planDataVersion?: number;
  currentPlanDataVersion: number;
  needsSync: boolean;
}

/** 国家使用 CBAMcountryinfo 字典值，由后端转换为国家名称。 */
export interface FactoryLocationRequest {
  country: string;
  city: string;
  detailedAddress: string;
}

/** 定位失败与歧义均不携带坐标，避免部分结果覆盖工厂表单。 */
export type FactoryLocationResult = {
  coordinateSystem: 'WGS84';
  message: string;
} & (
  | {
      status: 'success';
      longitude: string;
      latitude: string;
      matchedAddress: string;
    }
  | {
      status: 'ambiguous' | 'not_found';
      longitude: null;
      latitude: null;
      matchedAddress: null;
    }
);
