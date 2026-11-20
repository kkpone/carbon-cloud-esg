import { request } from '@api/request';
import I18N from '@src/lang/I18N';
import type {
  Landing,
  Mutation,
  Overview,
  Task,
  Model,
  Page,
  ModelQuery,
  ModelResolveRequest,
  PreparedModel,
  Submission,
  Snapshot,
  MemberTasks,
  MaterialDraftRequest,
  MaterialSubmitRequest,
  AssignmentRequest,
  CheckinMe,
  CarbonCompany,
  Leaderboard,
  LeaderboardQuery,
  PublishedResults,
  Poster,
  PosterRequest,
  PosterQuery,
} from './types';
import { invitationVisitor } from './visitor';
import {
  invitationOwner,
  invitationReceipt,
  saveInvitationReceipt,
} from './invitation';

type Envelope<T> = { code: number; msg: string; data: T };
export async function call<T>(url: string, data?: object): Promise<T> {
  try {
    const response = await request<Envelope<T>>({
      url,
      method: data ? 'post' : 'get',
      data,
      silentResponseError: true,
    });
    if (response.data.code !== 200)
      throw new Error(response.data.msg || I18N.carbonCompetition.failed);
    return response.data.data;
  } catch (error) {
    // 请求拦截器可能直接拒绝响应对象，也可能返回 AxiosError。
    type Failure = { msg?: string; data?: { errorKey?: string } };
    const failure = error as {
      message?: string;
      data?: Failure;
      response?: { data?: Failure };
    };
    const payload = failure?.response?.data || failure?.data;
    const errorKey =
      payload?.data?.errorKey || payload?.msg || failure?.message;
    if (errorKey === 'ENTERPRISE_DUPLICATE')
      throw new Error(I18N.carbonCompetition.design.enterpriseDuplicate);
    const d = I18N.carbonCompetition.design;
    const memberErrors: Record<string, string> = {
      REGISTRATION_MOBILE_REQUIRED: d.registrationMobileRequired,
      REGISTRATION_MOBILE_LOCKED: d.registrationMobileLocked,
      PHONE_INVALID: d.registrationMobileInvalid,
      PHONE_VERIFICATION_REQUIRED: d.phoneVerificationRequired,
      PARTICIPANT_CONFLICT: d.memberConflict,
      MEMBER_OTHER_TEAM: d.memberOtherTeam,
      MEMBER_INDIVIDUAL_REGISTERED: d.memberIndividualRegistered,
      MEMBER_ALREADY_IN_TEAM: d.memberAlreadyInTeam,
      MEMBER_REMOVED_OTHER_TEAM: d.memberRemovedOtherTeam,
    };
    if (
      errorKey &&
      Object.prototype.hasOwnProperty.call(memberErrors, errorKey)
    )
      throw new Error(memberErrors[errorKey]);
    const entryErrors: Record<string, string> =
      I18N.carbonCompetition.carbonEntryErrors;
    // Kiwi 对缺失键返回 truthy 的空字符串代理，不能用值的真伪判断是否存在。
    if (errorKey && Object.prototype.hasOwnProperty.call(entryErrors, errorKey))
      throw new Error(entryErrors[errorKey]);
    const modelErrors: Record<string, string> =
      I18N.carbonCompetition.taskUi.modelErrors;
    if (errorKey && Object.prototype.hasOwnProperty.call(modelErrors, errorKey))
      throw new Error(modelErrors[errorKey]);
    if (
      payload?.data?.errorKey === 'PAPER_EXHAUSTED' ||
      payload?.msg === 'PAPER_EXHAUSTED' ||
      failure?.message === 'PAPER_EXHAUSTED'
    )
      throw new Error(I18N.carbonCompetition.taskUi.paperExhausted);
    throw error;
  }
}
export const prefix = (id: string) =>
  `/ai/agent/competitions/${encodeURIComponent(id)}`;
export const overview = (code: string) =>
  call<Overview>(
    `/ai/agent/competitions/public/${encodeURIComponent(code)}/overview`,
  );
export function mutation(code: string, expectedVersion?: number): Mutation {
  return {
    requestId: crypto.randomUUID(),
    expectedVersion,
    firstTouchReceipt: invitationReceipt(code),
  };
}
export async function openInvitation(
  code: string,
  inviteCode: string,
): Promise<Landing> {
  const owner = invitationOwner(code);
  const visitor = await invitationVisitor(JSON.stringify([code, owner]));
  const receipt = invitationReceipt(code, owner);
  const response = await request<Envelope<Landing>>({
    url: `/ai/agent/competitions/public/${encodeURIComponent(
      code,
    )}/invites/${encodeURIComponent(inviteCode)}`,
    method: 'post',
    data: {
      visitorNonce: visitor,
      firstTouchReceipt: receipt,
    },
    silentResponseError: true,
  });
  if (response.data.code !== 200)
    throw new Error(response.data.msg || I18N.carbonCompetition.failed);
  const result = response.data.data;
  if (result.firstTouchReceipt)
    saveInvitationReceipt(code, owner, result.firstTouchReceipt);
  return result;
}

export const statusLabel = (value?: string) => {
  const labels: Record<string, string> = I18N.carbonCompetition.states;
  return value ? labels[value] || I18N.carbonCompetition.pending : '—';
};

export const getCompetitionTasks = (id: string) =>
  call<Task[]>(`${prefix(id)}/tasks`);
export const assignCompetitionPaper = (
  id: string,
  task: Task['taskCode'],
  data: AssignmentRequest,
) => call(`${prefix(id)}/tasks/${task}/assignment`, data);
export const downloadCompetitionPaper = (
  id: string,
  assignmentId: string,
  data: Mutation,
) =>
  call<{ url: string }>(
    `${prefix(id)}/assignments/${assignmentId}/download`,
    data,
  );
export const getCompetitionModels = (
  id: string,
  task: Task['taskCode'],
  query: ModelQuery,
) => {
  const params = new URLSearchParams({
    pageNum: String(query.pageNum),
    pageSize: String(query.pageSize),
    keyword: query.keyword || '',
    year: query.year || '',
  });
  return call<Page<Model>>(`${prefix(id)}/tasks/${task}/models?${params}`);
};
export const resolveCompetitionModel = (
  id: string,
  task: Task['taskCode'],
  data: ModelResolveRequest,
) => call<PreparedModel>(`${prefix(id)}/tasks/${task}/models/resolve`, data);
export const saveCompetitionMaterial = (
  id: string,
  task: Task['taskCode'],
  data: MaterialDraftRequest,
) => call<Submission>(`${prefix(id)}/tasks/${task}/draft`, data);
export const getCompetitionSubmission = (id: string, submissionId: string) =>
  call<Submission>(`${prefix(id)}/submissions/${submissionId}`);
export const submitCompetitionMaterial = (
  id: string,
  submissionId: string,
  data: MaterialSubmitRequest,
) => call<Submission>(`${prefix(id)}/submissions/${submissionId}/submit`, data);
export const retryCompetitionSnapshot = (
  id: string,
  submissionId: string,
  data: Mutation,
) =>
  call<Submission>(
    `${prefix(id)}/submissions/${submissionId}/snapshot/retry`,
    data,
  );
export const resetCompetitionMaterial = (
  id: string,
  submissionId: string,
  data: Mutation,
) =>
  call<Submission>(
    `${prefix(id)}/submissions/${submissionId}/snapshot/reset`,
    data,
  );
export const getCompetitionSnapshot = (id: string, submissionId: string) =>
  call<Snapshot>(`${prefix(id)}/submissions/${submissionId}/snapshot`);
export const getCompetitionTeamTasks = (id: string, teamId: string) =>
  call<MemberTasks[]>(`${prefix(id)}/teams/${teamId}/task-progress`);
export const getCompetitionCheckinMe = (id: string) =>
  call<CheckinMe>(`${prefix(id)}/checkin/me`);
export const bindCompetitionAccount = (id: string, data: Mutation) =>
  call(`${prefix(id)}/checkin/binding/retry`, data);
export const getCompetitionLeaderboard = (
  code: string,
  query: LeaderboardQuery,
) => {
  const params = new URLSearchParams({
    board: query.board,
    pageNum: String(query.pageNum),
    pageSize: String(query.pageSize),
    keyword: query.keyword || '',
  });
  if (query.batchId) params.set('batchId', query.batchId);
  return call<Leaderboard>(
    `/ai/agent/competitions/public/${encodeURIComponent(
      code,
    )}/checkin/rankings?${params}`,
  );
};
export const getCompetitionResults = (code: string, batchId?: string) =>
  call<PublishedResults>(
    `/ai/agent/competitions/public/${encodeURIComponent(code)}/results${
      batchId ? `?batchId=${encodeURIComponent(batchId)}` : ''
    }`,
  );
export const getCompetitionPoster = (
  code: string,
  shareCode: string,
  query: PosterQuery,
) => {
  const params = new URLSearchParams({
    kind: query.kind,
    batchId: query.batchId,
  });
  if (query.inviteCode) params.set('inviteCode', query.inviteCode);
  return call<Poster>(
    `/ai/agent/competitions/public/${encodeURIComponent(
      code,
    )}/posters/${encodeURIComponent(shareCode)}?${params}`,
  );
};
export const createCompetitionPoster = (id: string, data: PosterRequest) =>
  call<Poster>(`${prefix(id)}/posters/link`, data);

export const getCompetitionCarbonCompany = (id: string) =>
  call<CarbonCompany>(`${prefix(id)}/checkin/company`);

export async function getCompetitionResultPath(
  id: string,
  submissionId: string,
) {
  try {
    const result = await call<{
      sessionId?: string;
      workspaceProjectId?: string;
      shareId?: string;
    }>(`${prefix(id)}/submissions/${submissionId}/result-link`);
    if (result.sessionId) {
      const params = new URLSearchParams({ sessionId: result.sessionId });
      if (result.workspaceProjectId)
        params.set('projectId', result.workspaceProjectId);
      return `/system/carbonAgent?${params}`;
    }
    if (result.shareId)
      return `/share/agent/${encodeURIComponent(result.shareId)}`;
    throw new Error('RESULT_SESSION_UNAVAILABLE');
  } catch (error) {
    // 请求拦截器既可能抛出 Error，也可能直接拒绝响应对象。
    const failure = error as {
      message?: string;
      data?: { msg?: string; data?: { errorKey?: string } };
      response?: { data?: { msg?: string; data?: { errorKey?: string } } };
    };
    const payload = failure?.response?.data || failure?.data;
    const key = payload?.data?.errorKey || payload?.msg || failure?.message;
    const messages: Record<string, string> =
      I18N.carbonCompetition.taskUi.resultErrors;
    if (key && Object.prototype.hasOwnProperty.call(messages, key))
      throw new Error(messages[key]);
    throw error;
  }
}

export async function openCompetitionResult(id: string, submissionId: string) {
  // 在点击的同步调用栈中打开标签页，避免异步获取链接后被浏览器拦截。
  const resultTab = window.open('', '_blank');
  if (!resultTab) throw new Error(I18N.carbonAgent.allowPopups);
  try {
    resultTab.opener = null;
    resultTab.document.title = I18N.carbonCompetition.viewSnapshot;
    const path = await getCompetitionResultPath(id, submissionId);
    if (!resultTab.closed) resultTab.location.replace(path);
  } catch (error) {
    resultTab.close();
    throw error;
  }
}
