import type { DefaultOptionType } from 'antd/es/cascader';

/** Cascader 选中路径 → 叶子 value */
export function cascaderPathToLeaf(
  path?: (string | number | null)[] | null,
): string | undefined {
  if (!path?.length) return undefined;
  const leaf = path[path.length - 1];
  return leaf != null && String(leaf) !== '' ? String(leaf) : undefined;
}

/**
 * 在 Cascader 选项树中反查叶子 value 的完整路径。
 * 支持任意层级嵌套；叶子 value 重复时取遍历顺序中的最后一个匹配（避免反显到「常用单位」等靠前节点）。
 */
export function resolveLeafToCascaderPath(
  leafValue: string | undefined,
  options: DefaultOptionType[] = [],
  path: (string | number)[] = [],
): string[] | undefined {
  if (!leafValue?.trim()) return undefined;
  let lastMatch: string[] | undefined;
  for (const node of options.filter(option => option.value != null)) {
    const currentPath = [...path, node.value as string | number];
    const nodeVal = String(node.value);
    const { children } = node;
    if (nodeVal === leafValue && !children?.length) {
      lastMatch = currentPath.map(String);
    }
    if (children?.length) {
      const found = resolveLeafToCascaderPath(leafValue, children, currentPath);
      if (found) lastMatch = found;
    }
  }
  return lastMatch;
}

/**
 * 叶子 value → Cascader 路径数组。
 * 兼容历史逗号分隔路径字符串（如 "parent,child"）。
 */
export function leafToCascaderPath(
  value?: string | string[] | null,
  options: DefaultOptionType[] = [],
): string[] | undefined {
  if (value == null) return undefined;
  if (Array.isArray(value)) {
    return value.length ? value.map(String) : undefined;
  }
  if (typeof value !== 'string') {
    return resolveLeafToCascaderPath(String(value), options);
  }
  if (!value.trim()) return undefined;
  const trimmed = value.trim();
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').filter(Boolean);
    if (parts.length >= 2) return parts;
    return resolveLeafToCascaderPath(parts[0], options);
  }
  return resolveLeafToCascaderPath(trimmed, options);
}
