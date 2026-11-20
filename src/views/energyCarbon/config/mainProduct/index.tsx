import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：产品管理 - 按产品名称和编码查询并维护生产产品主数据
 * 路由：/energyCarbon/config/mainProduct
 */
import I18N from '@/lang/I18N';
import { Button, Form, Select, Space, Table } from 'antd';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import { useProductOptions, useDeleteProduct, useProductPage } from './hooks';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import { TABLE_DEFAULT_PAGE_SIZE } from '@/views/energyCarbon/platform/config';

import { getProductColumns } from './columns';
import ProductFormDrawer, {
  type ProductDrawerTarget,
} from './components/ProductFormDrawer';
import { PRODUCT_BUTTON_PERMISSION, PRODUCT_PAGE_PERMISSION } from './constant';

import type { ProductListParams, ProductRecord } from './types';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(200)
    .default(TABLE_DEFAULT_PAGE_SIZE),
  productName: z.string().optional(),
  productCode: z.string().optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(PRODUCT_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <MainProductPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  productName?: string;
  productCode?: string;
}

function MainProductPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  // 页面权限集合传入操作列，编辑、删除和详情按钮均按后端 perms 独立过滤。
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const { page, pageSize, productName, productCode } =
    useEnergySearch(searchSchema);
  const [form] = Form.useForm<SearchValues>();
  const [drawerTarget, setDrawerTarget] = useState<ProductDrawerTarget>(null);
  const listParams = useMemo<ProductListParams>(
    () => ({
      pageNum: page,
      pageSize,
      productName: productName?.trim() || undefined,
      productCode: productCode?.trim() || undefined,
    }),
    [page, pageSize, productName, productCode],
  );
  const { data, isLoading, refetch } = useProductPage(listParams);
  const { data: filterOptions } = useProductOptions();
  const { mutateAsync: deleteProduct, isLoading: deleting } =
    useDeleteProduct();

  const handleDelete = async (record: ProductRecord) => {
    await deleteProduct(record.id);
    if ((data?.records.length ?? 0) === 1 && page > 1) {
      await navigate({
        to: '/energyCarbon/config/mainProduct',
        search: { page: page - 1, pageSize, productName, productCode },
      });
    }
  };

  const columns = useMemo(
    () =>
      getProductColumns({
        page,
        pageSize,
        permissionKeys,
        onView: record => setDrawerTarget({ kind: 'view', record }),
        onEdit: record => setDrawerTarget({ kind: 'edit', record }),
        onDelete: handleDelete,
      }),
    [locale, page, pageSize, data?.records.length, permissionKeys],
  );

  return (
    <PageContainer
      title={I18N.energyCarbon.cfgMainProduct}
      permissionKey={PRODUCT_PAGE_PERMISSION}
      extra={
        <AuthButton permissionKey={PRODUCT_BUTTON_PERMISSION.ADD}>
          <Button
            type='primary'
            data-testid='main-product-create'
            onClick={() => setDrawerTarget({ kind: 'new' })}
          >
            {I18N.energyCarbon.cfgAddMainProduct}
          </Button>
        </AuthButton>
      }
    >
      <ListSearchForm<SearchValues>
        form={form}
        requiredMark={false}
        initialValues={{ productName, productCode }}
        onFinish={values => {
          navigate({
            to: '/energyCarbon/config/mainProduct',
            search: {
              page: 1,
              pageSize,
              productName: values.productName?.trim() || undefined,
              productCode: values.productCode?.trim() || undefined,
            },
          });
        }}
      >
        <Form.Item name='productName'>
          <Select
            allowClear
            showSearch
            optionFilterProp='label'
            options={filterOptions?.names.map(value => ({
              value,
              label: value,
            }))}
            className='filterFieldWidth'
            placeholder={I18N.common.fields.productName}
            data-testid='main-product-search-name'
          />
        </Form.Item>
        <Form.Item name='productCode'>
          <Select
            allowClear
            showSearch
            optionFilterProp='label'
            options={filterOptions?.codes.map(value => ({
              value,
              label: value,
            }))}
            className='filterFieldWidth'
            placeholder={I18N.energyCarbon.cfgProductCode}
            data-testid='main-product-search-code'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='main-product-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              data-testid='main-product-reset'
              onClick={() => {
                // 重置同时清空表单和 URL 条件；URL 已是默认值时主动刷新当前查询。
                form.setFieldsValue({
                  productName: undefined,
                  productCode: undefined,
                });
                if (
                  page === 1 &&
                  productName === undefined &&
                  productCode === undefined
                ) {
                  refetch();
                  return;
                }
                navigate({
                  to: '/energyCarbon/config/mainProduct',
                  search: { page: 1, pageSize },
                });
              }}
            >
              {I18N.common.actions.reset}
            </Button>
          </Space>
        </Form.Item>
      </ListSearchForm>

      <Table
        rowKey='id'
        columns={columns}
        dataSource={data?.records ?? []}
        loading={isLoading || deleting}
        scroll={{ x: 1950 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (nextPage, nextPageSize) => {
            navigate({
              to: '/energyCarbon/config/mainProduct',
              search: {
                page: nextPage,
                pageSize: nextPageSize,
                productName,
                productCode,
              },
            });
          },
        }}
        data-testid='main-product-table'
      />

      <ProductFormDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
      />
    </PageContainer>
  );
}
