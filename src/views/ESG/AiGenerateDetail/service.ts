import { request } from '@/api/request';

export const postDownloadReport = (
  data: { id: number },
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
