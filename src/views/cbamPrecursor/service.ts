import { IPageList, request, ResponseData } from '@/api/request';

import {
  DefaultCnOption,
  Precursor,
  PrecursorCnCard,
  PrecursorPayload,
} from './types';

export const getDefaultCnPage = () =>
  request<ResponseData<IPageList<DefaultCnOption>>>({
    method: 'GET',
    url: '/cbam2/defaultCn',
    params: {
      pageNum: 1,
      pageSize: 10000,
      deduplicateCode: true,
    },
  });

export const getPrecursorCnPage = (params: {
  pageNum: number;
  pageSize: number;
  keyword?: string;
  onlyUsed?: boolean;
}) =>
  request<ResponseData<IPageList<PrecursorCnCard>>>({
    method: 'GET',
    url: '/cbam2/precursor/cn/page',
    params,
  });

export const getPrecursorPage = (params: {
  pageNum: number;
  pageSize: number;
  cnCode: string;
  hidden: boolean;
}) =>
  request<ResponseData<IPageList<Precursor>>>({
    method: 'GET',
    url: '/cbam2/precursor/page',
    params,
  });

export const createPrecursor = (data: PrecursorPayload) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/cbam2/precursor/add',
    data,
  });

export const getPrecursorDetail = (id: number) =>
  request<ResponseData<Precursor>>({
    method: 'GET',
    url: `/cbam2/precursor/${id}`,
  });

export const hidePrecursor = (id: number) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: `/cbam2/precursor/${id}/hide`,
  });

export const restorePrecursor = (id: number) =>
  request<ResponseData<void>>({
    method: 'POST',
    url: `/cbam2/precursor/${id}/restore`,
  });
