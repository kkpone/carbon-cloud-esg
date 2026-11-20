import type { TreeSelectProps } from 'antd';
import type { OrgTree } from './types';

/** 用碳云组织主键作为表单值，保留来源页面的树选择契约。 */
export function mapOrgTreeToTreeSelectData(
  nodes: OrgTree[],
  options?: { disableInactive?: boolean },
): NonNullable<TreeSelectProps['treeData']> {
  return nodes.map(node => ({
    title: node.name,
    value: node.id,
    key: node.id,
    disabled: options?.disableInactive ? node.orgStatus === 1 : undefined,
    children: node.children?.length
      ? mapOrgTreeToTreeSelectData(node.children, options)
      : undefined,
  }));
}
