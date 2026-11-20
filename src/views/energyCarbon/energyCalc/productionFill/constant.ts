import I18N from '@/lang/I18N';
import type { ProductionIndicatorType, ProductionStatus } from './types';

export const PRODUCTION_DATA_PAGE_PERMISSION =
  '/energyCarbon/energyCalc/productionFill';

export const PRODUCTION_DATA_BUTTON_PERMISSION = {
  /** 新增 */
  ADD: `${PRODUCTION_DATA_PAGE_PERMISSION}/add`,
  /** 导入空入口 */
  IMPORT: `${PRODUCTION_DATA_PAGE_PERMISSION}/import`,
  /** 编辑 */
  EDIT: `${PRODUCTION_DATA_PAGE_PERMISSION}/edit`,
  /** 提交 */
  SUBMIT: `${PRODUCTION_DATA_PAGE_PERMISSION}/submit`,
  /** 审核 */
  AUDIT: `${PRODUCTION_DATA_PAGE_PERMISSION}/audit`,
  /** 删除 */
  DELETE: `${PRODUCTION_DATA_PAGE_PERMISSION}/delete`,
  /** 详情 */
  DETAIL: `${PRODUCTION_DATA_PAGE_PERMISSION}/detail`,
} as const;

export const PRODUCTION_STATUS = {
  /** 填报中 */
  DRAFT: 1,
  /** 待审核 */
  PENDING_AUDIT: 2,
  /** 审核通过 */
  APPROVED: 3,
  /** 审核不通过 */
  REJECTED: 4,
} as const;

export const getProductionStatusOptions = (): Array<{
  label: string;
  value: ProductionStatus;
}> => [
  { label: I18N.common.shared.filling, value: 1 },
  { label: I18N.common.shared.pending, value: 2 },
  { label: I18N.common.audit.reject, value: 4 },
  { label: I18N.common.audit.pass, value: 3 },
];

export const PRODUCTION_INDICATOR_TYPE = {
  /** 产值 */
  OUTPUT_VALUE: 1,
  /** 增加值 */
  ADDED_VALUE: 2,
  /** 产品 */
  PRODUCT: 3,
} as const satisfies Record<string, ProductionIndicatorType>;

/** 根据状态编码显示中文。 */
export function getProductionStatusName(status: ProductionStatus) {
  return (
    getProductionStatusOptions().find(item => item.value === status)?.label ??
    '-'
  );
}
