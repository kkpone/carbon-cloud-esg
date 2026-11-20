import { OutlineSectionNode } from '../../service';

export function convertTreeToMarkdown(
  tree: OutlineSectionNode[],
  level = 1,
): string {
  const lines: string[] = [];

  for (const node of tree) {
    const prefix = '#'.repeat(level);
    const sidTag = level > 1 && node.id ? ` <!-- sid:${node.id} -->` : '';
    lines.push(`${prefix} ${node.title}${sidTag}`);

    if (node.description) {
      lines.push(...node.description.split('\n'));
    }

    lines.push('');

    if (node.children && node.children.length > 0) {
      const childMd = convertTreeToMarkdown(node.children, level + 1);
      lines.push(childMd);
    }
  }

  return lines.join('\n').trim();
}
