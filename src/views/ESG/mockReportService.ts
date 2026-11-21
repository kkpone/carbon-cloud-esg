import {
  OutlineSectionNode,
  ReportDetailsType,
  ReportPromptConfig,
  SectionAttachment,
  SectionIndicatorRef,
} from './AiGenerateOutline/service';
import { convertTreeToMarkdown } from './AiGenerateOutline/components/Sortable/convertTreeToMarkdown';
import {
  buildReportPromptPreview,
  mergePromptConfig,
} from './AiGenerateOutline/promptUtils';
import { ReportData } from './AiGenerateHome/service';

const MOCK_STORAGE_KEY = 'esg_mock_reports_v1';
const MOCK_ENABLE_KEY = 'esg_mock_mode_enabled';
const MOCK_NEXT_ID_KEY = 'esg_mock_next_id_v1';

export const isPermissionOrUnavailableError = (error: unknown): boolean => {
  const err = error as {
    data?: { code?: number };
    response?: { status?: number; data?: { code?: number } };
    message?: { code?: number };
    status?: number;
  };
  const code =
    err?.data?.code ||
    err?.response?.data?.code ||
    err?.message?.code ||
    err?.response?.status ||
    err?.status;
  return code === 403 || code === 404 || code === 500 || code === 502 || code === 503;
};

export type MockCreateReportPayload = {
  orgId: number;
  orgName?: string;
  userContent?: string;
  period: string;
  indicatorType: 0 | 1;
  indicatorFiles?: {
    name: string;
    url: string;
  };
  frameId?: number | string;
  standardIds: string;
  referFiles: { name: string; url: string }[];
  referLink: string[];
  referText: string[];
};

type MockReportRecord = ReportDetailsType & {
  companyId: number;
  orgId: number;
  state: 0 | 1;
  updateBy: string;
  updateTime: string;
  lgUrl: string | null;
  indicatorFiles?: { name: string; url: string };
};

const readMockStore = (): Record<string, MockReportRecord> => {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(MOCK_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, MockReportRecord>) : {};
  } catch {
    return {};
  }
};

const writeMockStore = (store: Record<string, MockReportRecord>) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(store));
  } catch {
    // ignore quota error
  }
};

const allocateMockId = (): number => {
  if (typeof window === 'undefined') {
    return 900001;
  }
  const current = Number(window.localStorage.getItem(MOCK_NEXT_ID_KEY) || '900000');
  const next = current + 1;
  window.localStorage.setItem(MOCK_NEXT_ID_KEY, String(next));
  return next;
};

export const isEsgMockModeEnabled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  const queryVal = new URLSearchParams(window.location.search).get('mockEsg');
  if (queryVal === '1' || queryVal === 'true') {
    return true;
  }
  if (queryVal === '0' || queryVal === 'false') {
    return false;
  }
  return window.localStorage.getItem(MOCK_ENABLE_KEY) === '1';
};

export const setEsgMockModeEnabled = (enabled: boolean) => {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(MOCK_ENABLE_KEY, enabled ? '1' : '0');
};

export const isMockReportId = (id?: number | string | null): boolean => {
  const num = Number(id);
  if (!num) {
    return false;
  }
  const store = readMockStore();
  return Boolean(store[String(num)]) || num >= 900000;
};

const buildDefaultOutlineSections = (
  orgName: string,
  period: string,
  standardLabel: string,
): OutlineSectionNode[] => [
  {
    id: 'sec-about',
    title: '关于本报告',
    description: `说明${orgName}${period}年度ESG报告的编制范围、报告周期、参考标准（${standardLabel}）及数据口径。`,
    attachments: [],
    indicators: [],
    children: [
      {
        id: 'sec-about-scope',
        title: '报告范围与编制依据',
        description: `涵盖${orgName}及主要运营主体在${period}年度的环境、社会及管治绩效，遵循${standardLabel}披露要求。`,
        attachments: [],
        indicators: [],
        children: [],
      },
      {
        id: 'sec-about-data',
        title: '数据说明与联系渠道',
        description: '说明定量数据来源、统计口径及利益相关方反馈方式。',
        attachments: [],
        indicators: [],
        children: [],
      },
    ],
  },
  {
    id: 'sec-gov',
    title: 'ESG治理与战略管理',
    description: '阐述董事会监督机制、ESG战略目标、实质性议题识别与利益相关方沟通。',
    attachments: [],
    indicators: [],
    children: [
      {
        id: 'sec-gov-board',
        title: '管治架构与合规风控',
        description: '说明ESG管治层级职责、商业道德规范与风险防控机制。',
        attachments: [],
        indicators: [],
        children: [],
      },
      {
        id: 'sec-gov-materiality',
        title: '实质性议题识别与回应',
        description: '展示双重重要性评估流程及核心议题管理矩阵。',
        attachments: [],
        indicators: [],
        children: [],
      },
    ],
  },
  {
    id: 'sec-env',
    title: '环境管理与低碳行动（E）',
    description: '围绕双碳目标、能源转型、温室气体减排与资源循环披露关键实践与绩效。',
    attachments: [],
    indicators: [],
    children: [
      {
        id: 'sec-env-climate',
        title: '应对气候变化与碳排放管理',
        description: '重点披露范围一/二碳排放、减排举措与绿色能源使用情况。',
        attachments: [],
        indicators: [],
        children: [],
      },
      {
        id: 'sec-env-resource',
        title: '资源利用与污染防治',
        description: '披露水资源管理、废弃物合规处置及生态保护措施。',
        attachments: [],
        indicators: [],
        children: [],
      },
    ],
  },
  {
    id: 'sec-soc',
    title: '社会责任与价值共创（S）',
    description: '披露员工发展、职业健康安全、负责任供应链及社区公益贡献。',
    attachments: [],
    indicators: [],
    children: [
      {
        id: 'sec-soc-employee',
        title: '以人为本与员工发展',
        description: '展示平等雇佣、培训赋能、职业安全与员工关怀实践。',
        attachments: [],
        indicators: [],
        children: [],
      },
      {
        id: 'sec-soc-supply',
        title: '供应链责任与客户权益',
        description: '说明供应商ESG准入评估、产品服务质量与信息安全保障。',
        attachments: [],
        indicators: [],
        children: [],
      },
    ],
  },
  {
    id: 'sec-appendix',
    title: '附录与指标索引',
    description: '汇总年度关键ESG绩效数据表及披露标准条款索引。',
    attachments: [],
    indicators: [],
    children: [],
  },
];

export const createMockReport = (payload: MockCreateReportPayload): number => {
  const id = allocateMockId();
  const orgName = payload.orgName?.trim() || '示例企业';
  const period = payload.period || String(new Date().getFullYear() - 1);
  const reportName = period + orgName;
  const nowIso = new Date().toISOString();
  const store = readMockStore();

  store[String(id)] = {
    id,
    companyId: 0,
    orgId: payload.orgId || 0,
    period,
    reportName,
    orgName,
    reportUrl: '',
    outline: '',
    reportContent: null,
    frameId: payload.frameId ?? null,
    indicatorType: payload.indicatorType,
    indicatorFiles: payload.indicatorFiles,
    standardIds: payload.standardIds,
    userContent: payload.userContent,
    referFiles: payload.referFiles || [],
    referLink: payload.referLink || [],
    referText: payload.referText || [],
    outlineSections: [],
    promptConfig: mergePromptConfig(undefined),
    state: 0,
    updateBy: '模拟演示',
    updateTime: nowIso,
    lgUrl: null,
  };
  writeMockStore(store);
  return id;
};

export const getMockReportList = (): ReportData[] => {
  const store = readMockStore();
  return Object.values(store)
    .sort((a, b) => b.id - a.id)
    .map(item => ({
      companyId: item.companyId,
      frameId: (item.frameId as null) ?? null,
      id: item.id,
      indicatorFiles: item.indicatorFiles,
      indicatorType: item.indicatorType ?? 0,
      lgUrl: null,
      orgId: item.orgId,
      orgName: item.orgName || '',
      outline: null,
      period: item.period,
      referFiles: [],
      referLink: [],
      referText: [],
      reportName: item.reportName,
      reportUrl: null,
      standardIds: item.standardIds || '',
      state: item.state,
      updateBy: item.updateBy,
      updateTime: item.updateTime,
    }));
};

export const getMockReportInfo = (id: number): ReportDetailsType | null => {
  const store = readMockStore();
  return store[String(id)] || null;
};

export const cloneReportIntoMock = (source: ReportDetailsType): MockReportRecord => {
  const store = readMockStore();
  const existing = store[String(source.id)];
  if (existing) {
    return existing;
  }
  const record: MockReportRecord = {
    ...source,
    companyId: 0,
    orgId: 0,
    state: source.reportContent ? 1 : 0,
    updateBy: '模拟演示',
    updateTime: new Date().toISOString(),
    lgUrl: null,
    outlineSections: source.outlineSections || [],
    promptConfig: mergePromptConfig(source.promptConfig),
  };
  store[String(source.id)] = record;
  writeMockStore(store);
  return record;
};

export const saveMockOutline = (params: {
  id: number;
  outline: string;
  outlineSections?: OutlineSectionNode[];
  promptConfig?: ReportPromptConfig;
  fallbackInfo?: ReportDetailsType;
}): ReportDetailsType | null => {
  const store = readMockStore();
  const existing =
    store[String(params.id)] ||
    (params.fallbackInfo ? cloneReportIntoMock(params.fallbackInfo) : undefined);
  if (!existing) {
    return null;
  }
  const updated: MockReportRecord = {
    ...existing,
    outline: params.outline,
    outlineSections: params.outlineSections ?? existing.outlineSections,
    promptConfig: params.promptConfig ?? existing.promptConfig,
    updateTime: new Date().toISOString(),
  };
  store[String(params.id)] = updated;
  writeMockStore(store);
  return updated;
};

export const saveMockReportContent = (params: {
  id: number;
  reportContent: string;
  fallbackInfo?: ReportDetailsType;
}): ReportDetailsType | null => {
  const store = readMockStore();
  const existing =
    store[String(params.id)] ||
    (params.fallbackInfo ? cloneReportIntoMock(params.fallbackInfo) : undefined);
  if (!existing) {
    return null;
  }
  const updated: MockReportRecord = {
    ...existing,
    reportContent: params.reportContent,
    state: 1,
    updateTime: new Date().toISOString(),
  };
  store[String(params.id)] = updated;
  writeMockStore(store);
  return updated;
};

export const deleteMockReport = (id: number): boolean => {
  const store = readMockStore();
  if (store[String(id)]) {
    delete store[String(id)];
    writeMockStore(store);
    return true;
  }
  return false;
};

const streamChunks = (
  text: string,
  chunkSize: number,
  delayMs: number,
  onMessage: (chunk: string) => void,
  signal?: AbortSignal,
) =>
  new Promise<void>((resolve, reject) => {
    let offset = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timer) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(signal?.reason || new Error('Aborted'));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    const tick = () => {
      if (signal?.aborted) return;
      const next = text.slice(offset, offset + chunkSize);
      if (next) {
        onMessage(next);
        offset += chunkSize;
      }
      if (offset >= text.length) {
        cleanup();
        resolve();
        return;
      }
      timer = setTimeout(tick, delayMs);
    };
    tick();
  });

export const streamMockOutline = async (params: {
  reportId: number;
  onMessage: (chunk: string) => void;
  abortCtrl: AbortController;
}) => {
  const store = readMockStore();
  const record = store[String(params.reportId)];
  const orgName = record?.orgName || '示例企业';
  const period = record?.period || '2025';
  const standardLabel = record?.standardIds
    ? `标准ID: ${record.standardIds}`
    : 'HKEX / GRI / ISSB';
  const sections = buildDefaultOutlineSections(orgName, period, standardLabel);
  const rootTitle = `${period}${orgName}环境、社会及管治（ESG）报告`;
  const markdown = convertTreeToMarkdown([
    {
      id: 'root',
      title: rootTitle,
      attachments: [],
      indicators: [],
      children: sections,
    },
  ]);

  await streamChunks(markdown, 32, 20, params.onMessage, params.abortCtrl.signal);

  if (record) {
    store[String(params.reportId)] = {
      ...record,
      outline: markdown,
      outlineSections: sections,
      updateTime: new Date().toISOString(),
    };
    writeMockStore(store);
  }
};

const formatIndicatorLine = (ind: SectionIndicatorRef, strictMode: boolean) => {
  const hasVal =
    ind.indicatorValue !== undefined &&
    ind.indicatorValue !== null &&
    String(ind.indicatorValue).trim() !== '';
  const valText = hasVal
    ? `${String(ind.indicatorValue)}${ind.unitName ? ` ${ind.unitName}` : ''}`
    : strictMode
      ? '[待补充填报数值]'
      : '持续监测并稳步推进';
  const stdText = ind.standardStr ? ` | 对标：${ind.standardStr}` : '';
  return `| ${ind.name} | ${valText} | ${ind.code || '-'}${stdText} |`;
};

const formatAttachmentLine = (att: SectionAttachment) => {
  if (att.type === 'link') {
    return `- 参考链接：[${att.name}](${att.url || att.name})`;
  }
  if (att.type === 'text') {
    return `- 补充材料摘要：${att.content || att.name}`;
  }
  return `- 挂载文件：《${att.name}》${att.fileSize ? `（${att.fileSize}）` : ''}`;
};

const renderSectionMarkdown = (
  section: OutlineSectionNode,
  level: number,
  ctx: {
    orgName: string;
    period: string;
    config: ReportPromptConfig;
  },
): string => {
  const headingPrefix = '#'.repeat(Math.min(level, 4));
  const lines: string[] = [`${headingPrefix} ${section.title}`, ''];
  const tonePhrase =
    ctx.config.tone === 'concise_executive'
      ? '以核心结论与量化成果为主线'
      : ctx.config.tone === 'investor_oriented'
        ? '围绕财务实质性风险、治理韧性与长期回报'
        : '严格依据合规披露口径';

  if (section.description?.trim()) {
    lines.push(section.description.trim(), '');
  }

  if (section.sectionPrompt?.trim()) {
    lines.push(
      `本节按专项指令编写（${section.sectionPrompt.trim()}），${tonePhrase}呈现${ctx.orgName}${ctx.period}年度关键进展。`,
      '',
    );
  } else {
    lines.push(
      `${ctx.orgName}在${ctx.period}年度持续完善该领域治理与执行体系，${tonePhrase}，确保信息披露客观可验证。`,
      '',
    );
  }

  if (section.indicators?.length) {
    lines.push(
      '### 关键关联指标绩效',
      '',
      '| 指标名称 | 披露数值 | 编码与对标标准 |',
      '| --- | --- | --- |',
      ...section.indicators.map(ind =>
        formatIndicatorLine(ind, ctx.config.strictDataMode),
      ),
      '',
    );
  } else if (
    ctx.config.strictDataMode &&
    (!section.children || section.children.length === 0)
  ) {
    lines.push(
      '> 数据校验提示：本章节暂未绑定定量指标，待补充填报值或支撑附件后可直接更新量化表格。',
      '',
    );
  }

  if (section.attachments?.length) {
    lines.push('### 本章参考资料与佐证依据', '');
    section.attachments.forEach(att => {
      lines.push(formatAttachmentLine(att));
    });
    lines.push('');
  }

  if (
    ctx.config.lengthLevel === 'detailed' &&
    (!section.children || section.children.length === 0)
  ) {
    lines.push(
      `围绕上述实践，${ctx.orgName}已建立季度追踪复核机制，明确责任部门与阶段性里程碑，推动${section.title}工作持续改进。`,
      '',
    );
  }

  if (ctx.config.highlightStandards) {
    const standardsFromInd = section.indicators
      ?.map(i => i.standardStr)
      .filter(Boolean)
      .join(' / ');
    lines.push(
      `*标准条款索引：${standardsFromInd || 'GRI Standards / HKEX Appendix C2 / ISSB S1-S2'}*`,
      '',
    );
  }

  if (section.children?.length) {
    section.children.forEach(child => {
      lines.push(renderSectionMarkdown(child, level + 1, ctx));
    });
  }

  return lines.join('\n');
};

export const buildMockReportMarkdown = (params: {
  reportInfo?: Partial<ReportDetailsType>;
  sections: OutlineSectionNode[];
  promptConfig: ReportPromptConfig;
}): string => {
  const { reportInfo, sections, promptConfig } = params;
  const orgName = reportInfo?.orgName || '示例企业';
  const period = reportInfo?.period || '2025';
  const title = reportInfo?.reportName
    ? `${reportInfo.reportName}环境、社会及管治（ESG）报告`
    : `${period}${orgName}环境、社会及管治（ESG）报告`;

  const effectiveSections =
    sections.length > 0
      ? sections
      : buildDefaultOutlineSections(orgName, period, 'HKEX / GRI');

  const promptSummary = buildReportPromptPreview({
    reportInfo,
    sections: effectiveSections,
    config: promptConfig,
  });

  const parts: string[] = [
    `# ${title}`,
    '',
    '> 本报告由 ESG 智能编写引擎依据全局策略与章节绑定上下文自动生成（后端模拟模式）。',
    '',
  ];

  if (promptConfig.customInstruction?.trim()) {
    parts.push(`**全局提示词执行约束：** ${promptConfig.customInstruction.trim()}`, '');
  }

  effectiveSections.forEach(sec => {
    parts.push(
      renderSectionMarkdown(sec, 2, {
        orgName,
        period,
        config: promptConfig,
      }),
    );
  });

  parts.push(
    '---',
    '',
    '### 生成策略追踪摘要',
    '',
    '```text',
    promptSummary,
    '```',
  );

  return parts.join('\n');
};

export const streamMockReport = async (params: {
  reportId: number;
  reportInfo?: ReportDetailsType;
  sections: OutlineSectionNode[];
  promptConfig: ReportPromptConfig;
  onMessage: (chunk: string) => void;
  abortCtrl: AbortController;
}) => {
  const store = readMockStore();
  const record = store[String(params.reportId)] || params.reportInfo;
  const markdown = buildMockReportMarkdown({
    reportInfo: record,
    sections: params.sections,
    promptConfig: params.promptConfig,
  });

  await streamChunks(markdown, 48, 16, params.onMessage, params.abortCtrl.signal);

  saveMockReportContent({
    id: params.reportId,
    reportContent: markdown,
    fallbackInfo: record,
  });
};

export const exportMarkdownAsDocFile = (
  fileName: string,
  markdownContent: string,
) => {
  const escaped = markdownContent
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
  const html = [
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">',
    '<head><meta charset="utf-8"><title>',
    fileName,
    '</title></head><body style="font-family: PingFang SC, Microsoft YaHei, sans-serif; line-height: 1.6;">',
    escaped,
    '</body></html>',
  ].join('');
  return new Blob(['\ufeff', html], {
    type: 'application/msword;charset=utf-8',
  });
};
