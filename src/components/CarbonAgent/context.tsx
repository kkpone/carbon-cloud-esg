import I18N from '@/lang/I18N';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import { LocaleContext } from '@/components/LocaleProvider';
import type { RootState } from '@/store';
import { getToken } from '@/utils/cookie';
import {
  api,
  createSession,
  reasonText,
  sessionPath,
  stream,
  uploadFile,
  workspaceAccess,
} from './api';
import {
  applyEvent,
  cardPayload,
  list,
  normalizeTrace,
  parsedRecord,
  record,
  running,
  safeText,
  text,
} from './protocol';
import type {
  Access,
  Attachment,
  Data,
  EnterpriseContext,
  Session,
  Skill,
  Turn,
} from './protocol';
import { hasModelWrite } from './modelChanges';
import { hasEnterpriseWrite, hasEnterpriseWriteCard } from './enterpriseChanges';

export type ModelingInput = {
  productId?: string;
  message: string;
  files: File[];
  modelingOptions: { scope: number; factorScope?: string };
};
export type EnterpriseAccountingInput = {
  context: EnterpriseContext;
  message: string;
  files: File[];
  skill?: Skill;
};
type Draft = {
  message: string;
  files: File[];
  attachments: Attachment[];
  skill?: Skill;
  modelingOptions?: ModelingInput['modelingOptions'];
};
type Chat = {
  session: Session;
  turns: Turn[];
  draft: Draft;
  modelSkills?: Skill[];
  blocked?: string;
  busy: boolean;
  uncertain?: boolean;
  messageId?: string;
  cursor: number;
  loaded?: boolean;
  scrollTop?: number;
  formDrafts: Record<string, Data>;
  handledRequests: string[];
};
type State = {
  opened: boolean;
  loading: boolean;
  error?: string;
  access?: Access;
  chat?: Chat;
  revision: number;
};
type AgentContext = State & {
  openGeneral: (prefill?: string, fresh?: boolean) => Promise<void>;
  openModel: (
    accountId: string,
    productId?: string,
    prefill?: string,
  ) => Promise<void>;
  openEnterprise: (
    context: EnterpriseContext,
    prefill?: string,
  ) => Promise<void>;
  startModeling: (input: ModelingInput) => Promise<void>;
  startEnterpriseAccounting: (input: EnterpriseAccountingInput) => Promise<void>;
  selectSession: (id: string) => Promise<void>;
  close: () => void;
  updateDraft: (patch: Partial<Draft>) => void;
  send: (body?: Data) => Promise<void>;
  handoff: (payload: Data) => Promise<void>;
  retry: () => Promise<void>;
  cancel: () => Promise<void>;
  refreshAccess: () => Promise<Access>;
  saveFormDraft: (id: string, values: Data) => void;
};
const Context = createContext<AgentContext | null>(null);
const emptyDraft = (): Draft => ({ message: '', files: [], attachments: [] });
const newChat = (session: Session): Chat => ({
  session,
  turns: [],
  draft: emptyDraft(),
  busy: false,
  cursor: 0,
  formDrafts: {},
  handledRequests: [],
});
const ENTERPRISE_SKILLS: Skill[] = [
  'enterprise_modeling',
  'enterprise_data_analysis',
  'enterprise_generate_report',
];
export const normalizeEnterpriseYear = (value?: unknown): string => {
  const raw = text(value).trim();
  if (!raw) return '';
  const fourDigit = raw.match(/\d{4}/)?.[0];
  if (fourDigit) return fourDigit;
  const fyMatch = raw.match(/^fy\s*(\d{2})$/i);
  if (fyMatch) return `20${fyMatch[1]}`;
  return /^\d+$/.test(raw) ? raw : '';
};

const isEnterpriseSessionLike = (session: Session) =>
  session.domain === 'enterprise' ||
  Boolean(session.computationId) ||
  Boolean(session.entry?.startsWith('enterprise_')) ||
  Boolean(session.quickSkill?.startsWith('enterprise_'));
export function CarbonAgentProvider({ children }: { children: ReactNode }) {
  const { locale } = useContext(LocaleContext);
  // 使用原始登录凭证作为隔离边界，不拆 token 或自行替换组织后缀。
  const token = useSelector(
    (state: RootState) => state.companyUserInfo?.access_token || '',
  );
  const [state, setState] = useState<State>({
    opened: false,
    loading: false,
    revision: 0,
  });
  const stateRef = useRef(state);
  const cache = useRef(new Map<string, Chat>());
  const controller = useRef<AbortController>();
  const generation = useRef(0);
  const identity = useRef(token);
  const storageKey = useRef('');
  const sendLock = useRef(false);
  const modelTarget = useRef<{
    accountId: string;
    productId?: string;
    prefill?: string;
  }>();
  const enterpriseTarget = useRef<{
    context: EnterpriseContext;
    prefill?: string;
  }>();
  const patch = (next: Partial<State>) => {
    const updated = { ...stateRef.current, ...next };
    stateRef.current = updated;
    if (updated.chat)
      cache.current.set(updated.chat.session.sessionId, updated.chat);
    setState(updated);
  };
  const patchChat = (chat: Chat, next: Partial<Chat>) => {
    Object.assign(chat, next);
    cache.current.set(chat.session.sessionId, chat);
    if (stateRef.current.chat?.session.sessionId === chat.session.sessionId)
      patch({ chat });
  };
  // 模型状态由 ref 中的同一会话对象维护，UI 快照不参与网络控制。
  const current = () => {
    const id = stateRef.current.chat?.session.sessionId;
    return id ? cache.current.get(id) : undefined;
  };
  const begin = () => {
    controller.current?.abort();
    controller.current = new AbortController();
    generation.current += 1;
    return { signal: controller.current.signal, epoch: generation.current };
  };
  const active = (epoch: number) =>
    generation.current === epoch && identity.current === getToken();
  const remember = (chat: Chat) => {
    if (!storageKey.current) return;
    sessionStorage.setItem(
      storageKey.current,
      JSON.stringify({
        sessionId: chat.session.sessionId,
        messageId: chat.messageId,
      }),
    );
  };
  const fail = (error: unknown) => {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    patch({
      error:
        safeText(error instanceof Error ? error.message : error) ||
        I18N.carbonAgent.requestFailed,
      loading: false,
    });
  };
  const refreshAccess = async () => {
    const access = await workspaceAccess();
    patch({ access });
    return access;
  };
  const requireAccess = async () => {
    const access = await refreshAccess();
    if (!access.canUseAi)
      throw new Error(reasonText(access.aiReasonCode || access.reasonCode));
  };
  const readTrace = async (chat: Chat, signal: AbortSignal) => {
    const trace = await api<Data>(
      `${sessionPath(chat.session.sessionId)}/trace`,
      undefined,
      signal,
    );
    const normalized = normalizeTrace(trace);
    Object.assign(chat, {
      session: { ...chat.session, ...normalized.session },
      turns: normalized.turns,
      loaded: true,
    });
    const modelCard = chat.turns
      .flatMap(turn => turn.blocks)
      .map(cardPayload)
      .find(card => card.cardType === 'product_carbon_model');
    const enterpriseCard = chat.turns
      .flatMap(turn => turn.blocks)
      .map(cardPayload)
      .find(
        card =>
          card.cardType === 'enterprise_carbon_computation' ||
          card.cardType === 'enterprise_carbon_report' ||
          text(card.module).toLowerCase() === 'enterprise',
      );
    if (modelCard) {
      chat.session.accountId =
        text(record(modelCard.bizRef).accountId || modelCard.bizId) ||
        chat.session.accountId;
      chat.session.domain = 'product';
      chat.modelSkills = ['model_update', 'data_analysis'];
      if (chat.draft.skill === 'build_model') chat.draft.skill = undefined;
    } else if (chat.session.accountId && !chat.modelSkills) {
      chat.session.domain = 'product';
      chat.modelSkills =
        chat.session.quickSkill === 'build_model'
          ? ['build_model']
          : ['model_update', 'data_analysis'];
    } else if (enterpriseCard || isEnterpriseSessionLike(chat.session)) {
      chat.session.domain = 'enterprise';
      if (!chat.modelSkills) {
        chat.modelSkills = ENTERPRISE_SKILLS;
      }
    }
    return trace;
  };
  const run = async (
    chat: Chat,
    body: Data | undefined,
    epoch: number,
    signal: AbortSignal,
  ) => {
    let completed = false;
    let retries = 0;
    let streamError: unknown;
    const receivedEvents: Data[] = [];
    const receive = (frame: { id?: string; event: string; data: Data }) => {
      if (!active(epoch) || signal.aborted) return;
      const event: Data = {
        ...frame.data,
        eventType: frame.data.eventType || frame.event,
      };
      const id = text(event.messageId || record(event.data).messageId);
      if (id && chat.messageId && id !== chat.messageId)
        throw new Error(I18N.carbonAgent.messageMismatch);
      if (id) chat.messageId = id;
      if (frame.id && /^\d+$/.test(frame.id) && Number(frame.id) <= chat.cursor)
        return;
      receivedEvents.push(event);
      const messageId = chat.messageId || 'pending';
      let index = chat.turns.findIndex(
        turn => turn.role === 'assistant' && turn.messageId === messageId,
      );
      if (index < 0) {
        chat.turns.push({
          id: `assistant-${messageId}`,
          messageId,
          role: 'assistant',
          content: '',
          blocks: [],
          tools: [],
        });
        index = chat.turns.length - 1;
      }
      chat.turns = chat.turns.map((turn, position) =>
        position === index ? applyEvent(turn, event) : turn,
      );
      if (event.eventType === 'login_required')
        throw new Error(I18N.carbonAgent.loginExpired);
      if (event.eventType === 'completed') completed = true;
      if (frame.id && /^\d+$/.test(frame.id)) chat.cursor = Number(frame.id);
      remember(chat);
      patch({ chat, error: undefined });
    };
    try {
      if (body) {
        try {
          await stream(
            `${sessionPath(chat.session.sessionId)}/messages/chatting`,
            signal,
            receive,
            body,
          );
        } catch (error) {
          if (signal.aborted) return;
          streamError = error;
        }
      }
      while (!completed && active(epoch) && !signal.aborted) {
        // POST 后连接中断且未收到 message_start，也只查历史，不重复 POST。
        if (!chat.messageId) {
          // 必须先从历史确认原 messageId，才能恢复订阅；不能重发 POST。
          // eslint-disable-next-line no-await-in-loop
          const trace = await api<Data>(
            `${sessionPath(chat.session.sessionId)}/trace`,
            undefined,
            signal,
          );
          const session = record(trace.session);
          const knownIds = new Set(
            chat.turns.map(turn => turn.messageId).filter(Boolean),
          );
          const candidates = [
            text(session.runningMessageId || session.messageId),
            ...list(trace.turns).map(turn => text(turn.messageId)),
          ].filter(id => id && !knownIds.has(id));
          chat.messageId = candidates.at(-1);
          if (chat.messageId) remember(chat);
          if (!chat.messageId)
            throw streamError || new Error(I18N.carbonAgent.taskUnconfirmed);
        }
        // 本轮恢复结果决定是否重订阅，恢复尝试必须串行。
        // eslint-disable-next-line no-await-in-loop
        const recovered = await api<Data>(
          `${sessionPath(chat.session.sessionId)}/messages/${encodeURIComponent(
            chat.messageId,
          )}/recover`,
          undefined,
          signal,
        );
        if (
          recovered.terminal === true ||
          (recovered.recovered === true && recovered.running !== true)
        ) {
          const response = record(recovered.response);
          if (Object.keys(response).length)
            receive({
              event: 'final_response',
              data: { messageId: chat.messageId, finalResponse: response },
            });
          completed = true;
          break;
        }
        if (recovered.running !== true)
          throw new Error(I18N.carbonAgent.taskStatusPending);
        try {
          // 等待当前订阅结束并保存游标后，才能开始下一次恢复。
          // eslint-disable-next-line no-await-in-loop
          await stream(
            `${sessionPath(
              chat.session.sessionId,
            )}/messages/${encodeURIComponent(
              chat.messageId,
            )}/stream?afterStreamEventId=${chat.cursor}`,
            signal,
            receive,
          );
        } catch (error) {
          if (signal.aborted) return;
          streamError = error;
        }
        retries += 1;
        if (!completed && retries >= 3)
          throw streamError || new Error(I18N.carbonAgent.disconnected);
      }
      if (!active(epoch) || signal.aborted) return;
      if (completed) {
        chat.busy = false;
        chat.uncertain = false;
        const trace = await readTrace(chat, signal);
        patch({ chat, revision: stateRef.current.revision + 1 });
        const currentEvents = list(trace.events).filter(
          event =>
            text(
              event.messageId ||
                parsedRecord(event.safePayloadJson || event.safePayload)
                  .messageId,
            ) === chat.messageId,
        );
        if (
          hasModelWrite([...receivedEvents, ...currentEvents], chat.messageId)
        )
          window.dispatchEvent(new Event('carbon-agent-model-updated'));
        const turnBlocks =
          chat.turns
            .find(
              turn =>
                turn.role === 'assistant' && turn.messageId === chat.messageId,
            )
            ?.blocks.map(cardPayload) || [];
        if (
          hasEnterpriseWrite(
            [...receivedEvents, ...currentEvents],
            chat.messageId,
          ) ||
          (isEnterpriseSessionLike(chat.session) &&
            hasEnterpriseWriteCard(turnBlocks))
        ) {
          window.dispatchEvent(
            new CustomEvent('carbon-agent-enterprise-updated', {
              detail: {
                computationId:
                  chat.session.computationId ||
                  enterpriseTarget.current?.context.computationId,
                orgId:
                  chat.session.orgId ||
                  enterpriseTarget.current?.context.orgId,
                year:
                  chat.session.year ||
                  enterpriseTarget.current?.context.year,
              },
            }),
          );
        }
      }
    } catch (error) {
      if (active(epoch) && !signal.aborted) {
        chat.busy = false;
        chat.uncertain = true;
        patch({ chat });
        fail(error);
      }
    }
  };
  const selectSession = async (id: string) => {
    modelTarget.current = undefined;
    enterpriseTarget.current = undefined;
    const { signal, epoch } = begin();
    patch({ opened: true, loading: true, error: undefined });
    try {
      const chat = cache.current.get(id) || newChat({ sessionId: id });
      patch({ chat });
      await readTrace(chat, signal);
      if (!active(epoch)) return;
      // 从历史恢复时从 0 重放未完成轮，避免游标已前进但正文尚未持久化。
      chat.cursor = 0;
      chat.uncertain = false;
      chat.messageId =
        text(chat.session.runningMessageId || record(chat.session).messageId) ||
        chat.turns.at(-1)?.messageId;
      chat.busy = chat.session.running === true || running(chat.session.status);
      if (chat.busy && chat.messageId)
        chat.turns = chat.turns.filter(
          turn =>
            turn.role !== 'assistant' || turn.messageId !== chat.messageId,
        );
      patch({ chat, loading: false });
      remember(chat);
      await refreshAccess();
      if (chat.busy && active(epoch)) run(chat, undefined, epoch, signal);
    } catch (error) {
      if (active(epoch)) {
        const chat = current();
        if (chat) patchChat(chat, { uncertain: true, busy: false });
        fail(error);
      }
    }
  };
  const openGeneral = async (prefill?: string, fresh = false) => {
    modelTarget.current = undefined;
    enterpriseTarget.current = undefined;
    patch({ opened: true, error: undefined });
    if (!fresh && current() && !current()?.blocked) {
      const chat = current()!;
      if (!chat.loaded || chat.uncertain)
        await selectSession(chat.session.sessionId);
      if (prefill !== undefined) updateDraft({ message: prefill });
      await refreshAccess();
      return;
    }
    const { signal, epoch } = begin();
    patch({ loading: true, chat: undefined });
    try {
      await refreshAccess();
      if (!fresh) {
        const sessions = await api<unknown>(
          '/ai/agent/sessions/listSessions',
          undefined,
          signal,
        );
        const rows = list(
          Array.isArray(sessions) ? sessions : record(sessions).rows,
        );
        const recent = rows.sort((a, b) =>
          text(b.updateTime).localeCompare(text(a.updateTime)),
        )[0];
        if (recent?.sessionId && active(epoch)) {
          await selectSession(text(recent.sessionId));
          if (prefill !== undefined) updateDraft({ message: prefill });
          return;
        }
      }
      await requireAccess();
      const session = await createSession({ entry: 'agent_home' }, signal);
      if (!active(epoch)) return;
      const chat = newChat(session);
      chat.loaded = true;
      chat.draft.message = prefill || '';
      patch({ chat, loading: false });
      remember(chat);
    } catch (error) {
      if (active(epoch)) fail(error);
    }
  };
  const openModel = async (
    accountId: string,
    productId?: string,
    prefill?: string,
  ) => {
    enterpriseTarget.current = undefined;
    modelTarget.current = { accountId, productId, prefill };
    const { signal, epoch } = begin();
    patch({ opened: true, loading: true, error: undefined, chat: undefined });
    try {
      const binding = await api<Data>(
        `/footprint3/agent/carbon/models/${encodeURIComponent(
          accountId,
        )}/conversation`,
        undefined,
        signal,
      );
      if (!active(epoch)) return;
      productId = text(binding.productId) || productId;
      const modelSkills: Skill[] = binding.emptyModel
        ? ['build_model']
        : ['model_update', 'data_analysis'];
      if (binding.canContinue !== true) {
        const chat = newChat({
          sessionId: `private-${accountId}`,
          accountId,
          productId,
        });
        chat.blocked = reasonText(text(binding.reasonCode));
        patch({ chat, loading: false });
        await refreshAccess();
        return;
      }
      let id = text(binding.sessionId);
      if (!id) {
        await requireAccess();
        const session = await createSession(
          {
            entry: 'footprint_account_detail',
            accountId,
            productId,
          },
          signal,
        );
        id = session.sessionId;
      }
      await selectSession(id);
      const chat = current();
      if (chat?.session.sessionId === id) {
        modelTarget.current = { accountId, productId, prefill };
        patchChat(chat, {
          session: { ...chat.session, accountId, productId },
          modelSkills,
          draft: {
            ...chat.draft,
            skill:
              chat.draft.skill && modelSkills.includes(chat.draft.skill)
                ? chat.draft.skill
                : undefined,
            message: prefill ?? chat.draft.message,
          },
        });
      }
    } catch (error) {
      if (active(epoch)) fail(error);
    }
  };
  const openEnterprise = async (
    context: EnterpriseContext,
    prefill?: string,
  ) => {
    modelTarget.current = undefined;
    enterpriseTarget.current = { context, prefill };
    const { signal, epoch } = begin();
    patch({ opened: true, loading: true, error: undefined, chat: undefined });
    try {
      const normalizedYear = normalizeEnterpriseYear(context.year);
      const bizId =
        normalizedYear ||
        text(context.computationId) ||
        text(context.orgId);
      let binding: Data = {};
      if (bizId) {
        try {
          const query = new URLSearchParams({
            module: 'enterprise',
            bizType: 'account',
            bizId,
          });
          const latest = await api<Data>(
            `/ai/agent/sessions/latestByBusiness?${query.toString()}`,
            undefined,
            signal,
          );
          binding = record(latest);
        } catch {
          // 若尚无历史绑定或服务端仅按 createSession 建会话，回退到创建新会话
        }
      }
      if (!active(epoch)) return;
      if (binding.canContinue === false) {
        const chat = newChat({
          sessionId: `private-enterprise-${bizId || 'default'}`,
          domain: 'enterprise',
          ...context,
        });
        chat.blocked = reasonText(text(binding.reasonCode));
        patch({ chat, loading: false });
        await refreshAccess();
        return;
      }
      let id = text(binding.sessionId);
      if (!id) {
        await requireAccess();
        const pageContext = Object.fromEntries(
          Object.entries({
            year: normalizedYear || undefined,
            orgId: context.orgId,
            orgName: context.orgName,
            computationId: context.computationId,
            computationPeriod: context.computationPeriod,
            versionType: context.versionType,
          }).filter(([, value]) => Boolean(value)),
        );
        const session = await createSession(
          {
            entry: context.entry || 'enterprise_accounting_detail',
            quickSkill: 'enterprise_modeling',
            ...(bizId
              ? {
                  bizRef: {
                    module: 'enterprise',
                    bizType: 'account',
                    bizId,
                  },
                }
              : {}),
            ...(Object.keys(pageContext).length ? { pageContext } : {}),
          },
          signal,
        );
        id = session.sessionId;
      }
      await selectSession(id);
      const chat = current();
      if (chat?.session.sessionId === id) {
        enterpriseTarget.current = { context, prefill };
        patchChat(chat, {
          session: {
            ...chat.session,
            domain: 'enterprise',
            ...context,
            ...(normalizedYear ? { year: normalizedYear } : {}),
          },
          modelSkills: ENTERPRISE_SKILLS,
          draft: {
            ...chat.draft,
            skill:
              chat.draft.skill && ENTERPRISE_SKILLS.includes(chat.draft.skill)
                ? chat.draft.skill
                : undefined,
            message: prefill ?? chat.draft.message,
          },
        });
      }
    } catch (error) {
      if (active(epoch)) fail(error);
    }
  };
  const updateDraft = (next: Partial<Draft>) => {
    const chat = current();
    if (chat) patchChat(chat, { draft: { ...chat.draft, ...next } });
  };
  const send = async (body?: Data) => {
    const chat = current();
    if (
      !chat ||
      chat.blocked ||
      chat.busy ||
      chat.uncertain ||
      sendLock.current ||
      stateRef.current.loading
    )
      return;
    if (
      !body &&
      !chat.draft.message.trim() &&
      !chat.draft.files.length &&
      !chat.draft.attachments.length
    )
      return;
    sendLock.current = true;
    const { signal, epoch } = begin();
    patchChat(chat, { busy: true });
    patch({ error: undefined });
    try {
      await requireAccess();
      if (!active(epoch)) return;
      const uploaded = [...chat.draft.attachments];
      if (!body) {
        for (const file of [...chat.draft.files]) {
          // 每个上传完成后立即保存 fileId，失败重试时只补传剩余文件。
          // eslint-disable-next-line no-await-in-loop
          uploaded.push(await uploadFile(chat.session.sessionId, file, signal));
          if (!active(epoch)) return;
          chat.draft = {
            ...chat.draft,
            files: chat.draft.files.filter(item => item !== file),
            attachments: [...uploaded],
          };
          patch({ chat });
        }
      }
      const request = body || {
        message: chat.draft.message,
        quickSkill: chat.draft.skill,
        files: uploaded.map(({ fileId }) => ({ fileId })),
        modelingOptions: chat.draft.modelingOptions,
      };
      chat.turns = chat.turns.map(turn => ({ ...turn, locked: true }));
      chat.turns.push({
        id: crypto.randomUUID(),
        messageId: '',
        role: 'user',
        content:
          text(request.message) ||
          (request.action ? I18N.carbonAgent.operationSubmitted : ''),
        attachments: request.action ? [] : uploaded,
        blocks: [],
        tools: [],
      });
      if (!request.action)
        chat.draft = { ...emptyDraft(), skill: chat.draft.skill };
      chat.messageId = undefined;
      chat.cursor = 0;
      patch({ chat });
      run(chat, request, epoch, signal);
    } catch (error) {
      if (active(epoch)) {
        patchChat(chat, { busy: false });
        fail(error);
      }
      throw error;
    } finally {
      sendLock.current = false;
    }
  };
  const startModeling = async (input: ModelingInput) => {
    if (sendLock.current || stateRef.current.loading)
      throw new Error(I18N.carbonAgent.preparingConversation);
    modelTarget.current = undefined;
    enterpriseTarget.current = undefined;
    const { signal, epoch } = begin();
    patch({ opened: true, loading: true, error: undefined, chat: undefined });
    try {
      await requireAccess();
      const session = await createSession(
        {
          entry: 'footprint_account_list',
          productId: input.productId,
          quickSkill: 'build_model',
        },
        signal,
      );
      if (!active(epoch))
        throw new DOMException(
          I18N.carbonAgent.conversationChanged,
          'AbortError',
        );
      const chat = newChat({
        ...session,
        productId: input.productId,
        quickSkill: 'build_model',
      });
      chat.draft = {
        ...emptyDraft(),
        message: input.message,
        files: [...input.files],
        skill: 'build_model',
        modelingOptions: input.modelingOptions,
      };
      patch({ chat, loading: true });
      remember(chat);
      const attachments: Attachment[] = [];
      for (const file of input.files) {
        // 逐个接管附件，保留已上传结果并在切换会话时停止后续上传。
        // eslint-disable-next-line no-await-in-loop
        attachments.push(await uploadFile(session.sessionId, file, signal));
        chat.draft = {
          ...chat.draft,
          files: chat.draft.files.filter(item => item !== file),
          attachments: [...attachments],
        };
        if (!active(epoch))
          throw new DOMException(
            I18N.carbonAgent.conversationChanged,
            'AbortError',
          );
        patch({ chat });
      }
      patch({ loading: false });
      await send({
        message: input.message,
        quickSkill: 'build_model',
        files: attachments.map(({ fileId }) => ({ fileId })),
        modelingOptions: input.modelingOptions,
      });
    } catch (error) {
      if (active(epoch)) fail(error);
      throw error;
    }
  };
  const startEnterpriseAccounting = async (input: EnterpriseAccountingInput) => {
    if (sendLock.current || stateRef.current.loading)
      throw new Error(I18N.carbonAgent.preparingConversation);
    modelTarget.current = undefined;
    enterpriseTarget.current = { context: input.context };
    const { signal, epoch } = begin();
    patch({ opened: true, loading: true, error: undefined, chat: undefined });
    try {
      await requireAccess();
      const { context } = input;
      const normalizedYear = normalizeEnterpriseYear(context.year);
      const bizId =
        normalizedYear ||
        text(context.computationId) ||
        text(context.orgId);
      const quickSkill = input.skill || 'enterprise_modeling';
      const pageContext = Object.fromEntries(
        Object.entries({
          year: normalizedYear || undefined,
          orgId: context.orgId,
          orgName: context.orgName,
          computationId: context.computationId,
          computationPeriod: context.computationPeriod,
          versionType: context.versionType,
        }).filter(([, value]) => Boolean(value)),
      );
      const session = await createSession(
        {
          entry: context.entry || 'enterprise_accounting_list',
          quickSkill,
          ...(bizId
            ? {
                bizRef: {
                  module: 'enterprise',
                  bizType: 'account',
                  bizId,
                },
              }
            : {}),
          ...(Object.keys(pageContext).length ? { pageContext } : {}),
        },
        signal,
      );
      if (!active(epoch))
        throw new DOMException(
          I18N.carbonAgent.conversationChanged,
          'AbortError',
        );
      const chat = newChat({
        ...session,
        domain: 'enterprise',
        ...context,
        ...(normalizedYear ? { year: normalizedYear } : {}),
        quickSkill,
      });
      chat.modelSkills = ENTERPRISE_SKILLS;
      chat.draft = {
        ...emptyDraft(),
        message: input.message,
        files: [...input.files],
        skill: quickSkill,
      };
      patch({ chat, loading: true });
      remember(chat);
      const attachments: Attachment[] = [];
      for (const file of input.files) {
        // eslint-disable-next-line no-await-in-loop
        attachments.push(await uploadFile(session.sessionId, file, signal));
        chat.draft = {
          ...chat.draft,
          files: chat.draft.files.filter(item => item !== file),
          attachments: [...attachments],
        };
        if (!active(epoch))
          throw new DOMException(
            I18N.carbonAgent.conversationChanged,
            'AbortError',
          );
        patch({ chat });
      }
      patch({ loading: false });
      await send({
        message: input.message,
        quickSkill,
        files: attachments.map(({ fileId }) => ({ fileId })),
        ...(Object.keys(pageContext).length ? { pageContext } : {}),
      });
    } catch (error) {
      if (active(epoch)) fail(error);
      throw error;
    }
  };
  const handoff = async (payload: Data) => {
    const chat = current();
    if (!chat || chat.busy || sendLock.current) return;
    sendLock.current = true;
    const { signal, epoch } = begin();
    try {
      await requireAccess();
      const result = await api<{ sessionId: string; message: Data }>(
        `${sessionPath(chat.session.sessionId)}/carbon-model-handoff`,
        { requestId: payload.requestId, message: payload.message },
        signal,
      );
      if (!active(epoch)) return;
      chat.handledRequests.push(text(payload.requestId));
      await selectSession(result.sessionId);
      sendLock.current = false;
      // 重复确认只恢复已有子会话，不重复发送首轮。
      if (
        current()?.session.sessionId === result.sessionId &&
        !current()?.turns.length &&
        !current()?.uncertain
      )
        await send(result.message);
    } catch (error) {
      if (active(epoch)) fail(error);
    } finally {
      sendLock.current = false;
    }
  };
  useEffect(() => {
    const identityChanged = identity.current !== token;
    if (identity.current !== token && storageKey.current)
      sessionStorage.removeItem(storageKey.current);
    identity.current = token;
    generation.current += 1;
    controller.current?.abort();
    cache.current.clear();
    modelTarget.current = undefined;
    enterpriseTarget.current = undefined;
    sendLock.current = false;
    stateRef.current = { opened: false, loading: false, revision: 0 };
    setState(stateRef.current);
    storageKey.current = '';
    let disposed = false;
    if (token)
      workspaceAccess()
        .then(access => {
          if (!disposed && getToken() === token) patch({ access });
        })
        .catch(error => {
          if (!disposed) fail(error);
        });
    // 凭证摘要仅用于本地隔离，不保存 token 到草稿或 URL。
    if (token)
      crypto.subtle
        .digest('SHA-256', new TextEncoder().encode(token))
        .then(hash => {
          if (disposed) return;
          storageKey.current = `carbon-agent:${Array.from(new Uint8Array(hash))
            .map(value => value.toString(16).padStart(2, '0'))
            .join('')}`;
          if (identityChanged) sessionStorage.removeItem(storageKey.current);
          const saved = identityChanged
            ? null
            : sessionStorage.getItem(storageKey.current);
          if (saved) {
            try {
              const data = record(JSON.parse(saved));
              if (
                data.sessionId &&
                !stateRef.current.chat &&
                !stateRef.current.loading
              ) {
                const chat = newChat({ sessionId: text(data.sessionId) });
                patch({ chat });
              }
            } catch {
              sessionStorage.removeItem(storageKey.current);
            }
          }
        });
    return () => {
      disposed = true;
      controller.current?.abort();
    };
  }, [token]);
  const value = useMemo<AgentContext>(
    () => ({
      ...state,
      openGeneral,
      openModel,
      openEnterprise,
      startModeling,
      startEnterpriseAccounting,
      selectSession,
      updateDraft,
      send,
      handoff,
      refreshAccess,
      saveFormDraft: (id, values) => {
        const chat = current();
        if (chat) chat.formDrafts[id] = values;
      },
      close: () => patch({ opened: false }),
      retry: async () => {
        const chat = current();
        try {
          const target = modelTarget.current;
          const entTarget = enterpriseTarget.current;
          if (target)
            await openModel(target.accountId, target.productId, target.prefill);
          else if (entTarget)
            await openEnterprise(entTarget.context, entTarget.prefill);
          else if (chat && !chat.blocked)
            await selectSession(chat.session.sessionId);
          else await openGeneral(undefined, true);
        } catch (error) {
          fail(error);
        }
      },
      cancel: async () => {
        const chat = current();
        if (!chat) return;
        try {
          await api(`${sessionPath(chat.session.sessionId)}/cancel`, {});
          await selectSession(chat.session.sessionId);
        } catch (error) {
          fail(error);
        }
      },
    }),
    [state, locale],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useCarbonAgent() {
  const value = useContext(Context);
  if (!value) throw new Error('CarbonAgentProvider is required');
  return value;
}
