import I18N from '@/lang/I18N';
import { type TableColumnsType, Tag, Typography } from 'antd';

import TableActions, {
  getTableActionsColumnWidth,
} from '@/views/energyCarbon/components/TableActions';

import {
  PRODUCTION_DATA_BUTTON_PERMISSION,
  PRODUCTION_STATUS,
  getProductionStatusName,
} from './constant';
import type { ProductionDataRecord } from './types';

interface ColumnOptions {
  page: number;
  pageSize: number;
  records: readonly ProductionDataRecord[];
  permissionKeys: ReadonlySet<string>;
  onEdit: (record: ProductionDataRecord) => void;
  onView: (record: ProductionDataRecord) => void;
  onSubmit: (record: ProductionDataRecord) => void;
  onAudit: (record: ProductionDataRecord) => void;
  onDelete: (record: ProductionDataRecord) => void;
}

const STATUS_COLOR: Record<number, string> = {
  [PRODUCTION_STATUS.DRAFT]: 'default',
  [PRODUCTION_STATUS.PENDING_AUDIT]: 'processing',
  [PRODUCTION_STATUS.APPROVED]: 'success',
  [PRODUCTION_STATUS.REJECTED]: 'error',
};

const getProductionDataActionsForWidth = () =>
  ({
    edit: {
      key: 'edit',
      label: I18N.common.actions.edit,
      permissionKey: PRODUCTION_DATA_BUTTON_PERMISSION.EDIT,
    },
    submit: {
      key: 'submit',
      label: I18N.common.shared.submitAudit,
      permissionKey: PRODUCTION_DATA_BUTTON_PERMISSION.SUBMIT,
    },
    audit: {
      key: 'audit',
      label: I18N.common.audit.title,
      permissionKey: PRODUCTION_DATA_BUTTON_PERMISSION.AUDIT,
    },
    delete: {
      key: 'delete',
      label: I18N.common.actions.delete,
      permissionKey: PRODUCTION_DATA_BUTTON_PERMISSION.DELETE,
    },
    view: {
      key: 'view',
      label: I18N.common.actions.view,
      permissionKey: PRODUCTION_DATA_BUTTON_PERMISSION.DETAIL,
    },
  } as const);

/** 生产数据操作栏严格按状态矩阵和按钮权限展示。 */
export function getProductionDataColumns({
  page,
  pageSize,
  records,
  permissionKeys,
  onEdit,
  onView,
  onSubmit,
  onAudit,
  onDelete,
}: ColumnOptions): TableColumnsType<ProductionDataRecord> {
  const actionColumnWidth = records.reduce((maxWidth, record) => {
    const editable =
      record.status === PRODUCTION_STATUS.DRAFT ||
      record.status === PRODUCTION_STATUS.REJECTED;
    const pendingAudit = record.status === PRODUCTION_STATUS.PENDING_AUDIT;
    return Math.max(
      maxWidth,
      getTableActionsColumnWidth(
        [
          editable && getProductionDataActionsForWidth().edit,
          editable && getProductionDataActionsForWidth().submit,
          pendingAudit && getProductionDataActionsForWidth().audit,
          !pendingAudit && getProductionDataActionsForWidth().delete,
          getProductionDataActionsForWidth().view,
        ],
        { permissionKeys },
      ),
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
      width: 210,
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
      title: I18N.energyCarbon.analysisStatisticsYear,
      dataIndex: 'statisticalYears',
      width: 120,
      render: value => value || '-',
    },
    {
      title: I18N.energyCarbon.analysisTimePeriod,
      dataIndex: 'period',
      width: 190,
      render: value => value || '-',
    },
    {
      title: I18N.energyCarbon.analysisSubmittedBy,
      dataIndex: 'submitByName',
      width: 120,
      render: value => value || '-',
    },
    {
      title: I18N.common.shared.submitTime,
      dataIndex: 'submitTime',
      width: 180,
      render: value => value || '-',
    },
    {
      title: I18N.common.table.status,
      dataIndex: 'status',
      width: 120,
      render: (status: ProductionDataRecord['status']) => (
        <Tag color={STATUS_COLOR[status]}>
          {getProductionStatusName(status)}
        </Tag>
      ),
    },
    {
      title: I18N.common.shared.auditor,
      dataIndex: 'auditByName',
      width: 120,
      render: value => value || '-',
    },
    {
      title: I18N.common.shared.auditTime,
      dataIndex: 'auditTime',
      width: 180,
      render: value => value || '-',
    },
    {
      title: I18N.energyCarbon.actionsColumn,
      key: 'actions',
      width: actionColumnWidth,
      fixed: 'right',
      render: (_value, record) => (
        <TableActions
          testIdPrefix={`production-data-${record.id}`}
          actions={[
            {
              key: 'edit',
              label: I18N.common.actions.edit,
              permissionKey: PRODUCTION_DATA_BUTTON_PERMISSION.EDIT,
              hidden:
                record.status !== PRODUCTION_STATUS.DRAFT &&
                record.status !== PRODUCTION_STATUS.REJECTED,
              onClick: () => onEdit(record),
            },
            {
              key: 'submit',
              label: I18N.common.shared.submitAudit,
              permissionKey: PRODUCTION_DATA_BUTTON_PERMISSION.SUBMIT,
              hidden:
                record.status !== PRODUCTION_STATUS.DRAFT &&
                record.status !== PRODUCTION_STATUS.REJECTED,
              onClick: () => onSubmit(record),
            },
            {
              key: 'audit',
              label: I18N.common.audit.title,
              permissionKey: PRODUCTION_DATA_BUTTON_PERMISSION.AUDIT,
              hidden: record.status !== PRODUCTION_STATUS.PENDING_AUDIT,
              onClick: () => onAudit(record),
            },
            {
              key: 'delete',
              label: I18N.common.actions.delete,
              danger: true,
              permissionKey: PRODUCTION_DATA_BUTTON_PERMISSION.DELETE,
              hidden: record.status === PRODUCTION_STATUS.PENDING_AUDIT,
              onClick: () => onDelete(record),
            },
            {
              key: 'view',
              label: I18N.common.actions.view,
              permissionKey: PRODUCTION_DATA_BUTTON_PERMISSION.DETAIL,
              onClick: () => onView(record),
            },
          ]}
        />
      ),
    },
  ];
}
