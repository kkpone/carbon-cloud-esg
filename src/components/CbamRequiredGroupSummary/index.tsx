import I18N from '@/lang/I18N';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Form } from 'antd';

import styles from './index.module.less';

interface GroupSummary {
  /** 提示挂载到实际渲染的小标题，兼容折叠列表标题。 */
  title: HTMLElement;
  /** 当前标题下尚未填写的必填控件数量。 */
  missing: number;
}

/** 按全部表格行统计空缺必填字段，0 和 false 均视为已填写。 */
export function countRequiredTableFields<T extends object>(
  rows: T[],
  fields: readonly (keyof T)[],
  requiredRows = false,
) {
  if (!rows.length) return requiredRows ? 1 : 0;
  return rows.reduce(
    (total, row) =>
      total +
      fields.filter(field => {
        const value = row[field];
        return (
          value === undefined ||
          value === null ||
          (typeof value === 'string' && !value.trim()) ||
          (Array.isArray(value) && !value.length)
        );
      }).length,
    0,
  );
}

/** 由业务完整度提供状态，兼容自定义控件与尚未展开的内容。 */
export function CbamRequiredGroupStatus({ missing }: { missing: number }) {
  return (
    <span className={missing ? styles.pending : styles.complete}>
      {missing
        ? I18N.template(I18N.cbamMonitor.groupPendingInformation, {
            count: missing,
          })
        : I18N.cbamMonitor.groupConfigurationComplete}
    </span>
  );
}

/** 根据实际必填控件展示辅助提示，不调用校验或改变保存规则。 */
export default function CbamRequiredGroupSummary() {
  const form = Form.useFormInstance();
  const values = Form.useWatch([], { form, preserve: true });
  const anchor = useRef<HTMLSpanElement>(null);
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  useEffect(() => {
    const root = anchor.current?.closest('form');
    if (!root) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const titles = Array.from(
        root.querySelectorAll<HTMLElement>('h3, h4, .ant-collapse-header-text'),
      ).filter(title => !title.closest('[data-cbam-explicit-summary]'));
      const items = Array.from(
        root.querySelectorAll<HTMLElement>('.ant-form-item'),
      ).filter(
        item =>
          !item.closest('[data-cbam-required-missing]') &&
          item.querySelector('[aria-required="true"], .ant-form-item-required'),
      );
      // 抽屉和分页表格提供全量行统计，避免漏计及与行内控件重复计数。
      const tables = Array.from(
        root.querySelectorAll<HTMLElement>('[data-cbam-required-missing]'),
      );
      const requiredGroups = [...items, ...tables];
      const registered = form.getFieldsError().map(field => ({
        name: field.name,
        id: field.name.join('_'),
      }));
      const next: GroupSummary[] = [];
      titles.forEach(title => {
        let container: HTMLElement | null = title.closest('.ant-collapse-item');
        if (!title.matches('.ant-collapse-header-text')) {
          container = title.parentElement;
          // 标题可能在独立 header 内，向上找到对应表单分组。
          while (
            container &&
            container !== root &&
            !requiredGroups.some(item => container?.contains(item))
          ) {
            container = container.parentElement;
          }
        }
        if (!container || container === root) return;
        const fields = items.filter(item => container?.contains(item));
        const groupTables = tables.filter(table => container?.contains(table));
        if (!fields.length && !groupTables.length) return;
        const missing =
          groupTables.reduce(
            (total, table) =>
              total + Number(table.dataset.cbamRequiredMissing || 0),
            0,
          ) +
          fields.filter(item => {
            // 优先读取 Form 值，兼容附件、日期及自定义控件。
            const fieldId =
              item.querySelector('label[for]')?.getAttribute('for') ||
              item.querySelector('[aria-required="true"][id]')?.id;
            const field = registered.find(entry => entry.id === fieldId);
            if (field) {
              const value: unknown = form.getFieldValue(field.name);
              return (
                value === undefined ||
                value === null ||
                (typeof value === 'string' && !value.trim()) ||
                (Array.isArray(value) && value.length === 0)
              );
            }

            const select = item.querySelector('.ant-select');
            if (select)
              return !select.querySelector('.ant-select-selection-item');
            const controls = Array.from(
              item.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
                'input:not([type="hidden"]):not([type="search"]), textarea',
              ),
            );
            if (controls.length)
              return controls.every(control => {
                if (control.type === 'checkbox' || control.type === 'radio')
                  return !(control as HTMLInputElement).checked;
                return !control.value.trim();
              });
            return !item.querySelector(
              '.ant-upload-list-item, [aria-checked="true"]',
            );
          }).length;
        next.push({ title, missing });
      });
      setGroups(previous =>
        previous.length === next.length &&
        previous.every(
          (group, index) =>
            group.title === next[index].title &&
            group.missing === next[index].missing,
        )
          ? previous
          : next,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'class',
        'aria-required',
        'value',
        'data-cbam-required-missing',
      ],
    });
    root.addEventListener('input', schedule);
    root.addEventListener('change', schedule);
    schedule();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      root.removeEventListener('input', schedule);
      root.removeEventListener('change', schedule);
    };
  }, [form, values]);
  return (
    <>
      <span ref={anchor} hidden />
      {groups.map((group, index) =>
        createPortal(
          <CbamRequiredGroupStatus missing={group.missing} />,
          group.title,
          String(index),
        ),
      )}
    </>
  );
}
