import { request, ResponseData } from '@/api/request';

import {
  DataOverviewEmission,
  DataOverviewOptions,
  DataOverviewSummary,
  DataOverviewTrend,
} from './types';

export const getDataOverviewOptions = (year?: number) =>
  request<ResponseData<DataOverviewOptions>>({
    method: 'GET',
    url: '/cbam2/dataOverview/options',
    params: { year },
  });

export const getDataOverviewSummary = (year: number) =>
  request<ResponseData<DataOverviewSummary>>({
    method: 'GET',
    url: '/cbam2/dataOverview/summary',
    params: { year },
  });

export const getFacilityEmissions = (year: number, factoryId: number) =>
  request<ResponseData<DataOverviewEmission[]>>({
    method: 'GET',
    url: '/cbam2/dataOverview/facility-emissions',
    params: { year, factoryId },
  });

export const getProductEmissions = (year: number, cnCode: string) =>
  request<ResponseData<DataOverviewEmission[]>>({
    method: 'GET',
    url: '/cbam2/dataOverview/product-emissions',
    params: { year, cnCode },
  });

export const getPrecursorEmissions = (year: number, cnCode: string) =>
  request<ResponseData<DataOverviewEmission[]>>({
    method: 'GET',
    url: '/cbam2/dataOverview/precursor-emissions',
    params: { year, cnCode },
  });

export const getTaxTrend = (cnCode: string) =>
  request<ResponseData<DataOverviewTrend[]>>({
    method: 'GET',
    url: '/cbam2/dataOverview/tax-trend',
    params: { cnCode },
  });
