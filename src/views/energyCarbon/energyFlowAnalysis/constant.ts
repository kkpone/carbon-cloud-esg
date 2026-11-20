import I18N from '@/lang/I18N';

/** 能流分析图页面权限，与后端菜单 perms 保持一致。 */
export const ENERGY_FLOW_ANALYSIS_PAGE_PERMISSION =
  '/energyCarbon/energyFlowAnalysis/analysis' as const;

/** 能流分析图仅支持月、季度和年度三个自然周期。 */
export const getEnergyFlowAnalysisPeriodOptions = () =>
  [
    { label: I18N.energyCarbon.energyConsumptionStatisticsByMonth, value: 2 },
    { label: I18N.energyCarbon.analysisByQuarter, value: 3 },
    { label: I18N.energyCarbon.energyConsumptionStatisticsByYear, value: 4 },
  ] as const;

/** 能流分析图请求的统计维度编码。 */
export const ENERGY_FLOW_ANALYSIS_PERIOD_TYPE = {
  /** 按自然月统计。 */
  MONTH: 2,
  /** 按自然季度统计。 */
  QUARTER: 3,
  /** 按自然年统计。 */
  YEAR: 4,
} as const;

/** 能流分析图阶段的固定顺序，实际列由接口按能流设置动态返回。 */
export const ENERGY_FLOW_ANALYSIS_STAGE = {
  /** 能源输入，始终展示。 */
  ENERGY_INPUT: 'energyInput',
  /** 能源储存追加编码7、默认关闭。 */
  ENERGY_STORAGE: 'energyStorage',
  /** 能源输配，可按组织能流设置关闭。 */
  ENERGY_TRANSMISSION: 'energyTransmission',
  /** 能源转换，可按组织能流设置关闭。 */
  ENERGY_CONVERSION: 'energyConversion',
  /** 转换输配，可按组织能流设置关闭。 */
  CONVERSION_TRANSMISSION: 'conversionTransmission',
  /** 能源使用，始终展示。 */
  ENERGY_USE: 'energyUse',
  /** 使用或损耗，始终展示。 */
  USE_OR_LOSS: 'useOrLoss',
} as const;

/** 能耗台账中的数据类型编码；转换输配按需求复用能源输配类型 1。 */
export const ENERGY_FLOW_DATA_TYPE = {
  /** 能源储存。 */
  STORAGE: 5,
  /** 能源输配，转换输配也使用该类型。 */
  TRANSMISSION: 1,
  /** 能源转换。 */
  CONVERSION: 2,
  /** 能源使用。 */
  USAGE: 3,
  /** 原料用能。 */
  RAW_MATERIAL: 4,
} as const;

/** 后端响应可能使用的阶段 key 与页面显示文案映射。 */
export const getEnergyFlowStageLabels = () =>
  ({
    [ENERGY_FLOW_ANALYSIS_STAGE.ENERGY_INPUT]:
      I18N.energyCarbon.analysisEnergyInput,
    [ENERGY_FLOW_ANALYSIS_STAGE.ENERGY_STORAGE]:
      I18N.energyCarbon.analysisEnergyStorage,
    [ENERGY_FLOW_ANALYSIS_STAGE.ENERGY_TRANSMISSION]:
      I18N.energyCarbon.analysisEnergyTransmission,
    [ENERGY_FLOW_ANALYSIS_STAGE.ENERGY_CONVERSION]:
      I18N.energyCarbon.analysisEnergyConversion,
    [ENERGY_FLOW_ANALYSIS_STAGE.CONVERSION_TRANSMISSION]:
      I18N.energyCarbon.analysisConversionTransmission,
    [ENERGY_FLOW_ANALYSIS_STAGE.ENERGY_USE]:
      I18N.energyCarbon.analysisEnergyUse,
    [ENERGY_FLOW_ANALYSIS_STAGE.USE_OR_LOSS]:
      I18N.energyCarbon.analysisUseOrLoss,
  } as const);
