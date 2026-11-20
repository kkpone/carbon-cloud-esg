import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：能源列表 - 按能源名称和类型查询并维护能源主数据
 * 路由：/energyCarbon/config/energyList
 */
import I18N from '@/lang/I18N';
import { Button, Form, Select, Space, Table } from 'antd';
import { useCallback, useMemo, useState } from 'react';
import { z } from 'zod';

import AuthButton from '@/views/energyCarbon/components/AuthButton';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import { TABLE_DEFAULT_PAGE_SIZE } from '@/views/energyCarbon/platform/config';

import { getEnergyColumns } from './columns';
import EnergyFormDrawer, {
  type EnergyDrawerTarget,
} from './components/EnergyFormDrawer';
import {
  ENERGY_BUTTON_PERMISSION,
  ENERGY_PAGE_PERMISSION,
  getEnergyTypeOptions,
} from './constant';
import { useDeleteEnergy, useEnergyOptions, useEnergyPage } from './hooks';
import type { EnergyListParams, EnergyRecord, EnergyType } from './types';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  energyName: z.string().optional(),
  energyType: z.coerce.number().int().min(1).max(2).optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyListPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  energyName?: string;
  energyType?: EnergyType;
}

function EnergyListPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  // 页面权限集合传入操作列，编辑、删除和详情按钮均按后端 perms 独立过滤。
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const { page, pageSize, energyName, energyType } =
    useEnergySearch(searchSchema);
  const [form] = Form.useForm<SearchValues>();
  const [drawerTarget, setDrawerTarget] = useState<EnergyDrawerTarget>(null);

  const listParams = useMemo<EnergyListParams>(
    () => ({
      pageNum: page,
      pageSize,
      energyName: energyName?.trim() || undefined,
      energyType: energyType as EnergyType | undefined,
    }),
    [energyName, energyType, page, pageSize],
  );
  const { data, isLoading, refetch } = useEnergyPage(listParams);
  const { data: energyOptions = [] } = useEnergyOptions();
  // 筛选仍提交原能源名称，去重后避免同名能源生成重复Select值。
  const energyNameOptions = [
    ...new Set(energyOptions.map(item => item.name)),
  ].map(name => ({ label: name, value: name }));
  const { mutateAsync: deleteEnergy, isLoading: deleting } = useDeleteEnergy();

  const handleDelete = useCallback(
    async (record: EnergyRecord) => {
      await deleteEnergy(record.id);
      // 删除当前页最后一条时回到上一页，避免停留在空页。
      if ((data?.records.length ?? 0) === 1 && page > 1) {
        await navigate({
          to: '/energyCarbon/config/energyList',
          search: { page: page - 1, pageSize, energyName, energyType },
        });
      }
    },
    [
      data?.records.length,
      deleteEnergy,
      energyName,
      energyType,
      navigate,
      page,
      pageSize,
    ],
  );

  const columns = useMemo(
    () =>
      getEnergyColumns({
        page,
        pageSize,
        permissionKeys,
        onEdit: record => setDrawerTarget({ kind: 'edit', record }),
        onView: record => setDrawerTarget({ kind: 'view', record }),
        onDelete: handleDelete,
      }),
    [locale, handleDelete, page, pageSize, permissionKeys],
  );

  return (
    <PageContainer
      title={I18N.energyCarbon.cfgEnergyList}
      permissionKey={ENERGY_PAGE_PERMISSION}
      extra={
        <AuthButton permissionKey={ENERGY_BUTTON_PERMISSION.ADD}>
          <Button
            type='primary'
            data-testid='energy-list-create'
            onClick={() => setDrawerTarget({ kind: 'new' })}
          >
            {I18N.energyCarbon.cfgAddEnergy}
          </Button>
        </AuthButton>
      }
    >
      <ListSearchForm<SearchValues>
        form={form}
        requiredMark={false}
        initialValues={{ energyName, energyType }}
        onFinish={values => {
          navigate({
            to: '/energyCarbon/config/energyList',
            search: {
              page: 1,
              pageSize,
              energyName: values.energyName?.trim() || undefined,
              energyType: values.energyType,
            },
          });
        }}
      >
        <Form.Item name='energyName'>
          <Select
            allowClear
            placeholder={I18N.energyCarbon.energyName}
            showSearch
            optionFilterProp='label'
            options={energyNameOptions}
            className='filterFieldWidth'
            data-testid='energy-list-search-name'
          />
        </Form.Item>
        <Form.Item name='energyType'>
          <Select
            allowClear
            placeholder={I18N.common.shared.category}
            options={getEnergyTypeOptions()}
            style={{ width: 150 }}
            data-testid='energy-list-search-type'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='energy-list-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              data-testid='energy-list-reset'
              onClick={() => {
                // 重置同时清空表单和 URL 条件；URL 已是默认值时主动刷新当前查询。
                form.setFieldsValue({
                  energyName: undefined,
                  energyType: undefined,
                });
                if (
                  page === 1 &&
                  energyName === undefined &&
                  energyType === undefined
                ) {
                  refetch();
                  return;
                }
                navigate({
                  to: '/energyCarbon/config/energyList',
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
        scroll={{ x: 1650 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (nextPage, nextPageSize) => {
            navigate({
              to: '/energyCarbon/config/energyList',
              search: {
                page: nextPage,
                pageSize: nextPageSize,
                energyName,
                energyType,
              },
            });
          },
        }}
        data-testid='energy-list-table'
      />

      <EnergyFormDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
      />
    </PageContainer>
  );
}
