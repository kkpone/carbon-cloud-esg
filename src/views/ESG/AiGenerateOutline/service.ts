import { request } from '@/api/request';

export type SectionMaterialCategory =
  | 'policy'
  | 'ledger'
  | 'certificate'
  | 'case_material'
  | 'other';

export type SectionWritingTemplate =
  | 'auto'
  | 'five_step'
  | 'four_pillar'
  | 'star_case';

export type SectionAttachment = {
  id?: string;
  type: 'file' | 'link' | 'text';
  name: string;
  url?: string;
  content?: string;
  fileSize?: string;
  /** 资料用途标签：制度文件 / 数据台账 / 资质证书 / 案例素材 / 其他 */
  category?: SectionMaterialCategory;
  /** 章节级依据说明 */
  note?: string;
};

export type SectionIndicatorRef = {
  indicatorId: string | number;
  code?: string;
  name: string;
  unitName?: string;
  indicatorValue?: string | number;
  standardStr?: string;
  sourceType: 0 | 1;
};

export type OutlineSectionNode = {
  id: string;
  title: string;
  description?: string;
  attachments: SectionAttachment[];
  indicators: SectionIndicatorRef[];
  sectionPrompt?: string;
  /** 本章节/小节采用的写作模板（默认 auto，由全局规则与章节属性自动适配） */
  writingTemplate?: SectionWritingTemplate;
  children?: OutlineSectionNode[];
};

export type ReportPromptTone =
  | 'formal_disclosure'
  | 'concise_executive'
  | 'investor_oriented';

export type ReportPromptLanguage = 'zh-CN' | 'zh-TW' | 'en-US';

export type ReportPromptLength = 'standard' | 'detailed';

export type ReportPromptConfig = {
  tone: ReportPromptTone;
  language: ReportPromptLanguage;
  lengthLevel: ReportPromptLength;
  strictDataMode: boolean;
  highlightStandards: boolean;
  /** 启用《ESG报告文笔风格四项基本要求》（第三人称客观视角、动作+数据闭环、制度概括转述、时间/单位/数字统一） */
  enableStyleGuide: boolean;
  /** 常规议题小节启用“五步法”标准句式（方针理念→组织架构→制度体系→核心举措→定量绩效） */
  enableFiveStepTemplate: boolean;
  /** 核心实质性议题启用“四支柱框架”（治理→战略→影响/风险/机遇管理→指标与目标） */
  enableFourPillarTemplate: boolean;
  /** 案例素材启用“STAR四步法”改写公式（背景痛点→改造目标→核心动作→量化结果） */
  enableStarCaseTemplate: boolean;
  /** 正文统一使用的企业简称（缺省时取报告企业名称或“公司”） */
  companyShortName?: string;
  /** 全文统一的温室气体排放单位表述，如“吨二氧化碳当量”或“tCO2e” */
  preferredCarbonUnit?: string;
  customInstruction?: string;
  /** 汇总给后端大模型直接消费的完整系统提示词 */
  systemPrompt?: string;
};

export type ReportReferFile = {
  name: string;
  url: string;
};

export type ReportDetailsType = {
  id: number;
  period: string;
  reportName: string;
  reportUrl: string;
  outline: string;
  reportContent: string | null;
  orgName?: string;
  frameId?: number | string | null;
  indicatorType?: 0 | 1;
  standardIds?: string;
  userContent?: string;
  referFiles?: ReportReferFile[];
  referLink?: string[];
  referText?: string[];
  outlineSections?: OutlineSectionNode[];
  promptConfig?: Partial<ReportPromptConfig>;
};

export const getReportInfo = (params: { id: number }) =>
  request<{ data: ReportDetailsType }>({
    url: '/esg/frameReport/reportInfo',
    params,
  });

export const postEditOutline = (
  data: {
    id: number;
    outline: string;
    outlineSections?: OutlineSectionNode[];
    promptConfig?: ReportPromptConfig;
  },
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: ReportDetailsType }>({
    url: '/esg/frameReport/esgOutlineEdit',
    data,
    method: 'POST',
    ...options,
  });

export const postEsgAnalyzeFilesExtractImages = (
  data: {
    reportId: number;
    sectionId?: string;
    referFiles?: ReportReferFile[];
  },
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: ReportDetailsType }>({
    url: '/esg/frameReport/esgAnalyzeFilesExtractImages',
    data,
    method: 'POST',
    ...options,
  });

export const getFileStatus = (params: { reportId: number }) =>
  request<{ data: { status: 0 | 1 } }>({
    url: '/esg/frameReport/getFileStatus',
    params,
    method: 'get',
  });
