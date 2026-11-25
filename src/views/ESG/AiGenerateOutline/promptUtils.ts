import {
  OutlineSectionNode,
  ReportDetailsType,
  ReportPromptConfig,
  ReportPromptLanguage,
  SectionAttachment,
  SectionMaterialCategory,
  SectionWritingTemplate,
} from './service';

export const DEFAULT_REPORT_PROMPT_CONFIG: ReportPromptConfig = {
  tone: 'formal_disclosure',
  language: 'zh-CN',
  lengthLevel: 'standard',
  strictDataMode: true,
  highlightStandards: true,
  enableStyleGuide: true,
  enableFiveStepTemplate: true,
  enableFourPillarTemplate: true,
  enableStarCaseTemplate: true,
  companyShortName: '',
  preferredCarbonUnit: 'tco2e_cn',
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

export const CARBON_UNIT_TEXT_MAP: Record<string, string> = {
  tco2e_cn: '吨二氧化碳当量',
  tCO2e: 'tCO2e',
};

export const resolveCarbonUnitLabel = (unit?: string): string => {
  if (!unit) {
    return CARBON_UNIT_TEXT_MAP.tco2e_cn;
  }
  return CARBON_UNIT_TEXT_MAP[unit] || unit;
};

export const inferMaterialCategoryFromName = (
  name: string,
): SectionMaterialCategory => {
  const lower = name.toLowerCase();
  if (/(制度|办法|规定|手册|政策|准则|章程|policy)/.test(lower)) {
    return 'policy';
  }
  if (/(台账|明细|统计|能耗|排放|清单|excel|\.xlsx?$|\.csv$)/.test(lower)) {
    return 'ledger';
  }
  if (/(证书|认证|iso|报告|检测|核查|cert)/.test(lower)) {
    return 'certificate';
  }
  if (/(案例|技改|项目|新闻|总结|实践|case)/.test(lower)) {
    return 'case_material';
  }
  return 'other';
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

const MATERIAL_CATEGORY_PROMPT_LABEL: Record<SectionMaterialCategory, string> =
  {
    policy: '制度文件',
    ledger: '数据台账',
    certificate: '资质证书',
    case_material: '案例素材',
    other: '补充材料',
  };

const WRITING_TEMPLATE_PROMPT_LABEL: Record<SectionWritingTemplate, string> = {
  auto: '自动匹配（常规议题用五步法，核心议题用四支柱，案例用STAR）',
  five_step: '五步法（方针理念→组织架构→制度体系→核心举措→定量绩效）',
  four_pillar: '四支柱（治理→战略→影响/风险/机遇管理→指标与目标）',
  star_case: 'STAR四步法案例框（背景痛点→改造目标→核心动作→量化结果）',
};

export const ESG_WRITING_STYLE_GUIDE_RULES = [
  '1. 保持客观克制的中立视角：全文统一使用第三人称（在《关于本报告》中定义简称后，全文统一称“公司”或企业简称），禁用“我们”“我司”“咱厂”等第一人称；禁止出现“在公司领导的英明决策下”“热火朝天地干劲十足”等主观情绪化或宣传夸大表述，只客观陈述制度、动作和结果。',
  '2. 坚持“管理动作+定量数据”闭环：不写没有证据支撑的空话。每陈述一项管理动作或技改举措，均须紧跟投入金额、项目数量、覆盖率、节能量、培训人次等定量绩效；若所绑定的章节依据与指标中缺少具体数值，在严格防幻觉模式下以“[待补充：XXX]”占位，严禁虚构。',
  '3. 制度条文“概括转述”而非原文照搬：对上传的《管理办法》等制度文件，不得照抄“第一条、第二条、第三条”等条款原文，应概括提炼为2—3句，交代清楚该制度管控什么业务、覆盖哪些主体、核心管控流程分哪几步。',
  '4. 时间、单位与数字格式严格统一：正文统一写明具体年份（如“{period}年”或“报告期内”），避免“今年、去年、目前、近日”；四位以上数字统一加千分位逗号（如 12,450 吨）；同一张表内小数位数保持一致（百分比统一保留两位小数如 98.50%）；同一计量单位全书统一（如统一使用“{carbonUnit}”），不得混写汉字与英文缩写。',
];

export const ESG_FIVE_STEP_SENTENCE_TEMPLATES = [
  '第一步 政策方针与合规承诺（1—2句）：“[公司简称]严格遵守《[国家相关法律法规名称]》等法律法规及运营所在地监管要求，秉持“[企业在该领域的管理方针或理念]”的原则，持续完善[某领域]管理体系，致力于[核心管理目标]。”',
  '第二步 组织架构与职责分工（2—3句）：“在管理架构方面，公司建立起由[最高监督机构，如董事会ESG委员会/安全生产委员会]统筹指导、[分管高管/归口职能部门]日常监管、[各下属分子公司/生产基地]具体落实的三级管理机制，明确各级管理人员的权责边界，并将[关键绩效指标]纳入管理层年度绩效考核，确保管理要求层层落实。”',
  '第三步 内部制度与体系认证（2—3句）：“在制度建设方面，公司于报告期内新制定/修订了《[内部制度名称A]》《[内部制度名称B]》，对[核心管控环节]作出了明确规范。截至{period}年末，公司旗下已有[X]家生产基地通过[ISO 14001/ISO 45001等]认证，认证覆盖率达[X]%。”',
  '第四步 年度具体执行举措（分点叙述）：“报告期内，公司围绕[管控重点A、B、C]深入开展日常管理工作：（1）[四字小标题，如源头减量管控]：通过推进[具体工艺改进或管理动作]，有效降低[某类资源消耗或风险]；（2）[四字小标题，如全员风险排查]：定期组织开展[专项检查/应急演练]，针对发现的问题建立“排查—整改—复核—销号”闭环管理台账；（3）[四字小标题，如宣贯培训赋能]：面向[覆盖人群]开展专项培训，强化全员合规与风险防范意识。”',
  '第五步 年度定量绩效收尾（1—2句）：“{period}年，公司累计投入[X]万元用于[环保技改/安全生产保障]，全年共开展专项检查与应急演练[X]次，隐患整改闭环率达[100]%，[核心指标]较上年下降[X]%，报告期内未发生重大[环境污染违规事件/生产安全亡人事故/商业贿赂诉讼案件]。”',
];

export const ESG_FOUR_PILLAR_RULES = [
  '核心实质性议题（如应对气候变化、能源与碳排放、可持续供应链等）须按交易所/ISSB“四支柱框架”展开：',
  '- 治理（Governance）：披露董事会及ESG专门委员会的监督职责、审议频次与高管薪酬考核挂钩机制；',
  '- 战略（Strategy）：识别相关物理/转型风险与机遇，评估其对业务模式、价值链及财务状况的短中长期影响；',
  '- 影响、风险和机遇管理（Risk Management）：说明识别、评估、分级应对风险的标准流程及其与公司全面风险管理体系的融合；',
  '- 指标与目标（Metrics & Targets）：披露核心定量指标（含历史对比）、阶段性量化目标及年度达成进展。',
];

export const ESG_STAR_CASE_FORMULA = [
  '将各部门提交的工作总结、新闻稿或项目素材改写为约300字的专业报告专栏案例，严格遵循STAR四步法：',
  '- 背景与痛点（Situation，约50字）：写明具体基地/部门在何种业务场景下遇到什么明确问题；',
  '- 改造目标（Target，约30字）：写明项目启动时间及拟达成的降耗、减排或合规目标；',
  '- 核心动作（Action，约150字）：使用精准动词分点说明2—3项关键技术或管理动作；',
  '- 量化结果（Result，约70字，必不可少）：必须以具体数字收尾（投运时间、节能量、减排量、成本节约等）。',
];

const formatAttachmentBrief = (att: SectionAttachment): string => {
  const categoryLabel =
    MATERIAL_CATEGORY_PROMPT_LABEL[att.category || 'other'] || '补充材料';
  const typeTag =
    att.type === 'file' ? '文件' : att.type === 'link' ? '链接' : '文本';
  const noteSuffix = att.note?.trim() ? `（说明：${att.note.trim()}）` : '';
  return `[${categoryLabel}/${typeTag}] ${att.name}${noteSuffix}`;
};

const buildSectionEvidenceManifest = (
  nodes: OutlineSectionNode[],
  inheritedAttachments: SectionAttachment[] = [],
  parentPath = '',
): string[] => {
  const lines: string[] = [];
  nodes.forEach((node, index) => {
    const seq = parentPath ? `${parentPath}.${index + 1}` : `${index + 1}`;
    const ownAttachments = node.attachments || [];
    const ownIndicators = node.indicators || [];
    const effectiveTemplate = node.writingTemplate || 'auto';
    const hasCustomContext =
      ownAttachments.length > 0 ||
      inheritedAttachments.length > 0 ||
      ownIndicators.length > 0 ||
      Boolean(node.sectionPrompt?.trim()) ||
      effectiveTemplate !== 'auto';

    if (hasCustomContext) {
      const segments: string[] = [`- ${seq} ${node.title}`];
      if (effectiveTemplate !== 'auto') {
        segments.push(
          `写作模板：${WRITING_TEMPLATE_PROMPT_LABEL[effectiveTemplate]}`,
        );
      }
      if (ownAttachments.length > 0) {
        segments.push(
          `本节专属依据(${ownAttachments.length})：${ownAttachments
            .map(formatAttachmentBrief)
            .join('；')}`,
        );
      } else if (inheritedAttachments.length > 0) {
        segments.push(
          `继承上级章节依据(${
            inheritedAttachments.length
          })：${inheritedAttachments.map(att => att.name).join('、')}`,
        );
      }
      if (ownIndicators.length > 0) {
        segments.push(`关联指标(${ownIndicators.length}项)`);
      }
      if (node.sectionPrompt?.trim()) {
        segments.push(`专项要求：${node.sectionPrompt.trim()}`);
      }
      lines.push(segments.join(' | '));
    }

    if (node.children?.length) {
      const nextInherited = [...inheritedAttachments, ...ownAttachments];
      lines.push(
        ...buildSectionEvidenceManifest(node.children, nextInherited, seq),
      );
    }
  });
  return lines;
};

export const buildReportSystemPrompt = (params: {
  reportInfo?: Partial<ReportDetailsType>;
  sections: OutlineSectionNode[];
  config: ReportPromptConfig;
}): string => {
  const { reportInfo, sections, config } = params;
  const period = reportInfo?.period || String(new Date().getFullYear() - 1);
  const shortName =
    config.companyShortName?.trim() || reportInfo?.orgName?.trim() || '公司';
  const carbonUnit = resolveCarbonUnitLabel(config.preferredCarbonUnit);
  const stats = collectBoundStats(sections);
  const toneMap = {
    formal_disclosure: '合规披露（客观、严谨、可审计）',
    concise_executive: '高管精简（结论先行、突出量化亮点）',
    investor_oriented: '投资人导向（突出财务实质性、风险韧性与绩效）',
  };
  const lengthMap = {
    standard: '标准披露篇幅',
    detailed: '详尽展开篇幅',
  };

  const replaceVars = (tpl: string) =>
    tpl
      .replace(/\{period\}/g, period)
      .replace(/\{carbonUnit\}/g, carbonUnit)
      .replace(/\[公司简称\]/g, shortName);

  const blocks: string[] = [
    `【角色与任务】\n你是资深ESG报告编制顾问，正在为“${
      reportInfo?.orgName || shortName
    }”编写${period}年度环境、社会及管治（ESG）报告。正文统一简称“${shortName}”（或“公司”），输出语言：${
      config.language
    }，披露文风：${toneMap[config.tone]}，篇幅控制：${
      lengthMap[config.lengthLevel]
    }。`,
  ];

  blocks.push(
    [
      '【章节依据优先级与防幻觉规则】',
      '1. 按章节/小节隔离取证：撰写任一章节或小节时，必须优先以该节点上传的专属文件、链接、文本及关联指标作为核心生成依据；若小节未单独上传文件，可继承其父章节已绑定的依据文件，最后再参考全局报告资料。',
      config.strictDataMode
        ? '2. 严格数据防幻觉：严禁编造任何制度名称、认证证书、项目投入金额或定量指标数值。已绑定资料和指标中未提及的数据统一使用“[待补充：具体指标/凭证名称]”占位提示。'
        : '2. 数据引用策略：优先引用已绑定指标与附件中的精确数值，缺失量化项以定性进展衔接，不夸大承诺。',
      config.highlightStandards
        ? '3. 标准条款索引：在对应章节末尾标注对标的标准编号（如沪深北交易所指引、港交所守则、GRI、ISSB S1/S2条款）。'
        : '3. 标准结构遵循：按所选披露框架组织行文，不强制输出行内条款编号。',
    ].join('\n'),
  );

  if (config.enableStyleGuide) {
    blocks.push(
      [
        '【ESG报告文笔风格四项基本要求】',
        ...ESG_WRITING_STYLE_GUIDE_RULES.map(replaceVars),
      ].join('\n'),
    );
  }

  if (config.enableFiveStepTemplate) {
    blocks.push(
      [
        '【常态化议题章节“五步法”标准句式模板（方针理念→组织架构→制度体系→核心举措→定量绩效）】',
        '适用于水资源管理、废弃物管理、安全生产、员工培训、供应商管理、反商业贿赂、信息安全等常规三级小节：',
        ...ESG_FIVE_STEP_SENTENCE_TEMPLATES.map(replaceVars),
      ].join('\n'),
    );
  }

  if (config.enableFourPillarTemplate) {
    blocks.push(
      ['【核心议题“四支柱框架”要求】', ...ESG_FOUR_PILLAR_RULES].join('\n'),
    );
  }

  if (config.enableStarCaseTemplate) {
    blocks.push(
      ['【亮点案例框“STAR四步法”改写公式】', ...ESG_STAR_CASE_FORMULA].join(
        '\n',
      ),
    );
  }

  const manifest = buildSectionEvidenceManifest(sections);
  blocks.push(
    [
      `【大纲章节与依据映射摘要（共${stats.sectionCount}个章节/小节，已关联${stats.indicatorCount}项指标、${stats.attachmentCount}份章节依据）】`,
      ...(manifest.length > 0
        ? manifest
        : [
            '- 当前各章节暂未单独挂载专属依据，将结合全局参考资料与行业通用合规结构生成。',
          ]),
    ].join('\n'),
  );

  if (reportInfo?.userContent?.trim()) {
    blocks.push(`【创建阶段补充要求】\n${reportInfo.userContent.trim()}`);
  }

  if (config.customInstruction?.trim()) {
    blocks.push(`【全局自定义提示词补充】\n${config.customInstruction.trim()}`);
  }

  return blocks.join('\n\n');
};

export const buildReportPromptPreview = (params: {
  reportInfo?: Partial<ReportDetailsType>;
  sections: OutlineSectionNode[];
  config: ReportPromptConfig;
}) => buildReportSystemPrompt(params);
