import BigNumber from 'bignumber.js';
import { AllocationConfig } from './types';

/** 两位小数的百分数就是实际参与计算的系数，不能使用未舍入的比例。 */
export const allocationPercentage = (config?: AllocationConfig): string => {
  if (!config?.enabled) return '100.00';
  const total = new BigNumber(config.totalAmount || '');
  const current = new BigNumber(config.currentAmount || '');
  if (
    !total.isFinite() ||
    !current.isFinite() ||
    total.lte(0) ||
    current.lte(0)
  )
    return '';
  return current
    .times(100)
    .dividedBy(total)
    .toFixed(2, BigNumber.ROUND_HALF_UP);
};

/** 确认前校验完整配置；比例可计算不代表单位和分配方式已填写。 */
export const isAllocationValid = (config?: AllocationConfig): boolean =>
  !!config &&
  [1, 2, 3].includes(config.method ?? 1) &&
  !!config.unitCode?.trim() &&
  !!allocationPercentage({ ...config, enabled: true });

/** 只计算预览D，原始A不被覆盖；服务端保存结果作为最终依据。 */
export const unitAmount = (
  amount?: string | number,
  config?: AllocationConfig,
  loss?: string,
): string => {
  const a = new BigNumber(amount ?? '');
  const c = new BigNumber(loss || '0');
  const percentage = allocationPercentage(config);
  if (
    !a.isFinite() ||
    a.lt(0) ||
    !c.isFinite() ||
    c.lt(0) ||
    c.gte(100) ||
    !percentage
  )
    return '';
  return a
    .times(percentage)
    .dividedBy(100)
    .dividedBy(new BigNumber(1).minus(c.dividedBy(100)))
    .toFixed(9, BigNumber.ROUND_HALF_UP);
};
