import I18N from '@/lang/I18N';

import type {
  TableActionDefinition,
  TableActionDefinitionInput,
  TableActionItem,
  TableActionItemInput,
  TableActionsWidthOptions,
} from './types';

export const TABLE_ACTIONS_MAX_INLINE_COUNT = 4;

const ACTION_BUTTON_MIN_WIDTH = 30;
const ACTION_MORE_ICON_WIDTH = 12;
const ACTION_MORE_ICON_GAP = 4;
const ACTION_DIVIDER_WIDTH = 17;
const ACTION_CELL_HORIZONTAL_PADDING = 32;
const ACTION_COLUMN_WIDTH_BUFFER = 2;
const ACTION_COLUMN_MIN_WIDTH = 80;

function getTextWidth(text: string) {
  return Array.from(text).reduce((width, char) => {
    if (/[\u2e80-\u9fff\uf900-\ufaff]/u.test(char)) {
      return width + 15;
    }
    if (/\s/u.test(char)) {
      return width + 4;
    }
    return width + 7;
  }, 0);
}

function getButtonWidth(text: string, hasIcon = false, iconOnly = false) {
  if (iconOnly) return ACTION_BUTTON_MIN_WIDTH;

  const textWidth = Math.max(getTextWidth(text), ACTION_BUTTON_MIN_WIDTH);
  return hasIcon
    ? textWidth + ACTION_MORE_ICON_GAP + ACTION_MORE_ICON_WIDTH
    : textWidth;
}

function getContentWidth(actionWidths: readonly number[]) {
  if (actionWidths.length === 0) return 0;

  const dividerWidth =
    Math.max(actionWidths.length - 1, 0) * ACTION_DIVIDER_WIDTH;
  return actionWidths.reduce((total, width) => total + width, 0) + dividerWidth;
}

function getLabelText(action: TableActionItem, fallback: string) {
  if (action.widthText) return action.widthText;
  if (typeof action.label === 'string' || typeof action.label === 'number') {
    return String(action.label);
  }
  return fallback;
}

/** 根据已解析的操作按钮估算操作列宽度。 */
export function getTableActionsColumnWidth(
  actions: readonly TableActionItemInput[],
  {
    moreText = I18N.common.actions.more,
    maxInlineCount = TABLE_ACTIONS_MAX_INLINE_COUNT,
    collapsedInlineCount = maxInlineCount - 1,
    permissionKeys,
    minWidth = ACTION_COLUMN_MIN_WIDTH,
  }: TableActionsWidthOptions = {},
) {
  const normalizedActions = actions.filter(
    (action): action is TableActionItem => {
      if (!action || action.hidden) return false;
      return (
        !permissionKeys ||
        !action.permissionKey ||
        permissionKeys.has(action.permissionKey)
      );
    },
  );
  const showMore = normalizedActions.length > maxInlineCount;
  const inlineCount = showMore ? collapsedInlineCount : maxInlineCount;
  const inlineActions = normalizedActions.slice(0, inlineCount);
  const actionWidths = inlineActions.map(action =>
    getButtonWidth(
      getLabelText(action, action.key),
      Boolean(action.icon),
      action.iconOnly,
    ),
  );

  if (showMore) {
    actionWidths.push(getButtonWidth(moreText, true));
  }

  if (actionWidths.length === 0) return minWidth;

  return Math.max(
    minWidth,
    getContentWidth(actionWidths) +
      ACTION_CELL_HORIZONTAL_PADDING +
      ACTION_COLUMN_WIDTH_BUFFER,
  );
}

function normalizeDefinitions<T>(
  actions: readonly TableActionDefinitionInput<T>[],
) {
  return actions.filter((action): action is TableActionDefinition<T> =>
    Boolean(action && action.hidden !== true),
  );
}

function getDefinitionWidth<T>(action: TableActionDefinition<T>) {
  const resolvedWidthTexts = Array.isArray(action.widthText)
    ? action.widthText
    : action.widthText
    ? [action.widthText]
    : typeof action.label === 'string' || typeof action.label === 'number'
    ? [String(action.label)]
    : [action.key];
  const widthTexts =
    resolvedWidthTexts.length > 0 ? resolvedWidthTexts : [action.key];

  return Math.max(
    ...widthTexts.map(text =>
      getButtonWidth(text, Boolean(action.icon), action.iconOnly),
    ),
  );
}

/**
 * 根据列级操作定义计算安全宽度。
 *
 * 行级 hidden 与权限可能让任意操作成为直显项，因此按最宽候选组合计算，
 * 同时覆盖“不折叠”和“折叠”两种布局。
 */
export function getTableActionDefinitionsColumnWidth<T>(
  actions: readonly TableActionDefinitionInput<T>[],
  {
    moreText = I18N.common.actions.more,
    maxInlineCount = TABLE_ACTIONS_MAX_INLINE_COUNT,
    collapsedInlineCount = maxInlineCount - 1,
    minWidth = ACTION_COLUMN_MIN_WIDTH,
  }: Omit<TableActionsWidthOptions, 'permissionKeys'> = {},
) {
  const definitions = normalizeDefinitions(actions);
  if (definitions.length === 0) return minWidth;

  const widths = definitions.map(getDefinitionWidth).sort((a, b) => b - a);
  const directWidths = widths.slice(0, Math.max(maxInlineCount, 0));
  const directContentWidth = getContentWidth(directWidths);

  const collapsedContentWidth =
    definitions.length > maxInlineCount
      ? getContentWidth([
          ...widths.slice(0, Math.max(collapsedInlineCount, 0)),
          getButtonWidth(moreText, true),
        ])
      : 0;

  return Math.max(
    minWidth,
    directContentWidth +
      ACTION_CELL_HORIZONTAL_PADDING +
      ACTION_COLUMN_WIDTH_BUFFER,
    collapsedContentWidth +
      ACTION_CELL_HORIZONTAL_PADDING +
      ACTION_COLUMN_WIDTH_BUFFER,
  );
}
