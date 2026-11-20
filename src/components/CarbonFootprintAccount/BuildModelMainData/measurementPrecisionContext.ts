import { createContext } from 'react';

import {
  AGENT_EMISSION_AMOUNT_MAX_DECIMAL_PLACE,
  MAX_DECIMAL_PLACE,
} from '@/views/carbonFootprint3/discharge/process/constant';

export const DEFAULT_MEASUREMENT_PRECISION = {
  enabled: false,
  amountDecimalPlace: MAX_DECIMAL_PLACE,
  productWeightDecimalPlace: MAX_DECIMAL_PLACE,
};

export const AGENT_MEASUREMENT_PRECISION = {
  enabled: true,
  amountDecimalPlace: AGENT_EMISSION_AMOUNT_MAX_DECIMAL_PLACE,
  productWeightDecimalPlace: AGENT_EMISSION_AMOUNT_MAX_DECIMAL_PLACE,
};

/** 产品核算入口沿用 9 位小数精度，与 Agent 入口取值一致。 */
export const PRODUCT_ACCOUNT_MEASUREMENT_PRECISION = {
  enabled: true,
  amountDecimalPlace: AGENT_EMISSION_AMOUNT_MAX_DECIMAL_PLACE,
  productWeightDecimalPlace: AGENT_EMISSION_AMOUNT_MAX_DECIMAL_PLACE,
};

export type MeasurementPrecision = {
  enabled: boolean;
  amountDecimalPlace: number;
  productWeightDecimalPlace: number;
};

export const MeasurementPrecisionContext = createContext<MeasurementPrecision>(
  DEFAULT_MEASUREMENT_PRECISION,
);

/** 只供模型检查的排放源抽屉消费，不改变同级 AI 表单的默认配置。 */
export const ModelCheckEmissionFieldsContext = createContext(false);

/** 认证核算预览的前端来源标记，不参与接口参数或编辑权限判断。 */
export const AGENT_CERTIFICATION_PREVIEW_SOURCE = 'agent';
