import { CaretDownFilled } from '@ant-design/icons';
import { type MenuProps, Button, Dropdown, Tooltip } from 'antd';

import I18N from '@/lang/I18N';
import { useLocale } from '@/views/energyCarbon/hooks/useEnergyLocale';
import { useMenuStore } from '@/views/energyCarbon/hooks/useEnergyPermissions';
import { TABLE_EMPTY_TEXT } from '@/views/energyCarbon/platform/tableColumn';

import styles from './index.module.css';
import type { TableActionItem, TableActionsProps } from './types';
import { TABLE_ACTIONS_MAX_INLINE_COUNT } from './width';

function getActionTestId(
  action: TableActionItem,
  testIdPrefix?: string,
  testIdSuffix?: string,
) {
  if (action.testId) return action.testId;
  if (!testIdPrefix) return undefined;
  return [testIdPrefix, action.key, testIdSuffix].filter(Boolean).join('-');
}

export default function TableActions({
  actions,
  testIdPrefix,
  testIdSuffix,
  moreText,
  maxInlineCount = TABLE_ACTIONS_MAX_INLINE_COUNT,
  collapsedInlineCount = maxInlineCount - 1,
  moreTestId,
  emptyText = TABLE_EMPTY_TEXT,
  placement = 'bottomRight',
  ...dropdownProps
}: TableActionsProps) {
  useLocale();
  const permissionKeys = useMenuStore(s => s.permissionKeys);
  const resolvedMoreText = moreText ?? I18N.common.actions.more;
  const visibleActions = actions.filter((action): action is TableActionItem => {
    if (!action || action.hidden) return false;
    return !action.permissionKey || permissionKeys.has(action.permissionKey);
  });

  const showMore = visibleActions.length > maxInlineCount;
  const inlineCount = showMore ? collapsedInlineCount : maxInlineCount;
  const inlineActions = showMore
    ? visibleActions.slice(0, inlineCount)
    : visibleActions;
  const dropdownActions = showMore ? visibleActions.slice(inlineCount) : [];

  if (visibleActions.length === 0) {
    return <span>{emptyText}</span>;
  }

  const renderActionButton = (action: TableActionItem, index: number) => {
    const buttonNode = (
      <Button
        {...action.buttonProps}
        className={styles.actionButton}
        type='link'
        size='small'
        icon={action.icon}
        loading={action.loading}
        danger={action.danger}
        disabled={action.disabled}
        aria-label={
          action.iconOnly && typeof action.label === 'string'
            ? action.label
            : undefined
        }
        data-testid={getActionTestId(action, testIdPrefix, testIdSuffix)}
        onClick={() => {
          action.onClick?.();
        }}
      >
        {action.iconOnly ? null : action.label}
      </Button>
    );

    return (
      <span key={action.key} className={styles.actionItem}>
        {index > 0 ? <span className={styles.divider} /> : null}
        {action.tooltip || action.iconOnly ? (
          <Tooltip title={action.tooltip ?? action.label}>
            <span className={styles.tooltipTarget}>{buttonNode}</span>
          </Tooltip>
        ) : (
          buttonNode
        )}
      </span>
    );
  };

  const dropdownItems: MenuProps['items'] = dropdownActions.map(action => ({
    key: action.key,
    label: action.tooltip ? (
      <Tooltip title={action.tooltip}>
        <span data-testid={getActionTestId(action, testIdPrefix, testIdSuffix)}>
          {action.label}
        </span>
      </Tooltip>
    ) : (
      <span data-testid={getActionTestId(action, testIdPrefix, testIdSuffix)}>
        {action.label}
      </span>
    ),
    icon: action.icon,
    disabled: action.disabled || action.loading,
    danger: action.danger,
  }));

  return (
    <div className={styles.actions} onClick={event => event.stopPropagation()}>
      {inlineActions.map(renderActionButton)}
      {dropdownActions.length > 0 ? (
        <span className={styles.actionItem}>
          {inlineActions.length > 0 ? (
            <span className={styles.divider} />
          ) : null}
          <Dropdown
            {...dropdownProps}
            placement={placement}
            menu={{
              items: dropdownItems,
              onClick: ({ key, domEvent }) => {
                domEvent.preventDefault();
                domEvent.stopPropagation();
                const item = dropdownActions.find(action => action.key === key);
                item?.onClick?.();
              },
            }}
          >
            <Button
              className={styles.moreButton}
              type='link'
              size='small'
              data-testid={
                moreTestId ??
                (testIdPrefix
                  ? [testIdPrefix, 'more', testIdSuffix]
                      .filter(Boolean)
                      .join('-')
                  : undefined)
              }
            >
              {resolvedMoreText}
              <CaretDownFilled />
            </Button>
          </Dropdown>
        </span>
      ) : null}
    </div>
  );
}
