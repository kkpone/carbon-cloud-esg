import I18N from '@/lang/I18N';

/** 用能设备页面权限。 */
export const ENERGY_EQUIPMENT_PAGE_PERMISSION =
  '/energyCarbon/config/energyEquipment' as const;

/** 用能设备操作权限。 */
export const ENERGY_EQUIPMENT_BUTTON_PERMISSION = {
  ADD: '/energyCarbon/config/energyEquipment/add',
  EDIT: '/energyCarbon/config/energyEquipment/edit',
  DELETE: '/energyCarbon/config/energyEquipment/delete',
  VIEW: '/energyCarbon/config/energyEquipment/view',
} as const;

/** 重点用能设备是非选项。 */
export const getKeyEnergyEquipmentOptions = () =>
  [
    { value: true, label: I18N.common.answers.yes },
    { value: false, label: I18N.common.answers.no },
  ] as const;
