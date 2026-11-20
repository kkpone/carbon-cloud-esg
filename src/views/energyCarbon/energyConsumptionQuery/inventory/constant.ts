/** 库存盘点独立菜单与按钮权限，不复用填报审批状态。 */
export const INVENTORY_PAGE_PERMISSION =
  '/energyCarbon/energyConsumptionQuery/inventory';
/** 编辑、查看使用短权限标识，满足50字符上限；菜单、新增和删除权限保持原值。 */
export const INVENTORY_PERMISSION = {
  /** 新增。 */
  ADD: `${INVENTORY_PAGE_PERMISSION}/add`,
  /** 用户确认3A：库存导入沿用新增权限，不新增权限点。 */
  IMPORT: `${INVENTORY_PAGE_PERMISSION}/add`,
  /** 编辑。 */
  EDIT: '/energyCarbon/inventory/edit',
  /** 删除。 */
  DELETE: `${INVENTORY_PAGE_PERMISSION}/del`,
  /** 查看。 */
  VIEW: '/energyCarbon/inventory/view',
} as const;
