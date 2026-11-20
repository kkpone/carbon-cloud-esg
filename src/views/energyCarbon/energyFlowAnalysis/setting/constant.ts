import I18N from '@/lang/I18N';

/** 能流设置页面权限，与菜单 perms 和后端查询权限一致。 */
export const ENERGY_FLOW_SETTING_PAGE_PERMISSION =
  '/energyCarbon/energyFlowAnalysis/setting' as const;

/** 能流设置按钮权限。 */
export const ENERGY_FLOW_SETTING_BUTTON_PERMISSION = {
  /** 保存当前组织能流设置。 */
  SAVE: '/energyCarbon/energyFlowAnalysis/setting/save',
} as const;

/** 六个能流阶段的固定展示顺序。 */
export const getEnergyFlowStage = () =>
  ({
    /** 能源输入。 */
    ENERGY_INPUT: I18N.energyCarbon.analysisEnergyInput,
    /** 储存阶段显示在输入之后，默认关闭。 */
    ENERGY_STORAGE: I18N.energyCarbon.analysisEnergyStorage,
    /** 能源输配。 */
    ENERGY_TRANSMISSION: I18N.energyCarbon.analysisEnergyTransmission,
    /** 能源转换。 */
    ENERGY_CONVERSION: I18N.energyCarbon.analysisEnergyConversion,
    /** 转换输配。 */
    CONVERSION_TRANSMISSION: I18N.energyCarbon.analysisConversionTransmission,
    /** 能源使用。 */
    ENERGY_USE: I18N.energyCarbon.analysisEnergyUse,
    /** 使用或损耗。 */
    USE_OR_LOSS: I18N.energyCarbon.analysisUseOrLoss,
  } as const);
