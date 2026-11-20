import { lazy } from 'react';
import I18N from '@/lang/I18N';
import type { Routes } from '../config';

const EnergyPage0 = lazy(
  () => import('@/views/energyCarbon/carbonAssetManagement/account'),
);
const EnergyPage1 = lazy(
  () => import('@/views/energyCarbon/carbonAssetManagement/quota'),
);
const EnergyPage2 = lazy(
  () => import('@/views/energyCarbon/carbonAssetManagement/trade'),
);
const EnergyPage3 = lazy(
  () => import('@/views/energyCarbon/config/energyEquipment'),
);
const EnergyPage4 = lazy(
  () => import('@/views/energyCarbon/config/energyList'),
);
const EnergyPage5 = lazy(
  () => import('@/views/energyCarbon/config/mainProduct'),
);
const EnergyPage6 = lazy(
  () => import('@/views/energyCarbon/config/measuringInstrument'),
);
const EnergyPage7 = lazy(
  () => import('@/views/energyCarbon/energyAnalysis/boundary'),
);
const EnergyPage8 = lazy(
  () => import('@/views/energyCarbon/energyAnalysis/efficiency'),
);
const EnergyPage9 = lazy(
  () => import('@/views/energyCarbon/energyAnalysis/form'),
);
const EnergyPage10 = lazy(
  () => import('@/views/energyCarbon/energyAnalysis/overview'),
);
const EnergyPage11 = lazy(
  () => import('@/views/energyCarbon/energyAnalysis/structure'),
);
const EnergyPage12 = lazy(
  () => import('@/views/energyCarbon/energyBudgetManagement/budget'),
);
const EnergyPage13 = lazy(
  () => import('@/views/energyCarbon/energyCalc/consumption'),
);
const EnergyPage14 = lazy(
  () => import('@/views/energyCarbon/energyCalc/intensity'),
);
const EnergyPage15 = lazy(
  () => import('@/views/energyCarbon/energyCalc/productionFill'),
);
const EnergyPage16 = lazy(
  () => import('@/views/energyCarbon/energyCalc/productionLedger'),
);
const EnergyPage17 = lazy(
  () => import('@/views/energyCarbon/energyConsumptionQuery/dataFill'),
);
const EnergyPage18 = lazy(
  () => import('@/views/energyCarbon/energyConsumptionQuery/inventory/import'),
);
const EnergyPage19 = lazy(
  () => import('@/views/energyCarbon/energyConsumptionQuery/inventory'),
);
const EnergyPage20 = lazy(
  () => import('@/views/energyCarbon/energyConsumptionQuery/ledger'),
);
const EnergyPage21 = lazy(
  () => import('@/views/energyCarbon/energyConsumptionQuery/query'),
);
const EnergyPage22 = lazy(
  () => import('@/views/energyCarbon/energyEfficiencyBenchmark/analysis'),
);
const EnergyPage23 = lazy(
  () => import('@/views/energyCarbon/energyEfficiencyBenchmark/data'),
);
const EnergyPage24 = lazy(
  () => import('@/views/energyCarbon/energyFlowAnalysis/analysis'),
);
const EnergyPage25 = lazy(
  () => import('@/views/energyCarbon/energyFlowAnalysis/setting'),
);
const EnergyPage26 = lazy(() => import('@/views/energyCarbon/orgBoundary'));

/** 能碳产品路由，菜单可见性仍由碳云权限和产品开通控制。 */
export const energyCarbonRoutes: Routes[] = [
  {
    path: '/energyCarbon',
    scope: 'cloud',
    meta: { title: I18N.energyCarbon.routeTitles.root },
    redirect: '/energyCarbon/energyConsumptionQuery/query',
    children: [
      {
        path: '/energyCarbon/carbonAssetManagement/account',
        meta: {
          title: I18N.energyCarbon.routeTitles.carbonAssetManagement_account,
        },
        component: EnergyPage0,
      },
      {
        path: '/energyCarbon/carbonAssetManagement/quota',
        meta: {
          title: I18N.energyCarbon.routeTitles.carbonAssetManagement_quota,
        },
        component: EnergyPage1,
      },
      {
        path: '/energyCarbon/carbonAssetManagement/trade',
        meta: {
          title: I18N.energyCarbon.routeTitles.carbonAssetManagement_trade,
        },
        component: EnergyPage2,
      },
      {
        path: '/energyCarbon/config/energyEquipment',
        meta: { title: I18N.energyCarbon.routeTitles.config_energyEquipment },
        component: EnergyPage3,
      },
      {
        path: '/energyCarbon/config/energyList',
        meta: { title: I18N.energyCarbon.routeTitles.config_energyList },
        component: EnergyPage4,
      },
      {
        path: '/energyCarbon/config/mainProduct',
        meta: { title: I18N.energyCarbon.routeTitles.config_mainProduct },
        component: EnergyPage5,
      },
      {
        path: '/energyCarbon/config/measuringInstrument',
        meta: {
          title: I18N.energyCarbon.routeTitles.config_measuringInstrument,
        },
        component: EnergyPage6,
      },
      {
        path: '/energyCarbon/energyAnalysis/boundary',
        meta: { title: I18N.energyCarbon.routeTitles.energyAnalysis_boundary },
        component: EnergyPage7,
      },
      {
        path: '/energyCarbon/energyAnalysis/efficiency',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyAnalysis_efficiency,
        },
        component: EnergyPage8,
      },
      {
        path: '/energyCarbon/energyAnalysis/form',
        meta: { title: I18N.energyCarbon.routeTitles.energyAnalysis_form },
        component: EnergyPage9,
      },
      {
        path: '/energyCarbon/energyAnalysis/overview',
        meta: { title: I18N.energyCarbon.routeTitles.energyAnalysis_overview },
        component: EnergyPage10,
      },
      {
        path: '/energyCarbon/energyAnalysis/structure',
        meta: { title: I18N.energyCarbon.routeTitles.energyAnalysis_structure },
        component: EnergyPage11,
      },
      {
        path: '/energyCarbon/energyBudgetManagement/budget',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyBudgetManagement_budget,
        },
        component: EnergyPage12,
      },
      {
        path: '/energyCarbon/energyCalc/consumption',
        meta: { title: I18N.energyCarbon.routeTitles.energyCalc_consumption },
        component: EnergyPage13,
      },
      {
        path: '/energyCarbon/energyCalc/intensity',
        meta: { title: I18N.energyCarbon.routeTitles.energyCalc_intensity },
        component: EnergyPage14,
      },
      {
        path: '/energyCarbon/energyCalc/productionFill',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyCalc_productionFill,
        },
        component: EnergyPage15,
      },
      {
        path: '/energyCarbon/energyCalc/productionLedger',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyCalc_productionLedger,
        },
        component: EnergyPage16,
      },
      {
        path: '/energyCarbon/energyConsumptionQuery/dataFill',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyConsumptionQuery_dataFill,
        },
        component: EnergyPage17,
      },
      {
        path: '/energyCarbon/energyConsumptionQuery/inventory/import',
        meta: {
          title:
            I18N.energyCarbon.routeTitles
              .energyConsumptionQuery_inventory_import,
        },
        component: EnergyPage18,
      },
      {
        path: '/energyCarbon/energyConsumptionQuery/inventory',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyConsumptionQuery_inventory,
        },
        component: EnergyPage19,
      },
      {
        path: '/energyCarbon/energyConsumptionQuery/ledger',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyConsumptionQuery_ledger,
        },
        component: EnergyPage20,
      },
      {
        path: '/energyCarbon/energyConsumptionQuery/query',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyConsumptionQuery_query,
        },
        component: EnergyPage21,
      },
      {
        path: '/energyCarbon/energyEfficiencyBenchmark/analysis',
        meta: {
          title:
            I18N.energyCarbon.routeTitles.energyEfficiencyBenchmark_analysis,
        },
        component: EnergyPage22,
      },
      {
        path: '/energyCarbon/energyEfficiencyBenchmark/data',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyEfficiencyBenchmark_data,
        },
        component: EnergyPage23,
      },
      {
        path: '/energyCarbon/energyFlowAnalysis/analysis',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyFlowAnalysis_analysis,
        },
        component: EnergyPage24,
      },
      {
        path: '/energyCarbon/energyFlowAnalysis/setting',
        meta: {
          title: I18N.energyCarbon.routeTitles.energyFlowAnalysis_setting,
        },
        component: EnergyPage25,
      },
      {
        path: '/energyCarbon/orgBoundary',
        meta: { title: I18N.energyCarbon.routeTitles.orgBoundary },
        component: EnergyPage26,
      },
    ],
  },
];
