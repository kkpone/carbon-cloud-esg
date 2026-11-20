import { type TableColumnsType, Typography } from 'antd';

import I18N from '@/lang/I18N';
import TableActions, {
  getTableActionsColumnWidth,
} from '@/views/energyCarbon/components/TableActions';
import { confirmDelete } from '@/views/energyCarbon/platform/confirmDelete';
import { withTableColumnEmptyRender } from '@/views/energyCarbon/platform/tableColumn';

import { MEASURING_INSTRUMENT_BUTTON_PERMISSION } from './constant';
import type { MeasuringInstrumentRecord } from './types';

interface ColumnOptions {
  page: number;
  pageSize: number;
  permissionKeys: ReadonlySet<string>;
  onEdit: (record: MeasuringInstrumentRecord) => void;
  onView: (record: MeasuringInstrumentRecord) => void;
  onDelete: (record: MeasuringInstrumentRecord) => Promise<void>;
}

/** 操作列宽度只统计当前角色可见按钮，避免无权限按钮仍占用空白宽度。 */
const getActionsForWidth = () =>
  [
    {
      key: 'edit',
      label: I18N.common.actions.edit,
      permissionKey: MEASURING_INSTRUMENT_BUTTON_PERMISSION.EDIT,
    },
    {
      key: 'delete',
      label: I18N.common.actions.delete,
      permissionKey: MEASURING_INSTRUMENT_BUTTON_PERMISSION.DELETE,
    },
    {
      key: 'view',
      label: I18N.common.actions.view,
      permissionKey: MEASURING_INSTRUMENT_BUTTON_PERMISSION.VIEW,
    },
  ] as const;

/** 计量器具列表列，保留核心器具信息、审计字段和操作。 */
export function getMeasuringInstrumentColumns({
  page,
  pageSize,
  permissionKeys,
  onEdit,
  onView,
  onDelete,
}: ColumnOptions): TableColumnsType<MeasuringInstrumentRecord> {
  // 使用与实际渲染一致的权限集合计算宽度，按钮数量变化时右侧固定列仍紧凑。
  const actionColumnWidth = getTableActionsColumnWidth(getActionsForWidth(), {
    permissionKeys,
  });

  return withTableColumnEmptyRender<MeasuringInstrumentRecord>([
    {
      title: I18N.common.table.index,
      key: 'serial',
      width: 80,
      fixed: 'left',
      render: (_, __, index) => (page - 1) * pageSize + index + 1,
    },
    {
      title: I18N.energyCarbon.cfgInstrumentName,
      dataIndex: 'instrumentName',
      key: 'instrumentName',
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
      title: I18N.energyCarbon.cfgInstrumentCode,
      dataIndex: 'instrumentCode',
      key: 'instrumentCode',
      width: 180,
      ellipsis: true,
    },
    {
      // 组织名称按需求放在编号之后，直接使用后端返回的全称，缺失时统一降级为短横线。
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
      title: I18N.energyCarbon.cfgSpecification,
      dataIndex: 'specification',
      key: 'specification',
      width: 150,
      ellipsis: true,
    },
    {
      title: I18N.energyCarbon.cfgModel,
      dataIndex: 'model',
      key: 'model',
      width: 150,
      ellipsis: true,
    },
    {
      title: I18N.energyCarbon.cfgMeasuredEnergy,
      dataIndex: 'energyName',
      key: 'energyName',
      width: 160,
      ellipsis: { showTitle: false },
      render: value => {
        const displayValue = value || I18N.energyCarbon.cfgEnergyUnavailable;
        return (
          <Typography.Text ellipsis={{ tooltip: displayValue }}>
            {displayValue}
          </Typography.Text>
        );
      },
    },
    {
      title: I18N.energyCarbon.cfgManufacturer,
      dataIndex: 'manufacturer',
      key: 'manufacturer',
      width: 180,
      ellipsis: true,
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
              permissionKey: MEASURING_INSTRUMENT_BUTTON_PERMISSION.EDIT,
              testId: `measuring-instrument-edit-${record.id}`,
              onClick: () => onEdit(record),
            },
            {
              key: 'delete',
              label: I18N.common.actions.delete,
              permissionKey: MEASURING_INSTRUMENT_BUTTON_PERMISSION.DELETE,
              danger: true,
              testId: `measuring-instrument-delete-${record.id}`,
              onClick: () =>
                confirmDelete({
                  itemName: I18N.energyCarbon.measuringInstrument,
                  itemValue: `${record.instrumentName}（${record.instrumentCode}）`,
                  onOk: () => onDelete(record),
                }),
            },
            {
              key: 'view',
              label: I18N.common.actions.view,
              permissionKey: MEASURING_INSTRUMENT_BUTTON_PERMISSION.VIEW,
              testId: `measuring-instrument-view-${record.id}`,
              onClick: () => onView(record),
            },
          ]}
        />
      ),
    },
  ]);
}
