import I18N from '@src/lang/I18N';

import type { IndustryCode } from './types';

export type IndustryConfig = {
  code: IndustryCode;
  getLabel: () => string;
};

export const TOP_INDUSTRIES: IndustryConfig[] = [
  {
    code: 'automotive',
    getLabel: () => I18N.enterpriseData.industryNameAutomotive,
  },
  {
    code: 'battery_storage',
    getLabel: () => I18N.enterpriseData.industryNameBatteryStorage,
  },
  {
    code: 'textile_apparel',
    getLabel: () => I18N.enterpriseData.industryNameTextileApparel,
  },
  {
    code: 'food_beverage',
    getLabel: () => I18N.enterpriseData.industryNameFoodBeverage,
  },
  {
    code: 'consumer_electronics',
    getLabel: () => I18N.enterpriseData.industryNameConsumerElectronics,
  },
  {
    code: 'chemicals_new_materials',
    getLabel: () => I18N.enterpriseData.industryNameChemicalsNewMaterials,
  },
  {
    code: 'packaging_logistics',
    getLabel: () => I18N.enterpriseData.industryNamePackagingLogistics,
  },
  {
    code: 'finance',
    getLabel: () => I18N.enterpriseData.industryNameFinance,
  },
  {
    code: 'building_materials',
    getLabel: () => I18N.enterpriseData.industryNameBuildingMaterials,
  },
  {
    code: 'nonferrous_metals',
    getLabel: () => I18N.enterpriseData.industryNameNonferrousMetals,
  },
];

export const DEFAULT_INDUSTRY_CODE: IndustryCode = 'automotive';

export const isIndustryCode = (value?: string | null): value is IndustryCode =>
  TOP_INDUSTRIES.some(item => item.code === value);

export const getIndustryLabel = (code: IndustryCode) =>
  TOP_INDUSTRIES.find(item => item.code === code)?.getLabel() || code;
