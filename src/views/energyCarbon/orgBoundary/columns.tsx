import I18N from '@/lang/I18N';
import { type TableColumnsType, Typography } from 'antd';

import TableActions, {
  getTableActionsColumnWidth,
} from '@/views/energyCarbon/components/TableActions';
import { confirmDelete } from '@/views/energyCarbon/platform/confirmDelete';
import { withTableColumnEmptyRender } from '@/views/energyCarbon/platform/tableColumn';

import { ORG_BOUNDARY_BUTTON_PERMISSION } from './constant';
import type { OrgBoundaryRecord } from './types';

interface ColumnOptions {
  disabled: boolean;
  permissionKeys: ReadonlySet<string>;
  onEdit: (record: OrgBoundaryRecord) => void;
  onView: (record: OrgBoundaryRecord) => void;
  onDelete: (record: OrgBoundaryRecord) => Promise<void>;
}

/** 操作列宽度只统计当前角色可见按钮，停用组织仍保留禁用按钮的布局位置。 */
const getActionsForWidth = () =>
  [
    {
      key: 'edit',
      label: I18N.common.actions.edit,
      permissionKey: ORG_BOUNDARY_BUTTON_PERMISSION.EDIT,
    },
    {
      key: 'delete',
      label: I18N.common.actions.delete,
      permissionKey: ORG_BOUNDARY_BUTTON_PERMISSION.DELETE,
    },
    {
      key: 'view',
      label: I18N.common.actions.view,
      permissionKey: ORG_BOUNDARY_BUTTON_PERMISSION.VIEW,
    },
  ] as const;

/** 组织边界表格列，字段顺序固定为名称、简称、编码、操作栏。 */
export function getOrgBoundaryColumns({
  disabled,
  permissionKeys,
  onEdit,
  onView,
  onDelete,
}: ColumnOptions): TableColumnsType<OrgBoundaryRecord> {
  // 使用与实际渲染一致的权限集合计算宽度，按钮数量变化时右侧固定列仍紧凑。
  const actionColumnWidth = getTableActionsColumnWidth(getActionsForWidth(), {
    permissionKeys,
  });

  return withTableColumnEmptyRender<OrgBoundaryRecord>([
    {
      title: I18N.energyCarbon.energyFormBoundary,
      dataIndex: 'boundaryName',
      key: 'boundaryName',
      width: 220,
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
      title: I18N.energyCarbon.cfgBoundaryAbbr,
      dataIndex: 'boundaryAbbr',
      key: 'boundaryAbbr',
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
      title: I18N.energyCarbon.cfgBoundaryCode,
      dataIndex: 'boundaryCode',
      key: 'boundaryCode',
      width: 180,
      ellipsis: true,
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
              permissionKey: ORG_BOUNDARY_BUTTON_PERMISSION.EDIT,
              disabled,
              testId: `org-boundary-edit-${record.id}`,
              onClick: () => onEdit(record),
            },
            {
              key: 'delete',
              label: I18N.common.actions.delete,
              permissionKey: ORG_BOUNDARY_BUTTON_PERMISSION.DELETE,
              danger: true,
              disabled,
              testId: `org-boundary-delete-${record.id}`,
              onClick: () =>
                confirmDelete({
                  itemName: I18N.energyCarbon.cfgBoundary,
                  itemValue: record.boundaryName,
                  onOk: () => onDelete(record),
                }),
            },
            {
              key: 'view',
              label: I18N.common.actions.view,
              permissionKey: ORG_BOUNDARY_BUTTON_PERMISSION.VIEW,
              disabled,
              testId: `org-boundary-view-${record.id}`,
              onClick: () => onView(record),
            },
          ]}
        />
      ),
    },
  ]);
}
