/** 能流设置能源或组织边界选项。 */
export interface EnergyFlowOption {
  id: number;
  name: string;
}

/** 能流设置详情和当前组织可用选项。 */
export interface EnergyFlowSettingDetail {
  orgId: number;
  storageEnabled: boolean;
  storageBoundaryIds: number[];
  energyTransmissionEnabled: boolean;
  energyConversionEnabled: boolean;
  conversionTransmissionEnabled: boolean;
  energyInputIds: number[];
  energyTransmissionIds: number[];
  energyConversionIds: number[];
  conversionTransmissionIds: number[];
  energyUseIds: number[];
  energyOptions: EnergyFlowOption[];
  boundaryOptions: EnergyFlowOption[];
}

/** 页面表单字段；三个可选阶段关闭后仍保留对应 ID 列表。 */
export interface EnergyFlowSettingForm {
  storageEnabled: boolean;
  storageBoundaryIds: number[];
  energyTransmissionEnabled: boolean;
  energyConversionEnabled: boolean;
  conversionTransmissionEnabled: boolean;
  energyInputIds: number[];
  energyTransmissionIds: number[];
  energyConversionIds: number[];
  conversionTransmissionIds: number[];
  energyUseIds: number[];
}

/** 保存能流设置请求。 */
export interface EnergyFlowSettingSaveReq extends EnergyFlowSettingForm {
  orgId: number;
}
