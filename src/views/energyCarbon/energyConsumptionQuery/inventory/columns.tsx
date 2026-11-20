import I18N from '@/lang/I18N';
import { createTableActionsColumn } from '@/views/energyCarbon/components/TableActions';
import { withTableColumnEmptyRender } from '@/views/energyCarbon/platform/tableColumn';
import { INVENTORY_PERMISSION } from './constant';
import type { InventoryRecord } from './types';

interface Options {
  pageNum: number;
  pageSize: number;
  onEdit: (id: number) => void;
  onDelete: (record: InventoryRecord) => void;
  onView: (id: number) => void;
}
/** 库存列表字段和编辑→删除→查看严格按需求顺序。 */
export function getInventoryColumns(options: Options) {
  return withTableColumnEmptyRender<InventoryRecord>([
    {
      title: I18N.common.table.index,
      key: 'index',
      width: 72,
      fixed: 'left',
      render: (_value, _row, index) =>
        (options.pageNum - 1) * options.pageSize + index + 1,
    },
    {
      title: I18N.energyCarbon.inventoryDocumentNo,
      dataIndex: 'documentNo',
      width: 240,
      ellipsis: true,
    },
    {
      title: I18N.common.fields.organization,
      dataIndex: 'orgName',
      width: 220,
      ellipsis: true,
    },
    { title: I18N.energyCarbon.inventoryYear, dataIndex: 'year', width: 120 },
    {
      title: I18N.energyCarbon.inventoryTime,
      dataIndex: 'inventoryTime',
      width: 200,
      render: value =>
        value ? String(value).replace('T', ' ').slice(0, 16) : '-',
    },
    createTableActionsColumn<InventoryRecord>({
      fixed: 'right',
      title: I18N.energyCarbon.inventoryOperations,
      actions: [
        {
          key: 'edit',
          label: I18N.common.actions.edit,
          permissionKey: INVENTORY_PERMISSION.EDIT,
          onClick: row => options.onEdit(row.id),
        },
        {
          key: 'delete',
          label: I18N.common.actions.delete,
          permissionKey: INVENTORY_PERMISSION.DELETE,
          danger: true,
          onClick: options.onDelete,
        },
        {
          key: 'view',
          label: I18N.common.actions.view,
          permissionKey: INVENTORY_PERMISSION.VIEW,
          onClick: row => options.onView(row.id),
        },
      ],
    }),
  ]);
}
