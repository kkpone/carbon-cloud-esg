import I18N from '@/lang/I18N';
import type {
  EnergyConsumptionDataType,
  EnergyConsumptionDataTypeResponse,
  EnergyConsumptionStatus,
  EnergyFlowDirection,
  EnergyFlowDirectionResponse,
} from './types';

export const ENERGY_CONSUMPTION_PAGE_PERMISSION =
  '/energyCarbon/energyConsumptionQuery/dataFill';

export const ENERGY_CONSUMPTION_BUTTON_PERMISSION = {
  /** 新增 */
  ADD: `${ENERGY_CONSUMPTION_PAGE_PERMISSION}/add`,
  /** 导入，仅展示按钮 */
  IMPORT: `${ENERGY_CONSUMPTION_PAGE_PERMISSION}/imp`,
  /** 编辑 */
  EDIT: `${ENERGY_CONSUMPTION_PAGE_PERMISSION}/edit`,
  /** 提交 */
  SUBMIT: `${ENERGY_CONSUMPTION_PAGE_PERMISSION}/sub`,
  /** 审核 */
  AUDIT: `${ENERGY_CONSUMPTION_PAGE_PERMISSION}/aud`,
  /** 删除 */
  DELETE: `${ENERGY_CONSUMPTION_PAGE_PERMISSION}/del`,
  /** 详情 */
  VIEW: `${ENERGY_CONSUMPTION_PAGE_PERMISSION}/view`,
} as const;

export const ENERGY_CONSUMPTION_STATUS = {
  /** 填报中 */
  DRAFT: 1,
  /** 待审核 */
  PENDING_AUDIT: 2,
  /** 审核通过 */
  APPROVED: 3,
  /** 审核不通过 */
  REJECTED: 4,
} as const;

export const getEnergyConsumptionStatusOptions = (): Array<{
  label: string;
  value: EnergyConsumptionStatus;
}> => [
  { label: I18N.common.shared.filling, value: 1 },
  { label: I18N.common.shared.pending, value: 2 },
  { label: I18N.common.audit.reject, value: 4 },
  { label: I18N.common.audit.pass, value: 3 },
];

export const getEnergyConsumptionDataTypeOptions = (): Array<{
  label: string;
  value: EnergyConsumptionDataType;
}> => [
  { label: I18N.energyCarbon.analysisEnergyStorage, value: 5 },
  { label: I18N.energyCarbon.analysisEnergyTransmission, value: 1 },
  { label: I18N.energyCarbon.analysisEnergyConversion, value: 2 },
  { label: I18N.energyCarbon.analysisEnergyUse, value: 3 },
  { label: I18N.energyCarbon.analysisRawMaterialEnergy, value: 4 },
];

export const getAllEnergyFlowDirectionOptions = (): Array<{
  label: string;
  value: EnergyFlowDirection;
}> => [
  { label: I18N.common.labels.input, value: 1 },
  { label: I18N.common.labels.output, value: 2 },
];

export function getEnergyConsumptionStatusName(
  status: EnergyConsumptionStatus,
) {
  return (
    getEnergyConsumptionStatusOptions().find(item => item.value === status)
      ?.label ?? '-'
  );
}

export function getEnergyConsumptionDataTypeName(
  value: EnergyConsumptionDataTypeResponse,
) {
  const normalizedValue = Number(value) as EnergyConsumptionDataType;
  return (
    getEnergyConsumptionDataTypeOptions().find(
      item => item.value === normalizedValue,
    )?.label ?? '-'
  );
}

export function getEnergyFlowDirectionName(value: EnergyFlowDirectionResponse) {
  const normalizedValue = Number(value) as EnergyFlowDirection;
  return (
    getAllEnergyFlowDirectionOptions().find(
      item => item.value === normalizedValue,
    )?.label ?? '-'
  );
}

/** 能源使用和原料用能只允许输入，其他类型允许输入或输出。 */
export function getEnergyFlowDirectionOptions(
  dataType?: EnergyConsumptionDataType,
) {
  if (dataType === 3 || dataType === 4) {
    return getAllEnergyFlowDirectionOptions().filter(item => item.value === 1);
  }
  return getAllEnergyFlowDirectionOptions();
}
