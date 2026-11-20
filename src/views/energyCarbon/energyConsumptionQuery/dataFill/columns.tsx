import { type TableColumnsType, Tag, Typography } from 'antd';

import I18N from '@/lang/I18N';
import TableActions, {
  getTableActionsColumnWidth,
} from '@/views/energyCarbon/components/TableActions';

import {
  ENERGY_CONSUMPTION_BUTTON_PERMISSION,
  ENERGY_CONSUMPTION_STATUS,
  getEnergyConsumptionStatusName,
} from './constant';
import type { EnergyConsumptionRecord } from './types';

interface ColumnOptions {
  page: number;
  pageSize: number;
  records: readonly EnergyConsumptionRecord[];
  permissionKeys: ReadonlySet<string>;
  onEdit: (record: EnergyConsumptionRecord) => void;
  onView: (record: EnergyConsumptionRecord) => void;
  onSubmit: (record: EnergyConsumptionRecord) => void;
  onAudit: (record: EnergyConsumptionRecord) => void;
  onDelete: (record: EnergyConsumptionRecord) => void;
}

/** 状态颜色与生产数据填报保持一致。 */
const STATUS_COLOR: Record<number, string> = {
  [ENERGY_CONSUMPTION_STATUS.DRAFT]: 'default',
  [ENERGY_CONSUMPTION_STATUS.PENDING_AUDIT]: 'processing',
  [ENERGY_CONSUMPTION_STATUS.APPROVED]: 'success',
  [ENERGY_CONSUMPTION_STATUS.REJECTED]: 'error',
};

const getEnergyConsumptionActionsForWidth = () =>
  ({
    view: {
      key: 'view',
      label: I18N.common.actions.view,
      permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.VIEW,
    },
    edit: {
      key: 'edit',
      label: I18N.common.actions.edit,
      permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.EDIT,
    },
    submit: {
      key: 'submit',
      label: I18N.common.shared.submitAudit,
      permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.SUBMIT,
    },
    audit: {
      key: 'audit',
      label: I18N.common.audit.title,
      permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.AUDIT,
    },
    delete: {
      key: 'delete',
      label: I18N.common.actions.delete,
      permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.DELETE,
    },
  } as const);

/** 能耗填报操作严格按四种状态显示，按钮权限由 TableActions 二次过滤。 */
export function getEnergyConsumptionColumns({
  page,
  pageSize,
  records,
  permissionKeys,
  onEdit,
  onView,
  onSubmit,
  onAudit,
  onDelete,
}: ColumnOptions): TableColumnsType<EnergyConsumptionRecord> {
  const actionColumnWidth = records.reduce((maxWidth, record) => {
    const editable =
      record.status === ENERGY_CONSUMPTION_STATUS.DRAFT ||
      record.status === ENERGY_CONSUMPTION_STATUS.REJECTED;
    const pendingAudit =
      record.status === ENERGY_CONSUMPTION_STATUS.PENDING_AUDIT;
    const visibleActions = editable
      ? [
          getEnergyConsumptionActionsForWidth().edit,
          getEnergyConsumptionActionsForWidth().submit,
          getEnergyConsumptionActionsForWidth().delete,
          getEnergyConsumptionActionsForWidth().view,
        ]
      : pendingAudit
      ? [
          getEnergyConsumptionActionsForWidth().audit,
          getEnergyConsumptionActionsForWidth().view,
        ]
      : [
          getEnergyConsumptionActionsForWidth().delete,
          getEnergyConsumptionActionsForWidth().view,
        ];
    return Math.max(
      maxWidth,
      getTableActionsColumnWidth(visibleActions, { permissionKeys }),
    );
  }, getTableActionsColumnWidth([], { permissionKeys }));

  return [
    {
      title: I18N.common.table.index,
      width: 80,
      fixed: 'left',
      render: (_value, _record, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: I18N.energyCarbon.analysisReportNumber,
      dataIndex: 'documentNo',
      width: 180,
      fixed: 'left',
      ellipsis: true,
    },
    {
      title: I18N.common.fields.organization,
      dataIndex: 'orgName',
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
      title: I18N.energyCarbon.energyConsumptionStatisticsTime,
      dataIndex: 'years',
      width: 140,
      render: v => v || '-',
    },
    {
      title: I18N.energyCarbon.analysisTimePeriod,
      dataIndex: 'period',
      width: 220,
      render: v => v || '-',
    },
    {
      title: I18N.energyCarbon.analysisSubmittedBy,
      dataIndex: 'submitByName',
      width: 120,
      render: v => v || '-',
    },
    {
      title: I18N.common.shared.submitTime,
      dataIndex: 'submitTime',
      width: 180,
      render: v => v || '-',
    },
    {
      title: I18N.common.table.status,
      dataIndex: 'status',
      width: 120,
      render: (status: EnergyConsumptionRecord['status']) => (
        <Tag color={STATUS_COLOR[status]}>
          {getEnergyConsumptionStatusName(status)}
        </Tag>
      ),
    },
    {
      title: I18N.common.shared.auditor,
      dataIndex: 'auditByName',
      width: 120,
      render: v => v || '-',
    },
    {
      title: I18N.common.shared.auditTime,
      dataIndex: 'auditTime',
      width: 180,
      render: v => v || '-',
    },
    {
      title: I18N.energyCarbon.actionsColumn,
      key: 'actions',
      width: actionColumnWidth,
      fixed: 'right',
      render: (_value, record) => {
        const editable =
          record.status === ENERGY_CONSUMPTION_STATUS.DRAFT ||
          record.status === ENERGY_CONSUMPTION_STATUS.REJECTED;
        const pendingAudit =
          record.status === ENERGY_CONSUMPTION_STATUS.PENDING_AUDIT;
        const actions = editable
          ? [
              {
                key: 'edit',
                label: I18N.common.actions.edit,
                permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.EDIT,
                onClick: () => onEdit(record),
              },
              {
                key: 'submit',
                label: I18N.common.shared.submitAudit,
                permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.SUBMIT,
                onClick: () => onSubmit(record),
              },
              {
                key: 'delete',
                label: I18N.common.actions.delete,
                danger: true,
                permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.DELETE,
                onClick: () => onDelete(record),
              },
              {
                key: 'view',
                label: I18N.common.actions.view,
                permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.VIEW,
                onClick: () => onView(record),
              },
            ]
          : pendingAudit
          ? [
              {
                key: 'audit',
                label: I18N.common.audit.title,
                permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.AUDIT,
                onClick: () => onAudit(record),
              },
              {
                key: 'view',
                label: I18N.common.actions.view,
                permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.VIEW,
                onClick: () => onView(record),
              },
            ]
          : [
              {
                key: 'delete',
                label: I18N.common.actions.delete,
                danger: true,
                permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.DELETE,
                onClick: () => onDelete(record),
              },
              {
                key: 'view',
                label: I18N.common.actions.view,
                permissionKey: ENERGY_CONSUMPTION_BUTTON_PERMISSION.VIEW,
                onClick: () => onView(record),
              },
            ];
        return (
          <TableActions
            testIdPrefix={`energy-consumption-${record.id}`}
            actions={actions}
          />
        );
      },
    },
  ];
}
