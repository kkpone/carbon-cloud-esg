import type { ButtonProps, DropdownProps, TableColumnType } from 'antd';
import type { ReactNode } from 'react';

export type TableActionItemInput = TableActionItem | false | null | undefined;

export interface TableActionItem {
  key: string;
  label: ReactNode;
  /** label 为非文本节点时，用于估算操作列宽度 */
  widthText?: string;
  permissionKey?: string;
  hidden?: boolean;
  disabled?: boolean;
  loading?: boolean;
  danger?: boolean;
  tooltip?: ReactNode;
  icon?: ReactNode;
  /** 直显时仅展示图标，进入“更多”后仍展示 label */
  iconOnly?: boolean;
  testId?: string;
  buttonProps?: Omit<
    ButtonProps,
    | 'children'
    | 'danger'
    | 'disabled'
    | 'icon'
    | 'loading'
    | 'onClick'
    | 'size'
    | 'type'
  >;
  onClick?: () => void | Promise<void>;
}

export interface TableActionsProps
  extends Omit<DropdownProps, 'children' | 'menu' | 'trigger'> {
  actions: readonly TableActionItemInput[];
  testIdPrefix?: string;
  testIdSuffix?: string;
  moreText?: string;
  /** 超过该数量时折叠出“更多” */
  maxInlineCount?: number;
  /** 折叠后保留在外部直显的按钮数量 */
  collapsedInlineCount?: number;
  moreTestId?: string;
  emptyText?: ReactNode;
}

export interface TableActionsWidthOptions {
  moreText?: string;
  /** 超过该数量时折叠出“更多” */
  maxInlineCount?: number;
  /** 折叠后保留在外部直显的按钮数量 */
  collapsedInlineCount?: number;
  /** 用于按当前账号权限计算实际可见按钮宽度 */
  permissionKeys?: ReadonlySet<string>;
  minWidth?: number;
}

export type TableActionValue<T, V> = V | ((record: T, index: number) => V);

export type TableActionDefinitionInput<T> =
  | TableActionDefinition<T>
  | false
  | null
  | undefined;

interface TableActionDefinitionBase<T> {
  key: string;
  permissionKey?: string;
  hidden?: TableActionValue<T, boolean>;
  disabled?: TableActionValue<T, boolean>;
  loading?: TableActionValue<T, boolean>;
  danger?: TableActionValue<T, boolean>;
  tooltip?: TableActionValue<T, ReactNode>;
  icon?: ReactNode;
  iconOnly?: boolean;
  testId?: TableActionValue<T, string | undefined>;
  buttonProps?: TableActionItem['buttonProps'];
  onClick?: (record: T, index: number) => void | Promise<void>;
}

/** 声明一项可按行解析的表格操作；动态文案必须提供宽度候选值。 */
export type TableActionDefinition<T> = TableActionDefinitionBase<T> &
  (
    | {
        label: ReactNode;
        /** 非文本 label 的宽度计算依据，多个候选值取最宽值 */
        widthText?: string | readonly string[];
      }
    | {
        label: (record: T, index: number) => ReactNode;
        /** 动态文案的宽度候选值，多个候选值取最宽值 */
        widthText: string | readonly string[];
      }
  );

export interface TableActionsColumnOptions<T>
  extends Omit<
    TableColumnType<T>,
    'children' | 'dataIndex' | 'key' | 'render' | 'width'
  > {
  actions: readonly TableActionDefinitionInput<T>[];
  testIdPrefix?: TableActionValue<T, string | undefined>;
  testIdSuffix?: TableActionValue<T, string | undefined>;
  moreText?: string;
  /** 超过该数量时折叠出“更多” */
  maxInlineCount?: number;
  /** 折叠后保留在外部直显的按钮数量 */
  collapsedInlineCount?: number;
  moreTestId?: TableActionValue<T, string | undefined>;
  minWidth?: number;
  emptyText?: ReactNode;
  /** 当前行不应展示任何操作时返回 true */
  rowHidden?: TableActionValue<T, boolean>;
  dropdownProps?: Omit<DropdownProps, 'children' | 'menu' | 'trigger'>;
}
