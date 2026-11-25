import { request } from '@/api/request';

import {
  GapDiagnosisItem,
  HighlightCaseItem,
  InterviewQuestionItem,
  PeerBenchmarkRow,
  PreResearchProject,
} from './types';

export const getPreResearchList = (
  params?: { keyword?: string; status?: string },
  options?: { silentResponseError?: boolean },
) =>
  request<{ rows: PreResearchProject[] }>({
    url: '/esg/preResearch/list',
    method: 'GET',
    params,
    ...options,
  });

export const getPreResearchDetail = (
  id: string,
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: PreResearchProject }>({
    url: '/esg/preResearch/detail',
    method: 'GET',
    params: { id },
    ...options,
  });

export const savePreResearchProject = (
  data: PreResearchProject,
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: PreResearchProject }>({
    url: '/esg/preResearch/save',
    method: 'POST',
    data,
    ...options,
  });

export const deletePreResearchProjectApi = (
  id: string,
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: boolean }>({
    url: `/esg/preResearch/${id}`,
    method: 'DELETE',
    ...options,
  });

export const generatePreResearchGapApi = (
  id: string,
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: GapDiagnosisItem[] }>({
    url: `/esg/preResearch/${id}/generateGap`,
    method: 'POST',
    ...options,
  });

export const generatePreResearchBenchmarkApi = (
  id: string,
  options?: { silentResponseError?: boolean },
) =>
  request<{
    data: {
      benchmarkRows: PeerBenchmarkRow[];
      highlightCases: HighlightCaseItem[];
    };
  }>({
    url: `/esg/preResearch/${id}/generateBenchmark`,
    method: 'POST',
    ...options,
  });

export const generatePreResearchInterviewApi = (
  id: string,
  options?: { silentResponseError?: boolean },
) =>
  request<{ data: InterviewQuestionItem[] }>({
    url: `/esg/preResearch/${id}/generateInterview`,
    method: 'POST',
    ...options,
  });
