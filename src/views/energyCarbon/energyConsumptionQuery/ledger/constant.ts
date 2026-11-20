export const ENERGY_LEDGER_PAGE_PERMISSION =
  '/energyCarbon/energyConsumptionQuery/ledger';

export const ENERGY_LEDGER_BUTTON_PERMISSION = {
  /** 详情 */
  VIEW: `${ENERGY_LEDGER_PAGE_PERMISSION}/view`,
} as const;
