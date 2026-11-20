/** 产品管理页面权限。 */
export const PRODUCT_PAGE_PERMISSION =
  '/energyCarbon/config/mainProduct' as const;

/** 产品管理写操作权限。 */
export const PRODUCT_BUTTON_PERMISSION = {
  ADD: '/energyCarbon/config/mainProduct/add',
  EDIT: '/energyCarbon/config/mainProduct/edit',
  DELETE: '/energyCarbon/config/mainProduct/delete',
  VIEW: '/energyCarbon/config/mainProduct/view',
} as const;
