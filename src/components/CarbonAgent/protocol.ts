import I18N from '@/lang/I18N';
/** 碳云协议边界。参考 feat-agent-group 的事件归一、工具合并和恢复规则。 */
export type Data = Record<string, unknown>;
export const record = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Data)
    : {};
export const list = (value: unknown): Data[] =>
  Array.isArray(value) ? value.map(record) : [];
export const text = (value: unknown): string =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';
export function decodeFileName(value: unknown): string {
  const name = text(value);
  try {
    return decodeURIComponent(name);
  } catch {
    return name;
  }
}
export const parseJson = (source: string): unknown =>
  JSON.parse(
    source.replace(
      /"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?/g,
      token => {
        if (token.startsWith('"') || /[.eE]/.test(token)) return token;
        return Number.isSafeInteger(Number(token)) ? token : `"${token}"`;
      },
    ),
  );
export const parsedRecord = (value: unknown): Data =>
  typeof value === 'string' ? record(parseJson(value)) : record(value);
export type Skill =
  | 'build_model'
  | 'model_update'
  | 'data_analysis'
  | 'enterprise_modeling'
  | 'enterprise_data_analysis'
  | 'enterprise_generate_report';
export type EnterpriseContext = {
  year?: string;
  orgId?: string;
  orgName?: string;
  computationId?: string;
  computationPeriod?: string;
  versionType?: string;
  entry?: string;
};
export type Attachment = { fileId: string; name: string };
export type Session = {
  sessionId: string;
  sessionTitle?: string;
  entry?: string;
  productId?: string;
  accountId?: string;
  domain?: 'product' | 'enterprise' | 'general';
  year?: string;
  orgId?: string;
  orgName?: string;
  computationId?: string;
  computationPeriod?: string;
  versionType?: string;
  quickSkill?: Skill;
  status?: string;
  running?: boolean;
  runningMessageId?: string;
};
export type Access = {
  canManage: boolean;
  canUseAi: boolean;
  aiReasonCode?: string;
  reasonCode?: string;
  companyId?: string;
};
export type Block = Data & {
  blockId: string;
  blockType: string;
  orderNo: number;
  content?: string;
  card?: Data;
};
export type Tool = {
  id: string;
  toolName?: string;
  title: string;
  status: string;
  error?: string;
};
export type Turn = {
  id: string;
  messageId: string;
  role: 'user' | 'assistant';
  content: string;
  attachments?: Attachment[];
  blocks: Block[];
  tools: Tool[];
  status?: string;
  locked?: boolean;
};
export type Frame = { id?: string; event: string; data: Data };
export const terminal = (status?: string) =>
  /^(SUCCESS|COMPLETED|FAILED|ERROR|CANCELLED|ENDED)$/i.test(status || '');
export const running = (status?: string) =>
  /^(RUNNING|PROCESSING|EXECUTING|QUEUED|PENDING)$/i.test(status || '');
export function safeText(value: unknown): string {
  const result = text(value);
  return /Traceback|\n\s*at [\w.$]+\(|SELECT\s+.+\s+FROM|INSERT\s+INTO|Authorization:|api[_-]?key\s*[:=]/i.test(
    result,
  )
    ? I18N.carbonAgent.safeError
    : result;
}
export function createSseParser(emit: (frame: Frame) => void) {
  let buffer = '';
  return (chunk: string, end = false) => {
    buffer += chunk;
    // 在完整帧上归一 CRLF，保留跨 chunk 的 CR/LF。
    let match = /\r?\n\r?\n/.exec(buffer);
    while (match) {
      const raw = buffer.slice(0, match.index).replace(/\r\n/g, '\n');
      buffer = buffer.slice(match.index + match[0].length);
      let event = 'message';
      let id: string | undefined;
      const data: string[] = [];
      raw.split('\n').forEach(line => {
        const colon = line.indexOf(':');
        const key = colon < 0 ? line : line.slice(0, colon);
        const value = colon < 0 ? '' : line.slice(colon + 1).replace(/^ /, '');
        if (key === 'event') event = value;
        if (key === 'id') id = value;
        if (key === 'data') data.push(value);
      });
      if (data.length && data.join('\n') !== '[DONE]')
        emit({ id, event, data: record(parseJson(data.join('\n'))) });
      match = /\r?\n\r?\n/.exec(buffer);
    }
    if (end && buffer.trim())
      throw new Error(I18N.carbonAgent.streamIncomplete);
  };
}
export function cardPayload(value: Data): Data {
  const card = record(value.card);
  const base = Object.keys(card).length ? card : value;
  const merged = { ...base, ...record(base.extra), ...record(base.payload) };
  return { ...record(merged.safePayload), ...merged };
}
export function approvalActions(payload: Data): Data[] {
  return list(
    payload.actionRequests ||
      record(record(payload.rawInterrupt).value).action_requests,
  );
}
export function isApproval(payload: Data): boolean {
  return (
    [payload.cardType, payload.blockType, payload.eventType].some(type =>
      ['action_request', 'actions'].includes(text(type)),
    ) ||
    approvalActions(payload).length > 0 ||
    list(payload.displayActionRequests).length > 0
  );
}
export function modelingApproval(payload: Data): Data | undefined {
  return approvalActions(payload).find(
    action => action.name === 'agent_modeling_execute_structured',
  );
}

// 与 feat-agent 一致：审批由卡片展示，不重复渲染工具参数转储。
export function approvalText(content: string, blocks: Block[]): string {
  return /Tool execution requires approval/i.test(content) &&
    blocks.some(block => isApproval(cardPayload(block)))
    ? ''
    : content;
}
export function blockIdentity(block: Block): string {
  const payload = cardPayload(block);
  const resume = record(payload.resumeRequest);
  const id =
    payload.cardId ||
    payload.resumeEventId ||
    record(resume.submit || resume.approve || resume.confirm).resumeEventId ||
    payload.requestId;
  if (id) return text(id);
  const ref = record(payload.bizRef);
  const accountId =
    ref.accountId || ref.bizId || payload.bizId || payload.accountId;
  return accountId ? `${text(payload.cardType)}:${text(accountId)}` : '';
}
export function mergeBlocks(previous: Block[], incoming: Block[]): Block[] {
  const blocks = [...previous];
  incoming.forEach(block => {
    const identity = blockIdentity(block);
    const index = blocks.findIndex(
      old =>
        old.blockId === block.blockId ||
        (identity && blockIdentity(old) === identity),
    );
    if (index < 0) blocks.push(block);
    else blocks[index] = { ...blocks[index], ...block };
  });
  return blocks.sort((a, b) => a.orderNo - b.orderNo);
}
export function responseBlocks(value: Data): Block[] {
  const blocks = list(value.blocks).map((block, i) => {
    const extra = record(block.extra);
    const fallback = record(value.result);
    return {
      ...block,
      extra: { ...fallback, ...extra },
      blockId: text(block.blockId) || `block-${i}`,
      blockType: text(block.blockType) || 'markdown',
      orderNo: Number(block.orderNo ?? i),
    };
  });
  const cards = list(value.cards).map((card, i) => ({
    blockId:
      text(card.cardId || cardPayload(card).resumeEventId) || `card-${i}`,
    blockType: text(card.cardType) || 'business_card',
    card,
    orderNo: Number(card.orderNo ?? blocks.length + i),
  }));
  return mergeBlocks(blocks, cards);
}
export function applyEvent(turn: Turn, event: Data): Turn {
  const type = text(event.eventType);
  const envelope = { ...record(event.payload), ...record(event.safePayload) };
  // 历史 safePayloadJson 保存完整事件信封；实时流直接提供内层 safePayload。
  const safe = { ...envelope, ...record(envelope.safePayload) };
  const display = { ...record(event.display), ...record(safe.display) };
  if (
    [
      event.visible,
      safe.visible,
      display.visible,
      record(event.displayPolicy).defaultVisible,
    ].some(flag => flag === false || flag === 0)
  )
    return turn;
  if (type === 'message_delta') {
    const blockId = text(event.blockId) || 'text';
    const existing = turn.blocks.find(block => block.blockId === blockId);
    return {
      ...turn,
      blocks: mergeBlocks(turn.blocks, [
        {
          blockId,
          blockType: 'markdown',
          orderNo: Number(
            event.orderNo ?? existing?.orderNo ?? turn.blocks.length,
          ),
          content: (existing?.content || '') + text(event.delta),
        },
      ]),
    };
  }
  if (type.startsWith('tool_call')) {
    const id = text(
      event.toolCallId ||
        safe.toolCallId ||
        event.parentEventId ||
        event.eventId,
    );
    if (!id) return turn;
    const previous = turn.tools.find(tool => tool.id === id);
    const output = record(safe.contentJson);
    const businessFailure =
      safe.type === 'mcp_tool_error' ||
      output.type === 'mcp_tool_error' ||
      safe.success === false ||
      output.success === false ||
      safe.isError === true ||
      output.isError === true;
    const status =
      businessFailure || /error|failed/.test(type)
        ? 'FAILED'
        : safe.autoClosed === true
        ? 'ENDED'
        : type === 'tool_call_success'
        ? 'SUCCESS'
        : 'RUNNING';
    const tool: Tool = {
      id,
      toolName: text(event.toolName || safe.toolName) || previous?.toolName,
      title:
        safeText(
          display.stageName || event.title || event.toolName || safe.toolName,
        ) ||
        previous?.title ||
        I18N.carbonAgent.executeTask,
      status,
      error: businessFailure
        ? /agent session auth failed/i.test(
            text(safe.message || output.message),
          )
          ? I18N.carbonAgent.toolAuthFailed
          : safeText(event.errorMessage || safe.errorMessage) ||
            (text(output.type) === 'model_write_rejected'
              ? safeText(output.message)
              : '') ||
            I18N.carbonAgent.toolFailed
        : safeText(event.errorMessage || safe.errorMessage),
    };
    if (previous && terminal(previous.status) && !terminal(status)) return turn;
    return {
      ...turn,
      tools: previous
        ? turn.tools.map(item => (item.id === id ? tool : item))
        : [...turn.tools, tool],
    };
  }
  if (
    ['card', 'business_card', 'form_request', 'action_request'].includes(type)
  ) {
    const card = Object.keys(record(event.card)).length
      ? record(event.card)
      : { ...safe, ...event, cardType: type };
    return {
      ...turn,
      blocks: mergeBlocks(turn.blocks, [
        {
          blockId:
            text(
              event.blockId ||
                card.cardId ||
                cardPayload(card).resumeEventId ||
                event.eventId,
            ) || `${type}-${turn.blocks.length}`,
          blockType: type,
          orderNo: Number(event.orderNo ?? turn.blocks.length),
          card,
        },
      ]),
    };
  }
  if (type === 'final_response') {
    const result =
      [
        event.finalResponse,
        event.response,
        event.result,
        record(event.data).response,
        safe.response,
        safe.result,
        event.data,
        safe,
        event,
      ]
        .map(record)
        .find(candidate =>
          ['reply', 'blocks', 'cards', 'content'].some(
            key => candidate[key] !== undefined,
          ),
        ) || {};
    const blocks = responseBlocks(result);
    const reply = text(result.reply || result.content);
    // 最终正文是权威快照，避免网络丢失 delta 后留下截断正文。
    const previous =
      reply && !blocks.some(block => block.blockType === 'markdown')
        ? turn.blocks.filter(block => block.blockType !== 'markdown')
        : turn.blocks;
    return {
      ...turn,
      content: reply || turn.content,
      blocks: mergeBlocks(previous, blocks),
      status: text(result.status),
    };
  }
  if (type === 'error')
    return {
      ...turn,
      status: 'FAILED',
      blocks: mergeBlocks(turn.blocks, [
        {
          blockId: 'error',
          blockType: 'error',
          orderNo: turn.blocks.length,
          content:
            safeText(event.errorMessage || event.message || safe.message) ||
            I18N.carbonAgent.turnFailed,
        },
      ]),
    };
  return turn;
}
export function normalizeTrace(trace: Data): {
  session: Session;
  turns: Turn[];
} {
  const session = record(trace.session) as Session;
  const rawTurns = list(trace.turns).filter(
    turn => turn.role === 'user' || turn.role === 'assistant',
  );
  const turns: Turn[] = rawTurns.map((raw, i) => {
    const payload = parsedRecord(raw.payload);
    const response = record(
      payload.response || payload.finalResponse || payload,
    );
    return {
      id: text(raw.id) || `${raw.role}-${i}`,
      messageId: text(raw.messageId || payload.messageId),
      role: raw.role as Turn['role'],
      content: text(raw.content || response.reply),
      blocks: responseBlocks(response),
      tools: [],
      attachments:
        raw.role === 'user'
          ? list(payload.files).map(file => ({
              fileId: text(file.fileId),
              name:
                decodeFileName(file.name || file.fileName) ||
                I18N.carbonAgent.attachment,
            }))
          : undefined,
      status: text(raw.status || response.status),
      locked: true,
    };
  });
  for (const raw of list(trace.events)) {
    const safe = parsedRecord(raw.safePayloadJson || raw.safePayload);
    const event: Data = { ...safe, ...raw, safePayload: safe };
    const index = turns.findIndex(
      turn =>
        turn.role === 'assistant' &&
        turn.messageId === text(raw.messageId || safe.messageId),
    );
    if (index >= 0 && text(event.eventType).startsWith('tool_call'))
      turns[index] = applyEvent(turns[index], event);
  }
  const last = [...turns].reverse().find(turn => turn.role === 'assistant');
  if (
    last &&
    (/WAIT|NEED_USER_INPUT/.test(session.status || '') ||
      last.blocks.some(
        block => cardPayload(block).cardType === 'carbon_model_handoff',
      ))
  )
    last.locked = false;
  turns.forEach(turn => {
    if (turn !== last || !(session.running || running(session.status)))
      turn.tools = turn.tools.map(tool =>
        terminal(tool.status) ? tool : { ...tool, status: 'ENDED' },
      );
  });
  return { session, turns };
}
export function buildResume(
  payload: Data,
  action: string,
  values?: Data,
): Data {
  const template = record(record(payload.resumeRequest)[action]);
  if (!Object.keys(template).length)
    throw new Error(I18N.carbonAgent.resumeTemplateMissing);
  const body = structuredClone(template);
  if (values !== undefined) {
    const path = text(body.formDataPath).split('.').filter(Boolean);
    if (
      !path.length ||
      path.some(part =>
        ['__proto__', 'constructor', 'prototype'].includes(part),
      )
    )
      throw new Error(I18N.carbonAgent.invalidFormPath);
    let target = body;
    path.slice(0, -1).forEach(part => {
      const next = record(target[part]);
      target[part] = next;
      target = next;
    });
    target[path[path.length - 1]] = values;
    if (body.copyFormDataToResumeRoot === true)
      body.resumeData = { ...record(body.resumeData), ...values };
  }
  delete body.formDataPath;
  return body;
}
