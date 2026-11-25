import { uuid } from '@/utils';

import {
  OutlineSectionNode,
  SectionAttachment,
  SectionIndicatorRef,
  SectionWritingTemplate,
} from '../../service';

type BindingsSnapshot = {
  id: string;
  attachments: SectionAttachment[];
  indicators: SectionIndicatorRef[];
  sectionPrompt?: string;
  writingTemplate?: SectionWritingTemplate;
};

const SID_COMMENT_REGEX = /<!--\s*sid:([a-zA-Z0-9_-]+)\s*-->/;

export function parseMarkdownToTree(
  markdown: string,
  existingTree: OutlineSectionNode[] = [],
): OutlineSectionNode[] {
  if (!markdown) {
    return [];
  }

  const byId = new Map<string, BindingsSnapshot>();
  const byPath = new Map<string, BindingsSnapshot>();
  const byTitle = new Map<string, BindingsSnapshot>();

  const indexExisting = (
    nodes: OutlineSectionNode[],
    parentTitles: string[] = [],
  ) => {
    nodes.forEach((node, idx) => {
      const pathKey = [...parentTitles, `${idx}:${node.title.trim()}`].join(
        '>',
      );
      const snapshot: BindingsSnapshot = {
        id: node.id,
        attachments: node.attachments || [],
        indicators: node.indicators || [],
        sectionPrompt: node.sectionPrompt,
        writingTemplate: node.writingTemplate,
      };
      byId.set(node.id, snapshot);
      byPath.set(pathKey, snapshot);
      if (node.title.trim() && !byTitle.has(node.title.trim())) {
        byTitle.set(node.title.trim(), snapshot);
      }
      if (node.children?.length) {
        indexExisting(node.children, [
          ...parentTitles,
          `${idx}:${node.title.trim()}`,
        ]);
      }
    });
  };

  indexExisting(existingTree);

  const lines = markdown.split('\n');
  const tree: OutlineSectionNode[] = [];
  const stack: { level: number; node: OutlineSectionNode; pathKey: string }[] =
    [];
  let currentNode: OutlineSectionNode | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#+)\s+(.*)$/);

    if (headingMatch) {
      currentNode = null;
      const level = headingMatch[1].length;
      const rawHeading = headingMatch[2];
      const sidMatch = rawHeading.match(SID_COMMENT_REGEX);
      const explicitId = sidMatch?.[1];
      const title = rawHeading.replace(SID_COMMENT_REGEX, '').trim();

      let siblings = tree;
      let parentPath = '';
      if (level > 1) {
        const parentEntry = stack[level - 2];
        if (parentEntry) {
          siblings = parentEntry.node.children || [];
          parentPath = parentEntry.pathKey;
        }
      }
      const siblingIndex = siblings.length;
      const pathKey = parentPath
        ? `${parentPath}>${siblingIndex}:${title}`
        : `${siblingIndex}:${title}`;

      const matched =
        (explicitId && byId.get(explicitId)) ||
        byPath.get(pathKey) ||
        byTitle.get(title);

      const node: OutlineSectionNode = {
        id: explicitId || matched?.id || uuid(),
        title,
        description: '',
        attachments: matched?.attachments || [],
        indicators: matched?.indicators || [],
        sectionPrompt: matched?.sectionPrompt,
        writingTemplate: matched?.writingTemplate,
        children: [],
      };

      if (level === 1) {
        tree.push(node);
        stack[0] = { level, node, pathKey };
        stack.length = 1;
      } else {
        const parent = stack[level - 2]?.node;
        if (parent) {
          parent.children = parent.children || [];
          parent.children.push(node);
        }
        stack[level - 1] = { level, node, pathKey };
        stack.length = level;
      }

      currentNode = node;
    } else if (currentNode && line.trim() !== '') {
      currentNode.description += currentNode.description
        ? `\n${line.trim()}`
        : line.trim();
    }
  }

  return tree;
}
