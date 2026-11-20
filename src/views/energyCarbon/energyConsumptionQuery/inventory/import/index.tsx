import EnergyQueryProvider from '@/views/energyCarbon/components/EnergyQueryProvider';
import {
  EnergyForbidden,
  useEnergySearch,
  useNavigate,
} from '@/views/energyCarbon/hooks/useEnergyNavigation';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
/**
 * 库存盘点导入：模板内逐行选择权限范围组织，导入记录仅本人可见。
 * 路由：/energyCarbon/energyConsumptionQuery/inventory/import
 */
import I18N from '@/lang/I18N';
import {
  buildBasicImportLogColumns,
  STATUS_TAG,
} from '@/views/energyCarbon/components/ImportFileModal/columns';
import importStyles from '@/views/energyCarbon/components/ImportFileModal/index.module.css';
import { IMPORT_STATUS } from '@/views/energyCarbon/components/ImportFileModal/types';
import PageContainer from '@/views/energyCarbon/components/PageContainer';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { withTableColumnEmptyRender } from '@/views/energyCarbon/platform/tableColumn';
import { Button, Table, Tag, Tooltip } from 'antd';
import { z } from 'zod';
import InventoryImportPanel from '../components/InventoryImportPanel';
import { INVENTORY_PAGE_PERMISSION, INVENTORY_PERMISSION } from '../constant';
import { useInventoryImportRecords } from '../hooks';
import type { InventoryImportLogRecord } from '../types';

const searchSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(10),
});

/** 使用碳云 React Router 和角色权限控制页面入口。 */
export default function EnergyPageEntry() {
  const permissionKeys = useMenuStore(state => state.permissionKeys);
  const allowed = (() => {
    if (
      !permissionKeys.has(INVENTORY_PAGE_PERMISSION) ||
      !permissionKeys.has(INVENTORY_PERMISSION.IMPORT)
    ) {
      return false;
    }

    return true;
  })();
  return allowed ? (
    <EnergyQueryProvider>
      <InventoryImportPage />
    </EnergyQueryProvider>
  ) : (
    <EnergyForbidden />
  );
}

/** 仅补充库存批次计数和状态原因，文件下载继续复用公共记录行操作。 */
function buildInventoryImportLogColumns() {
  const basicColumns = buildBasicImportLogColumns();
  const statusColumns = basicColumns.slice(2).map(column =>
    'dataIndex' in column && column.dataIndex === 'importStatus'
      ? {
          ...column,
          render: (
            status: number | undefined,
            record: InventoryImportLogRecord,
          ) => {
            const value = status === undefined ? undefined : Number(status);
            const text =
              value === IMPORT_STATUS.PENDING
                ? I18N.energyCarbon.inventoryImportProcessing
                : record.importStatus_name ??
                  (value === IMPORT_STATUS.IMPORTED
                    ? I18N.importFile.status.imported
                    : value === IMPORT_STATUS.FAILED
                    ? I18N.importFile.status.failed
                    : '-');
            return (
              <Tooltip title={record.errMsg}>
                <Tag
                  color={
                    value === undefined ? undefined : STATUS_TAG[value]?.color
                  }
                >
                  {text}
                </Tag>
              </Tooltip>
            );
          },
        }
      : column,
  );
  return withTableColumnEmptyRender<InventoryImportLogRecord>([
    ...basicColumns.slice(0, 2),
    {
      title: I18N.energyCarbon.inventoryImportTotalCount,
      dataIndex: 'totalCount',
      width: 100,
      ellipsis: true,
    },
    {
      title: I18N.energyCarbon.inventoryImportSuccessCount,
      dataIndex: 'successCount',
      width: 100,
      ellipsis: true,
    },
    {
      title: I18N.energyCarbon.inventoryImportFailedCount,
      dataIndex: 'failedCount',
      width: 100,
      ellipsis: true,
    },
    ...statusColumns,
  ]);
}

/** 独立库存导入页复用公共记录列，查询和记录归属由库存后端限定。 */
function InventoryImportPage() {
  useLocale();
  const navigate = useNavigate();
  const search = useEnergySearch(searchSchema);
  const records = useInventoryImportRecords({
    pageNum: search.page,
    pageSize: search.pageSize,
  });
  return (
    <PageContainer
      title={I18N.energyCarbon.inventoryImport}
      extra={
        <Button
          onClick={() => {
            navigate({
              to: '/energyCarbon/energyConsumptionQuery/inventory',
              search: { page: 1, pageSize: 10 },
            });
          }}
          data-testid='energy-inventory-import-back'
        >
          {I18N.common.actions.back}
        </Button>
      }
    >
      <InventoryImportPanel
        onSubmitted={() => {
          navigate({
            to: '/energyCarbon/energyConsumptionQuery/inventory/import',
            search: { page: 1, pageSize: search.pageSize },
          });
        }}
      />
      <div className={importStyles.tableHeader}>
        <h4 className={importStyles.tableTitle}>
          {I18N.energyCarbon.inventoryImportHistory}
        </h4>
        <Button
          size='small'
          loading={records.isFetching}
          onClick={() => {
            records.refetch();
          }}
          data-testid='energy-inventory-import-refresh'
        >
          {I18N.importFile.refresh}
        </Button>
      </div>
      <Table<InventoryImportLogRecord>
        rowKey='id'
        columns={buildInventoryImportLogColumns()}
        dataSource={records.data?.records ?? []}
        loading={records.isFetching}
        scroll={{ x: 1300 }}
        data-testid='energy-inventory-import-records'
        pagination={{
          current: search.page,
          pageSize: search.pageSize,
          total: records.data?.total ?? 0,
          showSizeChanger: true,
          onChange: (page, pageSize) => {
            navigate({
              to: '/energyCarbon/energyConsumptionQuery/inventory/import',
              search: { page, pageSize },
            });
          },
        }}
      />
    </PageContainer>
  );
}
