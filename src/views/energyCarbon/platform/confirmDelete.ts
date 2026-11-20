import type { ReactNode } from 'react';

import I18N from '@/lang/I18N';
import { modal } from '@/views/energyCarbon/platform/antdStatic';
import { TABLE_EMPTY_TEXT } from '@/views/energyCarbon/platform/tableColumn';

interface ConfirmDeleteOptions {
  /** 内容项，如“单位组”“字典” */
  itemName?: string;
  /** 内容名称，如具体单位组名称 */
  itemValue?: string | number | null;
  /** 自定义提示内容，特殊删除场景优先使用 */
  content?: ReactNode;
  onOk: () => void | Promise<void>;
}

function getDisplayValue(value: ConfirmDeleteOptions['itemValue']) {
  if (typeof value === 'number') return String(value);
  return value || TABLE_EMPTY_TEXT;
}

/** 弹出统一删除确认框 */
export function confirmDelete({
  itemName,
  itemValue,
  content,
  onOk,
}: ConfirmDeleteOptions) {
  const resolvedItemName = itemName ?? I18N.common.confirmDelete.defaultItem;
  modal.confirm({
    title: I18N.common.confirmDelete.title,
    content:
      content ??
      I18N.template(I18N.common.confirmDelete.content, {
        val1: resolvedItemName,
        val2: getDisplayValue(itemValue),
      }),
    cancelText: I18N.common.actions.cancel,
    okText: I18N.common.actions.confirm,
    cancelButtonProps: { type: 'primary' },
    okButtonProps: { type: 'primary' },
    onOk,
  });
}
