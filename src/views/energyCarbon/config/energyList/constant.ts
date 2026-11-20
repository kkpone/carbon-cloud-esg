import I18N from '@/lang/I18N';
import type { EnergyType } from './types';

/** 能源列表页面权限。 */
export const ENERGY_PAGE_PERMISSION =
  '/energyCarbon/config/energyList' as const;

/** 能源列表操作权限。 */
export const ENERGY_BUTTON_PERMISSION = {
  ADD: '/energyCarbon/config/energyList/add',
  EDIT: '/energyCarbon/config/energyList/edit',
  DELETE: '/energyCarbon/config/energyList/delete',
  VIEW: '/energyCarbon/config/energyList/view',
} as const;

/** 固定能源分类选项。 */
export const getEnergyTypeOptions = (): Array<{
  value: EnergyType;
  label: string;
}> => [
  { value: 1, label: I18N.energyCarbon.cfgEnergy },
  { value: 2, label: I18N.energyCarbon.energyMedium },
];

/** 获取分类展示名称。 */
export function getEnergyTypeName(type: EnergyType) {
  return (
    getEnergyTypeOptions().find(option => option.value === type)?.label ?? '-'
  );
}
