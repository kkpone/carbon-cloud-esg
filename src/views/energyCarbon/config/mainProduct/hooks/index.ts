import I18N from '@/lang/I18N';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import {
  addProductApi,
  deleteProductApi,
  editProductApi,
  getProductOptionsApi,
  getProductPageApi,
} from '../services';
import type {
  ProductAddReq,
  ProductEditReq,
  ProductListParams,
} from '../types';

/** 名称、编号候选复用列表缓存前缀，新增编辑删除后同步失效。 */
export function useProductOptions() {
  return useQuery({
    queryKey: [...productQueryKeys.lists(), 'options'],
    queryFn: () => getProductOptionsApi().then(response => response.data.data),
  });
}

export const productQueryKeys = {
  all: ['energy-product'] as const,
  lists: () => [...productQueryKeys.all, 'list'] as const,
  list: (params: ProductListParams) =>
    [...productQueryKeys.lists(), params] as const,
};

export function useProductPage(params: ProductListParams) {
  return useQuery({
    queryKey: productQueryKeys.list(params),
    queryFn: () =>
      getProductPageApi(params).then(response => response.data.data),
  });
}

export function useAddProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductAddReq) =>
      addProductApi(data).then(response => response.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.addSuccess);
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
    },
  });
}

export function useEditProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProductEditReq) =>
      editProductApi(data).then(response => response.data.data),
    onSuccess: () => {
      message.success(I18N.common.feedback.saveSuccess);
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteProductApi,
    onSuccess: () => {
      message.success(I18N.common.feedback.deleteSuccess);
      queryClient.invalidateQueries({ queryKey: productQueryKeys.lists() });
    },
  });
}
