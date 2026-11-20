import {
  OutlineSectionNode,
  ReportDetailsType,
  ReportPromptConfig,
  ReportPromptLanguage,
} from './service';

export const DEFAULT_REPORT_PROMPT_CONFIG: ReportPromptConfig = {
  tone: 'formal_disclosure',
  language: 'zh-CN',
  lengthLevel: 'standard',
  strictDataMode: true,
  highlightStandards: true,
  customInstruction: '',
};

export const normalizePromptLanguage = (
  locale?: string,
): ReportPromptLanguage => {
  if (locale === 'zh-TW') {
    return 'zh-TW';
  }
  if (locale === 'en-US') {
    return 'en-US';
  }
  return 'zh-CN';
};

export const mergePromptConfig = (
  raw?: Partial<ReportPromptConfig>,
  fallbackLocale?: string,
): ReportPromptConfig => ({
  ...DEFAULT_REPORT_PROMPT_CONFIG,
  language: normalizePromptLanguage(fallbackLocale),
  ...(raw || {}),
});

const PROMPT_STORAGE_KEY_PREFIX = 'esg_report_prompt_config_';

export const getStoredPromptConfig = (
  reportId: number,
): Partial<ReportPromptConfig> | undefined => {
  if (typeof window === 'undefined' || !reportId) {
    return undefined;
  }
  try {
    const raw = window.sessionStorage.getItem(
      `${PROMPT_STORAGE_KEY_PREFIX}${reportId}`,
    );
    if (!raw) {
      return undefined;
    }
    return JSON.parse(raw) as Partial<ReportPromptConfig>;
  } catch {
    return undefined;
  }
};

export const saveStoredPromptConfig = (
  reportId: number,
  config: ReportPromptConfig,
) => {
  if (typeof window === 'undefined' || !reportId) {
    return;
  }
  try {
    window.sessionStorage.setItem(
      `${PROMPT_STORAGE_KEY_PREFIX}${reportId}`,
      JSON.stringify(config),
    );
  } catch {
    // ignore storage quota errors
  }
};

const SECTION_STORAGE_KEY_PREFIX = 'esg_report_outline_sections_';

export const getStoredOutlineSections = (
  reportId: number,
): OutlineSectionNode[] | undefined => {
  if (typeof window === 'undefined' || !reportId) {
    return undefined;
  }
  try {
    const raw = window.sessionStorage.getItem(
      `${SECTION_STORAGE_KEY_PREFIX}${reportId}`,
    );
    if (!raw) {
      return undefined;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutlineSectionNode[]) : undefined;
  } catch {
    return undefined;
  }
};

export const saveStoredOutlineSections = (
  reportId: number,
  sections: OutlineSectionNode[],
) => {
  if (typeof window === 'undefined' || !reportId) {
    return;
  }
  try {
    window.sessionStorage.setItem(
      `${SECTION_STORAGE_KEY_PREFIX}${reportId}`,
      JSON.stringify(sections),
    );
  } catch {
    // ignore storage quota errors
  }
};

const collectBoundStats = (
  nodes: OutlineSectionNode[],
): { sectionCount: number; indicatorCount: number; attachmentCount: number } =>
  nodes.reduce(
    (acc, node) => {
      const childStats = collectBoundStats(node.children || []);
      return {
        sectionCount: acc.sectionCount + 1 + childStats.sectionCount,
        indicatorCount:
          acc.indicatorCount +
          (node.indicators?.length || 0) +
          childStats.indicatorCount,
        attachmentCount:
          acc.attachmentCount +
          (node.attachments?.length || 0) +
          childStats.attachmentCount,
      };
    },
    { sectionCount: 0, indicatorCount: 0, attachmentCount: 0 },
  );

export const buildReportPromptPreview = (params: {
  reportInfo?: Partial<ReportDetailsType>;
  sections: OutlineSectionNode[];
  config: ReportPromptConfig;
}) => {
  const { reportInfo, sections, config } = params;
  const stats = collectBoundStats(sections);
  const toneMap = {
    formal_disclosure: 'Formal Compliance Disclosure',
    concise_executive: 'Concise Executive Summary',
    investor_oriented: 'Investor-Oriented Disclosure',
  };
  const lengthMap = {
    standard: 'Standard Length',
    detailed: 'Detailed Coverage',
  };

  const lines = [
    `[Role] Senior ESG Disclosure Consultant (${reportInfo?.orgName || 'Enterprise'} ${reportInfo?.period || ''})`,
    `[Style] ${toneMap[config.tone]} | Language: ${config.language} | ${lengthMap[config.lengthLevel]}`,
    config.strictDataMode
      ? '[Data Guardrail] Strict grounding enabled: cite bound indicators and section attachments with exact units; use placeholders for missing figures.'
      : '[Data Guardrail] Prefer bound indicators and attachments; bridge missing metrics qualitatively.',
    config.highlightStandards
      ? '[Standards] Annotate aligned standard clauses (e.g. GRI / ISSB) at the end of matching sections.'
      : '[Standards] Follow selected standard structure without inline clause tags.',
    `[Section Context] ${stats.sectionCount} sections, ${stats.indicatorCount} linked indicators, ${stats.attachmentCount} section attachments.`,
  ];

  if (reportInfo?.userContent?.trim()) {
    lines.push(`[Creation Note] ${reportInfo.userContent.trim()}`);
  }
  if (config.customInstruction?.trim()) {
    lines.push(`[Global Prompt] ${config.customInstruction.trim()}`);
  }

  return lines.join('\n');
};
