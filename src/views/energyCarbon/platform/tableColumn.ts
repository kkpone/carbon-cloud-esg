import type { TableColumnsType } from 'antd';

/** 表格空值占位 */
export const TABLE_EMPTY_TEXT = '-';

/** 表格列基础值渲染：数值保留 0，其他类型空值展示占位 */
export function renderTableCellValue<T>(value: T) {
  if (typeof value === 'number') {
    return value ?? TABLE_EMPTY_TEXT;
  }
  return value || TABLE_EMPTY_TEXT;
}

function getColumnKeyByDataIndex(dataIndex: unknown) {
  if (Array.isArray(dataIndex)) {
    return dataIndex.join('.');
  }
  return String(dataIndex);
}

/** 包裹表格列配置，为无自定义 render 的普通 dataIndex 列统一补空值渲染 */
export function withTableColumnEmptyRender<T>(
  columns: TableColumnsType<T>,
): TableColumnsType<T> {
  return columns.map(column => {
    if ('children' in column && column.children) {
      return {
        ...column,
        children: withTableColumnEmptyRender(column.children),
      };
    }

    if (!('dataIndex' in column) || column.render) {
      return column;
    }

    return {
      ...column,
      key: column.key ?? getColumnKeyByDataIndex(column.dataIndex),
      render: renderTableCellValue,
    };
  });
}
