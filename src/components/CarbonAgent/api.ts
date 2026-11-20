import I18N from '@/lang/I18N';
import type { LocaleType } from '@/lang/I18N';
import { getToken } from '@/utils/cookie';
import { logout } from '@/utils';
import {
  createSseParser,
  decodeFileName,
  parseJson,
  record,
  safeText,
  text,
} from './protocol';
import type { Data, Frame, Access, Attachment, Session } from './protocol';

const url = (path: string) => `${process.env.REACT_APP_API_URL || ''}${path}`;
export const sessionPath = (id: string) =>
  `/ai/agent/sessions/${encodeURIComponent(id)}`;
export class AgentError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}
const reasons = (): Record<string, string> => ({
  AGENT_SEAT_REQUIRED: I18N.carbonAgent.seatRequired,
  AGENT_TEAM_NOT_ENABLED: I18N.carbonAgent.teamNotEnabled,
  AGENT_TEAM_EXPIRED: I18N.carbonAgent.teamExpired,
  AGENT_TEAM_INITIALIZING: I18N.carbonAgent.teamInitializing,
  AGENT_MEMBER_DISABLED: I18N.carbonAgent.memberDisabled,
  AGENT_TEAM_REVOKED: I18N.carbonAgent.teamRevoked,
  AGENT_MEMBER_LIMIT_REACHED: I18N.carbonAgent.limitReached,
  AGENT_POINT_INSUFFICIENT: I18N.carbonAgent.pointsInsufficient,
  AGENT_POINTS_INSUFFICIENT: I18N.carbonAgent.pointsInsufficient,
  AGENT_CARBON_CONVERSATION_PRIVATE: I18N.carbonAgent.privateConversation,
  AGENT_CARBON_ANALYSIS_READ_ONLY: I18N.carbonAgent.analysisReadOnly,
  AGENT_TEAM_MANAGEMENT_FORBIDDEN: I18N.carbonAgent.managementForbidden,
  AGENT_SESSION_CHANNEL_FORBIDDEN: I18N.carbonAgent.channelForbidden,
});
export const reasonText = (reason?: string) =>
  reasons()[reason || ''] ||
  safeText(reason) ||
  I18N.carbonAgent.accessUnavailable;
async function checked(response: Response) {
  const payload = record(parseJson(await response.text()));
  const code = text(
    record(payload.data).reasonCode || payload.msg || payload.code,
  );
  if (!response.ok || (payload.code !== undefined && payload.code !== 200)) {
    if (
      response.status === 401 ||
      payload.code === 401 ||
      code === 'AGENT_LOGIN_REQUIRED'
    )
      logout();
    throw new AgentError(reasonText(code), code);
  }
  return payload.data;
}
export async function api<T>(
  path: string,
  body?: Data | FormData,
  signal?: AbortSignal,
): Promise<T> {
  const token = getToken();
  const response = await fetch(url(path), {
    method: body ? 'POST' : 'GET',
    signal,
    headers: {
      Authorization: token,
      ...(body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
    },
    body:
      body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (token !== getToken())
    throw new DOMException(I18N.carbonAgent.identityChanged, 'AbortError');
  return (await checked(response)) as T;
}
export const workspaceAccess = (signal?: AbortSignal) =>
  api<Access>('/management/agent/workspace-access', undefined, signal);
export const createSession = (body: Data, signal?: AbortSignal) =>
  api<Session>('/ai/agent/sessions/createSession', body, signal);
export async function uploadFile(
  sessionId: string,
  file: File,
  signal?: AbortSignal,
): Promise<Attachment> {
  if (file.size > 20 * 1024 * 1024)
    throw new AgentError(I18N.carbonAgent.fileTooLarge);
  const body = new FormData();
  body.append('file', file);
  body.append('sessionId', sessionId);
  const result = await api<Data>('/ai/agent/files/upload', body, signal);
  if (!result.fileId) throw new AgentError(I18N.carbonAgent.missingFileId);
  return {
    fileId: text(result.fileId),
    name: decodeFileName(result.fileName || result.name) || file.name,
  };
}
export async function stream(
  path: string,
  signal: AbortSignal,
  onFrame: (frame: Frame) => void,
  body?: Data,
) {
  const token = getToken();
  const response = await fetch(url(path), {
    method: body ? 'POST' : 'GET',
    signal,
    headers: {
      Authorization: token,
      Accept: 'text/event-stream',
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (
    !response.ok ||
    !response.headers.get('content-type')?.includes('text/event-stream')
  ) {
    await checked(response);
    throw new AgentError(I18N.carbonAgent.streamMissing);
  }
  if (!response.body) throw new AgentError(I18N.carbonAgent.streamUnavailable);
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parse = createSseParser(frame => {
    if (token === getToken() && !signal.aborted) onFrame(frame);
  });
  try {
    while (!signal.aborted) {
      // SSE 解码和游标依赖前一分片，不能并发读取。
      // eslint-disable-next-line no-await-in-loop
      const { value, done } = await reader.read();
      parse(decoder.decode(value, { stream: !done }), done);
      if (done) break;
    }
  } finally {
    await reader.cancel();
    reader.releaseLock();
  }
}
export async function openTeamManagement(locale: LocaleType) {
  const tab = window.open('about:blank', '_blank');
  if (!tab) throw new AgentError(I18N.carbonAgent.allowPopups);
  tab.opener = null;
  try {
    const result = await api<{ redirectUrl: string }>(
      '/auth/token/agent-sso/ticket',
      { source: 'CARBON_CLOUD_TEAM_MANAGEMENT', lang: locale },
    );
    const target = new URL(result.redirectUrl);
    if (!['https:', 'http:'].includes(target.protocol))
      throw new AgentError(I18N.carbonAgent.invalidRedirect);
    tab.location.href = target.href;
  } catch (error) {
    tab.close();
    throw error;
  }
}
