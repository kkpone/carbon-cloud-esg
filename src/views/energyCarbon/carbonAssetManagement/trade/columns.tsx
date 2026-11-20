import I18N from '@/lang/I18N';
import { type TableColumnsType, Typography } from 'antd';

import TableActions, {
  getTableActionsColumnWidth,
  type TableActionItem,
} from '@/views/energyCarbon/components/TableActions';
import { confirmDelete } from '@/views/energyCarbon/platform/confirmDelete';
import { withTableColumnEmptyRender } from '@/views/energyCarbon/platform/tableColumn';

import { CARBON_TRADE_BUTTON_PERMISSION } from './constant';
import type { CarbonTradeRecord } from './types';

interface ColumnOptions {
  page: number;
  pageSize: number;
  permissionKeys: ReadonlySet<string>;
  onEdit: (record: CarbonTradeRecord) => void;
  onDetail: (record: CarbonTradeRecord) => void;
  onDelete: (record: CarbonTradeRecord) => Promise<void>;
}

/** 为单行生成编辑、删除、详情操作，顺序与权限配置一致。 */
function rowActions(
  record: CarbonTradeRecord,
  options: Pick<ColumnOptions, 'onEdit' | 'onDetail' | 'onDelete'>,
): TableActionItem[] {
  return [
    {
      key: 'edit',
      label: I18N.common.actions.edit,
      permissionKey: CARBON_TRADE_BUTTON_PERMISSION.EDIT,
      testId: `carbon-trade-edit-${record.id}`,
      onClick: () => options.onEdit(record),
    },
    {
      key: 'delete',
      label: I18N.common.actions.delete,
      danger: true,
      permissionKey: CARBON_TRADE_BUTTON_PERMISSION.DELETE,
      testId: `carbon-trade-delete-${record.id}`,
      onClick: () =>
        confirmDelete({
          itemName: I18N.energyCarbon.assetCarbonTrade,
          itemValue: record.documentNo,
          onOk: () => options.onDelete(record),
        }),
    },
    {
      key: 'detail',
      label: I18N.common.actions.view,
      permissionKey: CARBON_TRADE_BUTTON_PERMISSION.DETAIL,
      testId: `carbon-trade-detail-${record.id}`,
      onClick: () => options.onDetail(record),
    },
  ];
}

export function getCarbonTradeColumns(
  options: ColumnOptions,
): TableColumnsType<CarbonTradeRecord> {
  const widthActions = rowActions(
    {
      id: 0,
      carbonAsset: 1,
      carbonAssetName: '',
      orgId: 0,
      orgName: '',
      tradeType: 101,
      tradeTypeName: '',
      documentNo: '',
      quantity: '',
      tradeDate: '',
    },
    options,
  );
  return withTableColumnEmptyRender<CarbonTradeRecord>([
    {
      title: I18N.common.table.index,
      key: 'serial',
      width: 80,
      fixed: 'left',
      render: (_, __, index) =>
        (options.page - 1) * options.pageSize + index + 1,
    },
    {
      title: I18N.energyCarbon.assetCarbonAsset,
      dataIndex: 'carbonAssetName',
      key: 'carbonAssetName',
      width: 100,
      fixed: 'left',
      ellipsis: { showTitle: false },
      render: value => {
        const displayValue = value || '-';
        return (
          <Typography.Text ellipsis={{ tooltip: displayValue }}>
            {displayValue}
          </Typography.Text>
        );
      },
    },
    {
      title: I18N.common.fields.organization,
      dataIndex: 'orgName',
      key: 'orgName',
      width: 220,
      ellipsis: { showTitle: false },
      render: value => {
        const displayValue = value || '-';
        return (
          <Typography.Text ellipsis={{ tooltip: displayValue }}>
            {displayValue}
          </Typography.Text>
        );
      },
    },
    {
      title: I18N.energyCarbon.assetTradeType,
      dataIndex: 'tradeTypeName',
      key: 'tradeTypeName',
      width: 190,
      ellipsis: true,
    },
    {
      title: I18N.energyCarbon.tradeVoucher,
      dataIndex: 'documentNo',
      key: 'documentNo',
      width: 190,
      ellipsis: true,
    },
    {
      title: I18N.energyCarbon.assetTradeVolume,
      dataIndex: 'quantity',
      key: 'quantity',
      width: 160,
    },
    {
      title: I18N.energyCarbon.assetTradeDate,
      dataIndex: 'tradeDate',
      key: 'tradeDate',
      width: 130,
    },
    {
      title: I18N.common.table.updateBy,
      dataIndex: 'updateByName',
      key: 'updateByName',
      width: 130,
    },
    {
      title: I18N.common.table.updateTime,
      dataIndex: 'updateTime',
      key: 'updateTime',
      width: 180,
    },
    {
      title: I18N.energyCarbon.actionsColumn,
      key: 'action',
      fixed: 'right',
      width: getTableActionsColumnWidth(widthActions, {
        permissionKeys: options.permissionKeys,
      }),
      render: (_, record) => (
        <TableActions
          actions={rowActions(record, options)}
          testIdPrefix={`carbon-trade-action-${record.id}`}
        />
      ),
    },
  ]);
}
