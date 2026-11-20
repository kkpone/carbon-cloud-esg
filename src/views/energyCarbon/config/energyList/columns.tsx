import I18N from '@/lang/I18N';
import { type TableColumnsType, Tag, Typography } from 'antd';

import TableActions, {
  getTableActionsColumnWidth,
} from '@/views/energyCarbon/components/TableActions';
import { confirmDelete } from '@/views/energyCarbon/platform/confirmDelete';
import { withTableColumnEmptyRender } from '@/views/energyCarbon/platform/tableColumn';

import { ENERGY_BUTTON_PERMISSION, getEnergyTypeName } from './constant';
import type { EnergyRecord } from './types';

interface ColumnOptions {
  page: number;
  pageSize: number;
  permissionKeys: ReadonlySet<string>;
  onEdit: (record: EnergyRecord) => void;
  onView: (record: EnergyRecord) => void;
  onDelete: (record: EnergyRecord) => Promise<void>;
}

/** 操作列宽度只统计当前角色可见按钮，避免无权限按钮仍占用空白宽度。 */
const getActionsForWidth = () =>
  [
    {
      key: 'edit',
      label: I18N.common.actions.edit,
      permissionKey: ENERGY_BUTTON_PERMISSION.EDIT,
    },
    {
      key: 'delete',
      label: I18N.common.actions.delete,
      permissionKey: ENERGY_BUTTON_PERMISSION.DELETE,
    },
    {
      key: 'view',
      label: I18N.common.actions.view,
      permissionKey: ENERGY_BUTTON_PERMISSION.VIEW,
    },
  ] as const;

/** 能源列表列，包含最终业务字段、审计字段和操作。 */
export function getEnergyColumns({
  page,
  pageSize,
  permissionKeys,
  onEdit,
  onView,
  onDelete,
}: ColumnOptions): TableColumnsType<EnergyRecord> {
  // 使用与实际渲染一致的权限集合计算宽度，按钮数量变化时右侧固定列仍紧凑。
  const actionColumnWidth = getTableActionsColumnWidth(getActionsForWidth(), {
    permissionKeys,
  });

  return withTableColumnEmptyRender<EnergyRecord>([
    {
      title: I18N.common.table.index,
      key: 'serial',
      width: 80,
      fixed: 'left',
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: I18N.energyCarbon.energyName,
      dataIndex: 'energyName',
      key: 'energyName',
      width: 180,
      ellipsis: { showTitle: false },
      fixed: 'left',
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
      title: I18N.energyCarbon.measurementUnit,
      dataIndex: 'unitName',
      key: 'unitName',
      width: 140,
      ellipsis: true,
    },
    {
      title: I18N.common.shared.category,
      dataIndex: 'energyType',
      key: 'energyType',
      width: 120,
      render: value => getEnergyTypeName(value),
    },
    {
      title: I18N.energyCarbon.cfgCoalCoefficient,
      dataIndex: 'coalCoefficient',
      key: 'coalCoefficient',
      width: 230,
    },
    {
      title: I18N.energyCarbon.cfgCleanEnergy,
      dataIndex: 'cleanEnergy',
      key: 'cleanEnergy',
      width: 110,
      render: value => (
        <Tag color={value ? 'green' : 'default'}>
          {value ? I18N.common.answers.yes : I18N.common.answers.no}
        </Tag>
      ),
    },
    {
      title: I18N.energyCarbon.cfgRenewableEnergy,
      dataIndex: 'renewableEnergy',
      key: 'renewableEnergy',
      width: 120,
      render: value => (
        <Tag color={value ? 'green' : 'default'}>
          {value ? I18N.common.answers.yes : I18N.common.answers.no}
        </Tag>
      ),
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
      width: actionColumnWidth,
      fixed: 'right',
      render: (_, record) => (
        <TableActions
          actions={[
            {
              key: 'edit',
              label: I18N.common.actions.edit,
              permissionKey: ENERGY_BUTTON_PERMISSION.EDIT,
              testId: `energy-list-edit-${record.id}`,
              onClick: () => onEdit(record),
            },
            {
              key: 'delete',
              label: I18N.common.actions.delete,
              permissionKey: ENERGY_BUTTON_PERMISSION.DELETE,
              danger: true,
              testId: `energy-list-delete-${record.id}`,
              onClick: () =>
                confirmDelete({
                  itemName: I18N.energyCarbon.cfgEnergy,
                  itemValue: record.energyName,
                  onOk: () => onDelete(record),
                }),
            },
            {
              key: 'view',
              label: I18N.common.actions.view,
              permissionKey: ENERGY_BUTTON_PERMISSION.VIEW,
              testId: `energy-list-view-${record.id}`,
              onClick: () => onView(record),
            },
          ]}
        />
      ),
    },
  ]);
}
