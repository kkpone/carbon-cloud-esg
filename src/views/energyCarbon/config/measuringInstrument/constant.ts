/** 计量器具页面权限，与 Kernel 系统权限 SQL 保持一致。 */
export const MEASURING_INSTRUMENT_PAGE_PERMISSION =
  '/energyCarbon/config/measuringInstrument';

/** 计量器具按钮权限，与 Kernel 系统权限 SQL 保持一致。 */
export const MEASURING_INSTRUMENT_BUTTON_PERMISSION = {
  ADD: '/energyCarbon/config/measuringInstrument/add',
  EDIT: '/energyCarbon/config/measuringInstrument/edit',
  DELETE: '/energyCarbon/config/measuringInstrument/delete',
  VIEW: '/energyCarbon/config/measuringInstrument/view',
} as const;
