import { request } from '@src/api/request';

import {
  DashboardProduct,
  DashboardSummary,
  DashboardSupplier,
  EnterpriseStructureAnalysis,
  EnterpriseSupplierTrendAnalysis,
  EnterpriseTrendAnalysis,
  EnterpriseYearOption,
  ProductAnalysis,
} from './type';

export const getDashboardSummary = () =>
  request<{ data: DashboardSummary }>({
    method: 'get',
    url: '/chain/dashboard/summary',
  });

export const getDashboardSuppliers = (params: {
  analysisType: 'PRODUCT' | 'ENTERPRISE';
  keyword?: string;
}) =>
  request<{ data: DashboardSupplier[] }>({
    method: 'get',
    url: '/chain/dashboard/suppliers',
    params,
  });

export const getDashboardProductOptions = (params: {
  supplierIds: number[];
  excludeManual?: boolean;
}) =>
  request<{ data: DashboardProduct[] }>({
    method: 'get',
    url: '/chain/dashboard/product/options',
    params: {
      supplierIds: params.supplierIds.join(','),
      excludeManual: params.excludeManual,
    },
  });

export const getDashboardProductTypeAnalysis = (params: {
  supplierIds: number[];
  purchaseGoodsId: number;
}) =>
  request<{ data: ProductAnalysis }>({
    method: 'get',
    url: '/chain/dashboard/product/type-analysis',
    params: { ...params, supplierIds: params.supplierIds.join(',') },
  });

export const getDashboardProductLifecycleAnalysis = (params: {
  supplierIds: number[];
  purchaseGoodsId: number;
}) =>
  request<{ data: ProductAnalysis }>({
    method: 'get',
    url: '/chain/dashboard/product/lifecycle-analysis',
    params: { ...params, supplierIds: params.supplierIds.join(',') },
  });

export const getDashboardEnterpriseOptions = (params: {
  supplierIds: number[];
}) =>
  request<{ data: EnterpriseYearOption[] }>({
    method: 'get',
    url: '/chain/dashboard/enterprise/options',
    params: { supplierIds: params.supplierIds.join(',') },
  });

export const getDashboardEnterpriseTrend = (params: {
  supplierIds: number[];
  trendYears: 5 | 10 | 15;
}) =>
  request<{ data: EnterpriseTrendAnalysis }>({
    method: 'get',
    url: '/chain/dashboard/enterprise/trend',
    params: { ...params, supplierIds: params.supplierIds.join(',') },
  });

export const getDashboardEnterpriseStructure = (params: {
  supplierIds: number[];
  structureYear?: string;
}) =>
  request<{ data: EnterpriseStructureAnalysis }>({
    method: 'get',
    url: '/chain/dashboard/enterprise/structure',
    params: { ...params, supplierIds: params.supplierIds.join(',') },
  });

export const getDashboardEnterpriseSupplierTrend = (params: {
  supplierIds: number[];
  trendYears: 5 | 10 | 15;
  scope: string;
}) =>
  request<{ data: EnterpriseSupplierTrendAnalysis }>({
    method: 'get',
    url: '/chain/dashboard/enterprise/supplier-trend',
    params: { ...params, supplierIds: params.supplierIds.join(',') },
  });
