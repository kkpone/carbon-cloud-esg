import type { TableColumnType } from 'antd';

import I18N from '@/lang/I18N';
import { TABLE_EMPTY_TEXT } from '@/views/energyCarbon/platform/tableColumn';

import TableActions from './TableActions';
import type {
  TableActionDefinition,
  TableActionDefinitionInput,
  TableActionItem,
  TableActionValue,
  TableActionsColumnOptions,
} from './types';
import {
  TABLE_ACTIONS_MAX_INLINE_COUNT,
  getTableActionDefinitionsColumnWidth,
} from './width';

function resolveValue<T, V>(
  value: TableActionValue<T, V> | undefined,
  record: T,
  index: number,
) {
  return typeof value === 'function'
    ? (value as (record: T, index: number) => V)(record, index)
    : value;
}

function normalizeDefinitions<T>(
  actions: readonly TableActionDefinitionInput<T>[],
) {
  return actions.filter((action): action is TableActionDefinition<T> =>
    Boolean(action && action.hidden !== true),
  );
}

function resolveAction<T>(
  definition: TableActionDefinition<T>,
  record: T,
  index: number,
): TableActionItem {
  const label = resolveValue(definition.label, record, index);

  return {
    key: definition.key,
    label,
    permissionKey: definition.permissionKey,
    hidden: resolveValue(definition.hidden, record, index),
    disabled: resolveValue(definition.disabled, record, index),
    loading: resolveValue(definition.loading, record, index),
    danger: resolveValue(definition.danger, record, index),
    tooltip: resolveValue(definition.tooltip, record, index),
    icon: definition.icon,
    iconOnly: definition.iconOnly,
    testId: resolveValue(definition.testId, record, index),
    buttonProps: definition.buttonProps,
    onClick: () => definition.onClick?.(record, index),
  };
}

/** 创建自动计算宽度并按行解析操作项的表格操作列。 */
export function createTableActionsColumn<T>({
  actions,
  testIdPrefix,
  testIdSuffix,
  moreText = I18N.common.actions.more,
  maxInlineCount = TABLE_ACTIONS_MAX_INLINE_COUNT,
  collapsedInlineCount = maxInlineCount - 1,
  moreTestId,
  minWidth,
  emptyText = TABLE_EMPTY_TEXT,
  rowHidden,
  dropdownProps,
  title = I18N.common.table.action,
  ...columnProps
}: TableActionsColumnOptions<T>): TableColumnType<T> {
  const definitions = normalizeDefinitions(actions);
  const width = getTableActionDefinitionsColumnWidth(definitions, {
    moreText,
    maxInlineCount,
    collapsedInlineCount,
    minWidth,
  });

  return {
    ...columnProps,
    title,
    key: 'action',
    width,
    render: (_, record, index) => {
      if (resolveValue(rowHidden, record, index)) {
        return emptyText;
      }

      return (
        <TableActions
          {...dropdownProps}
          actions={definitions.map(definition =>
            resolveAction(definition, record, index),
          )}
          testIdPrefix={resolveValue(testIdPrefix, record, index)}
          testIdSuffix={resolveValue(testIdSuffix, record, index)}
          moreText={moreText}
          maxInlineCount={maxInlineCount}
          collapsedInlineCount={collapsedInlineCount}
          moreTestId={resolveValue(moreTestId, record, index)}
          emptyText={emptyText}
        />
      );
    },
  };
}
