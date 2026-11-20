import I18N from '@/lang/I18N';

/** 四个能源分析页面权限。 */
export const ENERGY_ANALYSIS_PAGE_PERMISSION = {
  /** 独立能源形态分析。 */
  FORM: '/energyCarbon/energyAnalysis/form',
  /** 能耗数据概览。 */
  OVERVIEW: '/energyCarbon/energyAnalysis/overview',
  /** 边界能耗分析。 */
  BOUNDARY: '/energyCarbon/energyAnalysis/boundary',
  /** 能耗结构分析。 */
  STRUCTURE: '/energyCarbon/energyAnalysis/structure',
  /** 能源效率分析。 */
  EFFICIENCY: '/energyCarbon/energyAnalysis/efficiency',
} as const;

/** 边界分类选项，编码与后端 OrgBoundaryType 一致。 */
export const getBoundaryTypeOptions = () =>
  [
    { label: I18N.energyCarbon.productionSystem, value: 1 },
    { label: I18N.energyCarbon.geographicalLocation, value: 2 },
    { label: I18N.energyCarbon.organizationalStructure, value: 3 },
  ] as const;
