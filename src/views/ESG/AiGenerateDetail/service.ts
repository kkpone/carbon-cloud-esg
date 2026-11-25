import { request } from '@/api/request';

export type ReportExportFormat = 'word' | 'pdf';
export type ReportTranslateLang = 'zh-CN' | 'en-US' | 'zh-TW';

export const postDownloadReport = (
  data: {
    id: number;
    format?: ReportExportFormat;
    language?: ReportTranslateLang;
  },
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: { reportUrl: string; id: string } }>({
    url: '/esg/frameReport/esgReportDown',
    data,
    method: 'POST',
    ...options,
  });

export const postEditReport = (
  data: { id: number; reportContent: string },
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: { reportUrl: string; id: string } }>({
    url: '/esg/frameReport/esgReportEdit',
    data,
    method: 'POST',
    ...options,
  });

export const postTranslateReport = (
  data: {
    id: number;
    reportContent: string;
    targetLang: ReportTranslateLang;
  },
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: { reportContent?: string; content?: string } | string }>({
    url: '/esg/frameReport/esgReportTranslate',
    data,
    method: 'POST',
    ...options,
  });

export const translateTextBySurvey = (
  params: { fromLang: string; toLang: string; text: string },
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: string }>({
    url: '/esg/survey/transText',
    params,
    method: 'GET',
    ...options,
  });
