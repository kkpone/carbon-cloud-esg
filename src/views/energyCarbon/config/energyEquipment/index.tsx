import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
/**
 * 业务检索：用能设备 - 按名称、编码和重点设备标识查询并维护设备主数据
 * 路由：/energyCarbon/config/energyEquipment
 */
import { Button, Form, Select, Space, Table, TreeSelect } from 'antd';
import { useMemo, useState } from 'react';
import { z } from 'zod';
import {
  useEnergyEquipmentOptions,
  useDeleteEnergyEquipment,
  useEnergyEquipmentPage,
} from './hooks';

import I18N from '@/lang/I18N';
import AuthButton from '@/views/energyCarbon/components/AuthButton';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import { TABLE_DEFAULT_PAGE_SIZE } from '@/views/energyCarbon/platform/config';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';

import { getEnergyEquipmentColumns } from './columns';
import EnergyEquipmentFormDrawer, {
  type EnergyEquipmentDrawerTarget,
} from './components/EnergyEquipmentFormDrawer';
import {
  ENERGY_EQUIPMENT_BUTTON_PERMISSION,
  ENERGY_EQUIPMENT_PAGE_PERMISSION,
  getKeyEnergyEquipmentOptions,
} from './constant';

import type { EnergyEquipmentListParams, EnergyEquipmentRecord } from './types';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).default(TABLE_DEFAULT_PAGE_SIZE),
  orgId: z.coerce.number().int().positive().optional(),
  equipmentName: z.string().optional(),
  equipmentCode: z.string().optional(),
  keyEnergyEquipment: z.boolean().optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(ENERGY_EQUIPMENT_PAGE_PERMISSION)) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <EnergyEquipmentPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  orgId?: number;
  equipmentName?: string;
  equipmentCode?: string;
  keyEnergyEquipment?: boolean;
}

function EnergyEquipmentPage() {
  const { locale } = useLocale();
  const navigate = useNavigate();
  // 页面权限集合传入操作列，编辑、删除和详情按钮均按后端 perms 独立过滤。
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const {
    page,
    pageSize,
    orgId,
    equipmentName,
    equipmentCode,
    keyEnergyEquipment,
  } = useEnergySearch(searchSchema);
  const [form] = Form.useForm<SearchValues>();
  const [drawerTarget, setDrawerTarget] =
    useState<EnergyEquipmentDrawerTarget>(null);
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const orgTreeData = useMemo(
    () => mapOrgTreeToTreeSelectData(orgTree),
    [orgTree],
  );

  const listParams = useMemo<EnergyEquipmentListParams>(
    () => ({
      pageNum: page,
      pageSize,
      orgId,
      equipmentName: equipmentName?.trim() || undefined,
      equipmentCode: equipmentCode?.trim() || undefined,
      keyEnergyEquipment,
    }),
    [equipmentCode, equipmentName, keyEnergyEquipment, orgId, page, pageSize],
  );
  const { data, isLoading, refetch } = useEnergyEquipmentPage(listParams);
  const { data: filterOptions } = useEnergyEquipmentOptions(orgId);
  const { mutateAsync: deleteEnergyEquipment, isLoading: deleting } =
    useDeleteEnergyEquipment();

  const handleDelete = async (record: EnergyEquipmentRecord) => {
    await deleteEnergyEquipment(record.id);
    // 删除当前页最后一条时回到上一页，避免停留在空页。
    if ((data?.records.length ?? 0) === 1 && page > 1) {
      await navigate({
        to: '/energyCarbon/config/energyEquipment',
        search: {
          page: page - 1,
          pageSize,
          orgId,
          equipmentName,
          equipmentCode,
          keyEnergyEquipment,
        },
      });
    }
  };

  const columns = useMemo(
    () =>
      getEnergyEquipmentColumns({
        page,
        pageSize,
        permissionKeys,
        onView: record => setDrawerTarget({ kind: 'view', record }),
        onEdit: record => setDrawerTarget({ kind: 'edit', record }),
        onDelete: handleDelete,
      }),
    [locale, handleDelete, page, pageSize, permissionKeys],
  );

  return (
    <PageContainer
      title={I18N.energyCarbon.energyEquipment}
      permissionKey={ENERGY_EQUIPMENT_PAGE_PERMISSION}
      extra={
        <AuthButton permissionKey={ENERGY_EQUIPMENT_BUTTON_PERMISSION.ADD}>
          <Button
            type='primary'
            data-testid='energy-equipment-create'
            onClick={() => setDrawerTarget({ kind: 'new' })}
          >
            {I18N.energyCarbon.cfgAddEquipment}
          </Button>
        </AuthButton>
      }
    >
      <ListSearchForm<SearchValues>
        form={form}
        requiredMark={false}
        initialValues={{
          orgId,
          equipmentName,
          equipmentCode,
          keyEnergyEquipment,
        }}
        onFinish={values => {
          navigate({
            to: '/energyCarbon/config/energyEquipment',
            search: {
              page: 1,
              pageSize,
              orgId: values.orgId,
              equipmentName: values.equipmentName?.trim() || undefined,
              equipmentCode: values.equipmentCode?.trim() || undefined,
              keyEnergyEquipment: values.keyEnergyEquipment,
            },
          });
        }}
      >
        <Form.Item name='equipmentName'>
          <Select
            allowClear
            placeholder={I18N.energyCarbon.cfgEquipmentName}
            showSearch
            optionFilterProp='label'
            options={filterOptions?.names.map(value => ({
              value,
              label: value,
            }))}
            className='filterFieldWidth'
            data-testid='energy-equipment-search-name'
          />
        </Form.Item>
        <Form.Item name='equipmentCode'>
          <Select
            allowClear
            placeholder={I18N.energyCarbon.cfgEquipmentCode}
            showSearch
            optionFilterProp='label'
            options={filterOptions?.codes.map(value => ({
              value,
              label: value,
            }))}
            className='filterFieldWidth'
            data-testid='energy-equipment-search-code'
          />
        </Form.Item>
        <Form.Item name='orgId'>
          <TreeSelect
            allowClear
            showSearch
            treeNodeFilterProp='title'
            treeData={orgTreeData}
            treeDefaultExpandAll
            placeholder={I18N.common.fields.organization}
            className='filterFieldWidth'
            data-testid='energy-equipment-search-org'
          />
        </Form.Item>
        <Form.Item name='keyEnergyEquipment'>
          <Select
            allowClear
            placeholder={I18N.energyCarbon.cfgKeyEquipment}
            options={[...getKeyEnergyEquipmentOptions()]}
            className='filterFieldWidth'
            data-testid='energy-equipment-search-key'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='energy-equipment-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              data-testid='energy-equipment-reset'
              onClick={() => {
                // 重置同时清空表单和 URL 条件；URL 已是默认值时主动刷新当前查询。
                form.setFieldsValue({
                  equipmentName: undefined,
                  equipmentCode: undefined,
                  keyEnergyEquipment: undefined,
                  orgId: undefined,
                });
                if (
                  page === 1 &&
                  orgId === undefined &&
                  equipmentName === undefined &&
                  equipmentCode === undefined &&
                  keyEnergyEquipment === undefined
                ) {
                  refetch();
                  return;
                }
                navigate({
                  to: '/energyCarbon/config/energyEquipment',
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
        scroll={{ x: 1500 }}
        pagination={{
          current: page,
          pageSize,
          total: data?.total ?? 0,
          showSizeChanger: true,
          showQuickJumper: true,
          onChange: (nextPage, nextPageSize) => {
            navigate({
              to: '/energyCarbon/config/energyEquipment',
              search: {
                page: nextPage,
                pageSize: nextPageSize,
                orgId,
                equipmentName,
                equipmentCode,
                keyEnergyEquipment,
              },
            });
          },
        }}
        data-testid='energy-equipment-table'
      />

      <EnergyEquipmentFormDrawer
        target={drawerTarget}
        onClose={() => setDrawerTarget(null)}
      />
    </PageContainer>
  );
}
