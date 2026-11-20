import I18N from '@/lang/I18N';
import { type TableColumnsType, Typography } from 'antd';

import TableActions, {
  getTableActionsColumnWidth,
} from '@/views/energyCarbon/components/TableActions';

import { formatDecimalValue } from '../../utils';
import { getEnergyConsumptionDataTypeName } from '../dataFill/constant';
import { ENERGY_LEDGER_BUTTON_PERMISSION } from './constant';
import type { EnergyLedgerRecord } from './types';

const getEnergyLedgerActionsForWidth = () =>
  [
    {
      key: 'view',
      label: I18N.common.actions.view,
      permissionKey: ENERGY_LEDGER_BUTTON_PERMISSION.VIEW,
    },
  ] as const;

/** 逐日台账列只提供详情入口，不提供编辑或删除。 */
export function getEnergyLedgerColumns(
  page: number,
  pageSize: number,
  permissionKeys: ReadonlySet<string>,
  onView: (record: EnergyLedgerRecord) => void,
): TableColumnsType<EnergyLedgerRecord> {
  const actionColumnWidth = getTableActionsColumnWidth(
    getEnergyLedgerActionsForWidth(),
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
      dataIndex: 'ledgerDate',
      width: 120,
      fixed: 'left',
    },
    {
      title: I18N.energyCarbon.energyName,
      dataIndex: 'energyName',
      width: 160,
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
      width: 140,
      render: value => formatDecimalValue(value, 3),
    },
    {
      title: I18N.energyCarbon.analysisQuantityUnit,
      dataIndex: 'unitName',
      width: 120,
    },
    {
      title: I18N.energyCarbon.analysisStatisticsBoundary,
      dataIndex: 'boundaryName',
      width: 160,
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
      title: I18N.common.fields.dataType,
      dataIndex: 'dataType',
      width: 140,
      render: getEnergyConsumptionDataTypeName,
    },
    {
      title: I18N.energyCarbon.actionsColumn,
      key: 'actions',
      width: actionColumnWidth,
      fixed: 'right',
      render: (_value, record) => (
        <TableActions
          testIdPrefix={`energy-ledger-${record.id}`}
          actions={[
            {
              key: 'view',
              label: I18N.common.actions.view,
              permissionKey: ENERGY_LEDGER_BUTTON_PERMISSION.VIEW,
              onClick: () => onView(record),
            },
          ]}
        />
      ),
    },
  ];
}
