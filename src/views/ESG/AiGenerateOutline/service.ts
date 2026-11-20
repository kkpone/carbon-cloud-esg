import { request } from '@/api/request';

export type SectionAttachment = {
  id?: string;
  type: 'file' | 'link' | 'text';
  name: string;
  url?: string;
  content?: string;
  fileSize?: string;
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
  customInstruction?: string;
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

export const postEditOutline = (data: {
  id: number;
  outline: string;
  outlineSections?: OutlineSectionNode[];
  promptConfig?: ReportPromptConfig;
}) =>
  request<{ data: ReportDetailsType }>({
    url: '/esg/frameReport/esgOutlineEdit',
    data,
    method: 'POST',
  });

export const postEsgAnalyzeFilesExtractImages = (data: {
  reportId: number;
  sectionId?: string;
  referFiles?: ReportReferFile[];
}) =>
  request<{ data: ReportDetailsType }>({
    url: '/esg/frameReport/esgAnalyzeFilesExtractImages',
    data,
    method: 'POST',
  });

export const getFileStatus = (params: { reportId: number }) =>
  request<{ data: { status: 0 | 1 } }>({
    url: '/esg/frameReport/getFileStatus',
    params,
    method: 'get',
  });
