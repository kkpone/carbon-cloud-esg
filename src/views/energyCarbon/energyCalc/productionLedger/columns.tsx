import I18N from '@/lang/I18N';
import { type TableColumnsType, Typography } from 'antd';

import TableActions, {
  getTableActionsColumnWidth,
} from '@/views/energyCarbon/components/TableActions';

import { formatDecimalValue } from '../../utils';
import { PRODUCTION_LEDGER_BUTTON_PERMISSION } from './constant';
import type { ProductionLedgerRecord } from './types';

const getProductionLedgerActionsForWidth = () =>
  [
    {
      key: 'view',
      label: I18N.common.actions.view,
      permissionKey: PRODUCTION_LEDGER_BUTTON_PERMISSION.DETAIL,
    },
  ] as const;

/** 生产台账列表仅提供查看入口。 */
export function getProductionLedgerColumns(
  page: number,
  pageSize: number,
  permissionKeys: ReadonlySet<string>,
  onView: (record: ProductionLedgerRecord) => void,
): TableColumnsType<ProductionLedgerRecord> {
  const actionColumnWidth = getTableActionsColumnWidth(
    getProductionLedgerActionsForWidth(),
    { permissionKeys },
  );

  return [
    {
      title: I18N.common.table.index,
      width: 80,
      fixed: 'left',
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: I18N.energyCarbon.analysisDate,
      dataIndex: 'ledgerMonth',
      width: 120,
      fixed: 'left',
    },
    {
      title: I18N.energyCarbon.analysisProductionIndicator,
      dataIndex: 'indicatorName',
      width: 180,
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
      width: 180,
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
      title: I18N.common.fields.quantity,
      dataIndex: 'quantity',
      width: 160,
      render: value => formatDecimalValue(value, 4),
    },
    {
      title: I18N.energyCarbon.analysisQuantityUnit,
      dataIndex: 'unitName',
      width: 140,
      render: value => value || '-',
    },
    {
      title: I18N.energyCarbon.actionsColumn,
      key: 'actions',
      width: actionColumnWidth,
      fixed: 'right',
      render: (_value, record) => (
        <TableActions
          testIdPrefix={`production-ledger-${record.id}`}
          actions={[
            {
              key: 'view',
              label: I18N.common.actions.view,
              permissionKey: PRODUCTION_LEDGER_BUTTON_PERMISSION.DETAIL,
              onClick: () => onView(record),
            },
          ]}
        />
      ),
    },
  ];
}
