import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 业务检索：库存盘点 - 独立新增、导入、编辑、删除和查看，保存即参与后续能耗计算
 * 路由：/energyCarbon/energyConsumptionQuery/inventory
 */
import I18N from '@/lang/I18N';
import AuthButton from '@/views/energyCarbon/components/AuthButton';
import ListSearchForm from '@/views/energyCarbon/components/ListSearchForm';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useDataPermissionOrgTree } from '@/views/energyCarbon/hooks/useEnergyOrgTree';
import { confirmDelete } from '@/views/energyCarbon/platform/confirmDelete';
import { mapOrgTreeToTreeSelectData } from '@/views/energyCarbon/platform/utils';
import {
  Button,
  DatePicker,
  Form,
  Input,
  Space,
  Table,
  TreeSelect,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useState } from 'react';
import { z } from 'zod';
import { getInventoryColumns } from './columns';
import InventoryFormDrawer from './components/InventoryFormDrawer';
import { INVENTORY_PAGE_PERMISSION, INVENTORY_PERMISSION } from './constant';
import { useDeleteInventory, useInventoryPage } from './hooks';
import type { InventoryDrawerTarget, InventoryRecord } from './types';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
  orgId: z.coerce.number().int().positive().optional(),
  documentNo: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (!permissionKeys.has(INVENTORY_PAGE_PERMISSION)) return false;
    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <InventoryPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

interface SearchValues {
  documentNo?: string;
  orgId?: number;
  period?: [Dayjs, Dayjs];
}
/** 日期默认空，不继承填报页年度筛选及审批操作。 */
function InventoryPage() {
  useLocale();
  const search = useEnergySearch(searchSchema);
  const navigate = useNavigate();
  const [form] = Form.useForm<SearchValues>();
  const [target, setTarget] = useState<InventoryDrawerTarget>(null);
  const { data: orgTree = [] } = useDataPermissionOrgTree();
  const page = useInventoryPage({
    pageNum: search.page,
    pageSize: search.pageSize,
    orgId: search.orgId,
    documentNo: search.documentNo,
    startDate: search.startDate,
    endDate: search.endDate,
  });
  const deleting = useDeleteInventory();
  const columns = getInventoryColumns({
    pageNum: search.page,
    pageSize: search.pageSize,
    onEdit: id => setTarget({ kind: 'edit', id }),
    onView: id => setTarget({ kind: 'view', id }),
    onDelete: (record: InventoryRecord) =>
      confirmDelete({
        itemName: I18N.energyCarbon.inventoryTitle,
        itemValue: record.documentNo,
        onOk: () => deleting.mutateAsync(record.id).then(() => undefined),
      }),
  });
  return (
    <PageContainer
      title={I18N.energyCarbon.inventoryTitle}
      permissionKey={INVENTORY_PAGE_PERMISSION}
      extra={
        <Space>
          <AuthButton permissionKey={INVENTORY_PERMISSION.ADD}>
            <Button
              type='primary'
              onClick={() => setTarget({ kind: 'new' })}
              data-testid='energy-inventory-add'
            >
              {I18N.energyCarbon.inventoryAdd}
            </Button>
          </AuthButton>
          <AuthButton permissionKey={INVENTORY_PERMISSION.IMPORT}>
            <Button
              onClick={() => {
                navigate({
                  to: '/energyCarbon/energyConsumptionQuery/inventory/import',
                });
              }}
              data-testid='energy-inventory-import'
            >
              {I18N.energyCarbon.inventoryImport}
            </Button>
          </AuthButton>
        </Space>
      }
    >
      <ListSearchForm<SearchValues>
        form={form}
        initialValues={{
          documentNo: search.documentNo,
          orgId: search.orgId,
          period:
            search.startDate && search.endDate
              ? [dayjs(search.startDate), dayjs(search.endDate)]
              : undefined,
        }}
        onFinish={values => {
          navigate({
            to: '/energyCarbon/energyConsumptionQuery/inventory',
            search: {
              ...search,
              page: 1,
              documentNo: values.documentNo?.trim() || undefined,
              orgId: values.orgId,
              startDate: values.period?.[0]?.format('YYYY-MM-DD'),
              endDate: values.period?.[1]?.format('YYYY-MM-DD'),
            },
          });
        }}
      >
        <Form.Item name='documentNo'>
          <Input
            allowClear
            placeholder={I18N.energyCarbon.inventoryDocumentNo}
            data-testid='energy-inventory-search-no'
          />
        </Form.Item>
        <Form.Item name='orgId'>
          <TreeSelect
            treeData={mapOrgTreeToTreeSelectData(orgTree)}
            treeDefaultExpandAll
            allowClear
            className='filterFieldWidth'
            placeholder={I18N.common.fields.organization}
            data-testid='energy-inventory-search-org'
          />
        </Form.Item>
        <Form.Item name='period'>
          <DatePicker.RangePicker
            placeholder={[
              I18N.energyCarbon.inventoryPeriod,
              I18N.energyCarbon.inventoryPeriod,
            ]}
            data-testid='energy-inventory-search-period'
          />
        </Form.Item>
        <Form.Item>
          <Space>
            <Button
              type='primary'
              htmlType='submit'
              data-testid='energy-inventory-search'
            >
              {I18N.common.actions.search}
            </Button>
            <Button
              onClick={() => {
                form.resetFields();
                form.setFieldsValue({
                  documentNo: undefined,
                  orgId: undefined,
                  period: undefined,
                });
                navigate({
                  to: '/energyCarbon/energyConsumptionQuery/inventory',
                  search: { page: 1, pageSize: search.pageSize },
                });
              }}
              data-testid='energy-inventory-reset'
            >
              {I18N.common.actions.reset}
            </Button>
          </Space>
        </Form.Item>
      </ListSearchForm>
      <Table<InventoryRecord>
        rowKey='id'
        columns={columns}
        dataSource={page.data?.records ?? []}
        loading={page.isFetching || deleting.isLoading}
        scroll={{ x: 1200 }}
        data-testid='energy-inventory-table'
        pagination={{
          current: search.page,
          pageSize: search.pageSize,
          total: page.data?.total ?? 0,
          onChange: (nextPage, pageSize) => {
            navigate({
              to: '/energyCarbon/energyConsumptionQuery/inventory',
              search: { ...search, page: nextPage, pageSize },
            });
          },
        }}
      />
      {target && (
        <InventoryFormDrawer
          key={target.kind === 'new' ? 'new' : `${target.kind}-${target.id}`}
          target={target}
          onClose={() => setTarget(null)}
        />
      )}
    </PageContainer>
  );
}
