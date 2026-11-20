import request from '@/views/energyCarbon/platform/request';
import type { ResponseData } from '@/views/energyCarbon/platform/types';
import type {
  ProductAddReq,
  ProductEditReq,
  ProductListParams,
  ProductPage,
} from './types';

/**
 * @description 查询当前租户内去重的名称、编号筛选选项。
 */
export const getProductOptionsApi = () =>
  request<ResponseData<{ names: string[]; codes: string[] }>>({
    method: 'GET',
    url: '/energy/product/options',
  });

/** 查询产品分页。 */
export const getProductPageApi = (params: ProductListParams) =>
  request<ResponseData<ProductPage>>({
    method: 'GET',
    url: '/energy/product/page',
    params,
  });

/** 新增产品。 */
export const addProductApi = (data: ProductAddReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/product/add',
    data,
  });

/** 编辑产品。 */
export const editProductApi = (data: ProductEditReq) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/product/edit',
    data,
  });

/** 逻辑删除产品。 */
export const deleteProductApi = (id: number) =>
  request<ResponseData<number>>({
    method: 'POST',
    url: '/energy/product/delete',
    data: { id },
  });
