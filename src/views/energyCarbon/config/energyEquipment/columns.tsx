import { type TableColumnsType, Tag, Typography } from 'antd';

import I18N from '@/lang/I18N';
import TableActions, {
  getTableActionsColumnWidth,
} from '@/views/energyCarbon/components/TableActions';
import { confirmDelete } from '@/views/energyCarbon/platform/confirmDelete';
import { withTableColumnEmptyRender } from '@/views/energyCarbon/platform/tableColumn';

import { ENERGY_EQUIPMENT_BUTTON_PERMISSION } from './constant';
import type { EnergyEquipmentRecord } from './types';

interface ColumnOptions {
  page: number;
  pageSize: number;
  permissionKeys: ReadonlySet<string>;
  onView: (record: EnergyEquipmentRecord) => void;
  onEdit: (record: EnergyEquipmentRecord) => void;
  onDelete: (record: EnergyEquipmentRecord) => Promise<void>;
}

/** 操作列宽度只统计当前角色可见按钮，避免无权限按钮仍占用空白宽度。 */
const getActionsForWidth = () =>
  [
    {
      key: 'edit',
      label: I18N.common.actions.edit,
      permissionKey: ENERGY_EQUIPMENT_BUTTON_PERMISSION.EDIT,
    },
    {
      key: 'delete',
      label: I18N.common.actions.delete,
      permissionKey: ENERGY_EQUIPMENT_BUTTON_PERMISSION.DELETE,
    },
    {
      key: 'view',
      label: I18N.common.actions.view,
      permissionKey: ENERGY_EQUIPMENT_BUTTON_PERMISSION.VIEW,
    },
  ] as const;

/** 用能设备列表列，保留核心设备信息、审计字段和操作。 */
export function getEnergyEquipmentColumns({
  page,
  pageSize,
  permissionKeys,
  onView,
  onEdit,
  onDelete,
}: ColumnOptions): TableColumnsType<EnergyEquipmentRecord> {
  // 使用与实际渲染一致的权限集合计算宽度，按钮数量变化时右侧固定列仍紧凑。
  const actionColumnWidth = getTableActionsColumnWidth(getActionsForWidth(), {
    permissionKeys,
  });

  return withTableColumnEmptyRender<EnergyEquipmentRecord>([
    {
      title: I18N.common.table.index,
      key: 'serial',
      width: 80,
      fixed: 'left',
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: I18N.energyCarbon.cfgEquipmentName,
      dataIndex: 'equipmentName',
      key: 'equipmentName',
      width: 180,
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
      title: I18N.energyCarbon.cfgEquipmentCode,
      dataIndex: 'equipmentCode',
      key: 'equipmentCode',
      width: 160,
      ellipsis: true,
    },
    // 组织名称按需求放在编号之后，直接使用后端返回的全称，缺失时统一降级为短横线。
    {
      title: I18N.common.fields.organization,
      dataIndex: 'orgName',
      key: 'orgName',
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
      title: I18N.energyCarbon.cfgEquipmentModel,
      dataIndex: 'equipmentModel',
      key: 'equipmentModel',
      width: 160,
      ellipsis: true,
    },
    {
      title: I18N.energyCarbon.cfgTechnicalParameters,
      dataIndex: 'technicalParameters',
      key: 'technicalParameters',
      width: 240,
      ellipsis: true,
    },
    {
      title: I18N.energyCarbon.cfgKeyEquipment,
      dataIndex: 'keyEnergyEquipment',
      key: 'keyEnergyEquipment',
      width: 140,
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
              permissionKey: ENERGY_EQUIPMENT_BUTTON_PERMISSION.EDIT,
              testId: `energy-equipment-edit-${record.id}`,
              onClick: () => onEdit(record),
            },
            {
              key: 'delete',
              label: I18N.common.actions.delete,
              permissionKey: ENERGY_EQUIPMENT_BUTTON_PERMISSION.DELETE,
              danger: true,
              testId: `energy-equipment-delete-${record.id}`,
              onClick: () =>
                confirmDelete({
                  itemName: I18N.energyCarbon.energyEquipment,
                  itemValue: record.equipmentName,
                  onOk: () => onDelete(record),
                }),
            },
            {
              key: 'view',
              label: I18N.common.actions.view,
              permissionKey: ENERGY_EQUIPMENT_BUTTON_PERMISSION.VIEW,
              testId: `energy-equipment-view-${record.id}`,
              onClick: () => onView(record),
            },
          ]}
        />
      ),
    },
  ]);
}
