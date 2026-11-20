/** Local-only component integration harness. No real credentials or external API calls. */
import { createRoot } from 'react-dom/client';
import { useRef, useState } from 'react';
import { Provider } from 'react-redux';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { ConfigProvider, Button } from 'antd';
import { store } from './fixture-stubs';
import { messagePreview, reviewPreview } from './ui-scenarios';
import { AICarbonFloatingProvider } from '../../src/components/AICarbonFloating/AICarbonContext';
import CarbonAgent from '../../src/components/CarbonAgent';
import {
  CarbonAgentProvider,
  useCarbonAgent,
} from '../../src/components/CarbonAgent/context';
import ModelingEntry from '../../src/components/CarbonAgent/components/ModelingEntry';
import type { Data } from '../../src/components/CarbonAgent/protocol';

const requests: { path: string; method: string; body?: Data }[] = [];
const sessions = new Map<
  string,
  { session: Data; turns: Data[]; events: Data[] }
>();
let counter = 0;
let mode = 'complete';
let access = true;
let cancelledSubscriptions = 0;
let bindingAttempts = 0;
const form = {
  blockId: 'form-1',
  blockType: 'form',
  orderNo: 1,
  extra: {
    title: '请补充建模材料',
    ui: {
      fields: [
        {
          name: 'materials',
          label: '材料清单',
          kind: 'table',
          required: true,
          default_rows: [{ name: 'ABS 塑料外壳', amount: 0, estimated: false }],
          columns: [
            { name: 'name', label: '材料', kind: 'text', required: true },
            {
              name: 'amount',
              label: '用量（kg）',
              kind: 'number',
              required: true,
            },
            { name: 'estimated', label: '估算值', kind: 'boolean' },
          ],
        },
      ],
    },
    resumeRequest: {
      submit: {
        action: 'resume',
        resumeEventId: 'event-form',
        formDataPath: 'resumeData.interrupt.form_submission',
        copyFormDataToResumeRoot: false,
        checkpoint: { id: 'checkpoint' },
      },
      cancel: {
        action: 'resume',
        resumeData: { interrupt: { decision: 'cancel' } },
      },
    },
  },
};
function trace(id: string) {
  if (!sessions.has(id))
    sessions.set(id, {
      session: { sessionId: id, sessionTitle: id, status: 'IDLE' },
      turns: [],
      events: [],
    });
  return sessions.get(id)!;
}
function complete(id: string) {
  const data = trace(id);
  const messageId = String(data.session.runningMessageId || `message-${id}`);
  data.session = {
    ...data.session,
    status: 'NEED_USER_INPUT',
    running: false,
    runningMessageId: undefined,
  };
  data.turns.push({
    id: `assistant-${messageId}`,
    messageId,
    role: 'assistant',
    content: '已读取产品资料。请核对材料用量，0 和 false 将保持原始类型提交。',
    payload: { blocks: [form] },
  });
  data.events = [
    {
      messageId,
      eventType: 'tool_call_success',
      safePayloadJson: JSON.stringify({
        toolCallId: 'tool-1',
        display: { stageName: '读取产品资料' },
      }),
    },
  ];
}
const json = (data: unknown) =>
  new Response(JSON.stringify({ code: 200, data }), {
    headers: { 'content-type': 'application/json' },
  });
const event = (id: number, eventType: string, data: Data) =>
  `id: ${id}\nevent: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
window.fetch = async (input, init) => {
  const url = new URL(String(input), location.origin);
  const path = url.pathname;
  const body =
    typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
  requests.push({
    path: path + url.search,
    method: init?.method || 'GET',
    body,
  });
  if (path === '/management/agent/workspace-access')
    return json({
      canUseAi: access,
      canManage: true,
      aiReasonCode: access ? undefined : 'AGENT_SEAT_REQUIRED',
    });
  if (path.endsWith('/factorScopes'))
    return json([{ label: 'Ecoinvent', value: '1' }]);
  if (path.endsWith('/getAiDatalist'))
    return json([
      { question: '一瓶500ml矿泉水' },
      { question: '一盒100抽纸巾' },
      { question: '一件纯棉T恤衫' },
    ]);
  if (path.endsWith('/createSession')) {
    const id = `session-${++counter}`;
    const data = trace(id);
    Object.assign(data.session, body);
    return json(data.session);
  }
  if (path.endsWith('/listSessions'))
    return json([...sessions.values()].map(item => item.session));
  if (path.includes('/retry-binding/conversation')) {
    bindingAttempts++;
    if (bindingAttempts === 1)
      return new Response(
        JSON.stringify({ code: 500, msg: 'AGENT_SESSION_CHANNEL_FORBIDDEN' }),
      );
    return json({
      canContinue: true,
      emptyModel: false,
      sessionId: 'restored-model',
      productId: 'product',
    });
  }
  if (path.endsWith('/conversation'))
    return json({
      canContinue: !path.includes('private'),
      emptyModel: true,
      productId: 'product',
      reasonCode: 'AGENT_CARBON_CONVERSATION_PRIVATE',
    });
  const id = path.split('/')[4];
  if (path.endsWith('/trace')) return json(trace(id));
  if (path.endsWith('/recover'))
    return json({
      running: trace(id).session.running === true,
      terminal: trace(id).session.running !== true,
    });
  if (path.endsWith('/cancel')) {
    trace(id).session.running = false;
    return json({});
  }
  if (path.endsWith('/upload'))
    return json({ fileId: 'fixture-file', fileName: 'materials.csv' });
  if (path.endsWith('/chatting') || path.endsWith('/stream')) {
    const data = trace(id);
    const post = path.endsWith('/chatting');
    const messageId = `message-${id}`;
    if (post) {
      data.session.running = true;
      data.session.runningMessageId = messageId;
      data.turns.push({
        id: `user-${messageId}`,
        messageId,
        role: 'user',
        content: body?.message || '提交表单',
        payload: {},
      });
    }
    const chunks = post
      ? [
          event(1, 'message_start', { messageId }),
          mode === 'preview'
            ? event(2, 'tool_call_start', {
                messageId,
                toolCallId: 'preview-analysis',
                display: { stageName: '分析任务' },
              })
            : event(2, 'message_delta', { messageId, delta: '正在分析' }),
        ]
      : [event(2, 'message_delta', { messageId, delta: '不应重复' })];
    const hold = post && ['hold', 'preview'].includes(mode);
    const disconnect = post && mode === 'disconnect';
    if (!hold && !disconnect) {
      complete(id);
      chunks.push(
        event(3, 'final_response', {
          messageId,
          finalResponse: { reply: '已读取产品资料。', blocks: [form] },
        }),
        event(4, 'completed', { messageId }),
      );
    }
    const encoder = new TextEncoder();
    return new Response(
      new ReadableStream({
        start(controller) {
          chunks.forEach(chunk => controller.enqueue(encoder.encode(chunk)));
          if (hold)
            init?.signal?.addEventListener('abort', () => {
              cancelledSubscriptions++;
              controller.error(new DOMException('aborted', 'AbortError'));
            });
          else controller.close();
        },
      }),
      { headers: { 'content-type': 'text/event-stream' } },
    );
  }
  if (path.endsWith('/records'))
    return json({
      rows: [
        {
          recordId: 'r1',
          modelName: '测试模型',
          memberName: '测试成员',
          status: 'FAILED',
          actualPoints: 0,
        },
        {
          recordId: 'r2',
          modelName: '取消的任务',
          status: 'CANCELLED',
          actualPoints: 0,
        },
      ],
      total: 2,
    });
  throw new Error(`Unmocked fixture request: ${path}`);
};
const sleep = (ms = 30) =>
  new Promise(resolve => {
    setTimeout(resolve, ms);
  });
const check = (condition: unknown, message: string) => {
  if (!condition) throw new Error(message);
};
function Harness() {
  const agent = useCarbonAgent();
  const latest = useRef(agent);
  latest.current = agent;
  const location = useLocation();
  const [results, setResults] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);
  const preview = (id: string, turns: Data[]) => {
    const data = trace(id);
    data.turns = turns;
    data.session.status = id === 'ui-messages' ? 'IDLE' : 'NEED_USER_INPUT';
    latest.current.selectSession(id);
  };
  const run = async () => {
    setTesting(true);
    setResults([]);
    const passed: string[] = [];
    const pass = (title: string) => {
      passed.push(title);
      setResults([...passed]);
    };
    const wait = async (condition: () => boolean) => {
      for (let i = 0; i < 100; i++) {
        if (condition()) return;
        // 顺序轮询 React 状态，不能同时启动所有等待。
        // eslint-disable-next-line no-await-in-loop
        await sleep();
      }
      throw new Error('Timed out waiting for state');
    };
    try {
      await latest.current.openGeneral(undefined, true);
      await sleep();
      check(
        !requests.some(item => item.path.endsWith('/chatting')),
        'Opening sent a message',
      );
      pass('PASS 普通打开不发送');
      mode = 'disconnect';
      const before = requests.filter(item =>
        item.path.endsWith('/chatting'),
      ).length;
      await latest.current.startModeling({
        message: '建立测试模型',
        files: [],
        modelingOptions: { scope: 0 },
      });
      await wait(() => !latest.current.chat?.busy);
      check(
        requests.filter(item => item.path.endsWith('/chatting')).length ===
          before + 1,
        'Duplicate POST',
      );
      check(
        requests.some(item => item.path.includes('afterStreamEventId=2')),
        'Cursor was lost',
      );
      pass('PASS 断线 GET 恢复且只 POST 一次');
      latest.current.updateDraft({ message: '保留的草稿' });
      await sleep();
      const first = latest.current.chat!.session.sessionId;
      await latest.current.openGeneral(undefined, true);
      await sleep();
      await latest.current.selectSession(first);
      await sleep();
      check(latest.current.chat?.draft.message === '保留的草稿', 'Draft lost');
      pass('PASS 切换会话保存草稿');
      mode = 'hold';
      await latest.current.openGeneral(undefined, true);
      await sleep();
      latest.current.updateDraft({ message: '后台任务' });
      await sleep();
      await Promise.all([latest.current.send(), latest.current.send()]);
      await sleep();
      const runningId = latest.current.chat!.session.sessionId;
      const posts = requests.filter(
        item =>
          item.path.includes(runningId) && item.path.endsWith('/chatting'),
      );
      check(posts.length === 1, 'Double click sent twice');
      latest.current.close();
      await sleep();
      check(
        !requests.some(item => item.path.endsWith('/cancel')),
        'Close cancelled task',
      );
      await latest.current.selectSession(first);
      await sleep();
      check(cancelledSubscriptions > 0, 'Old subscription left open');
      await latest.current.selectSession(runningId);
      await wait(() => !latest.current.chat?.busy);
      check(
        requests.filter(
          item =>
            item.path.includes(runningId) && item.path.endsWith('/chatting'),
        ).length === 1,
        'Switch resent',
      );
      pass('PASS 收起、切换与重复提交不取消或重发任务');
      const restored = trace('restored-model');
      restored.session.quickSkill = 'build_model';
      restored.turns = [
        {
          id: 'model-answer',
          role: 'assistant',
          messageId: 'model-message',
          payload: {
            cards: [{ cardType: 'product_carbon_model', bizId: 'model-id' }],
          },
        },
      ];
      await latest.current.selectSession('restored-model');
      await sleep();
      check(
        latest.current.chat?.modelSkills?.includes('model_update') &&
          !latest.current.chat?.modelSkills?.includes('build_model'),
        'Restored model still offers build_model',
      );
      pass('PASS 刷新完成模型会话切换完善模型');
      await latest.current.openModel('retry-binding');
      await sleep();
      check(
        !!latest.current.error && !latest.current.chat,
        'Binding failure was hidden',
      );
      await latest.current.retry();
      await sleep();
      check(
        bindingAttempts === 2 &&
          latest.current.chat?.session.sessionId === 'restored-model',
        'Retry did not reopen original model',
      );
      pass('PASS 关联失败恢复重新查询原模型会话');
      const created = counter;
      await latest.current.openModel('private');
      await sleep();
      check(
        counter === created && !!latest.current.chat?.blocked,
        'Private session replaced',
      );
      pass('PASS 他人私聊禁用且不新建替代会话');
      access = false;
      await latest.current.openGeneral(undefined, true);
      await sleep();
      check(
        counter === created &&
          latest.current.access?.canManage &&
          !latest.current.access.canUseAi,
        'Seat gate failed',
      );
      pass('PASS 无席位禁止发送且保留管理权限');
      access = true;
      await latest.current.retry();
      await wait(() => !!latest.current.chat && !latest.current.loading);
      check(
        counter === created + 1 && !!latest.current.chat?.session.sessionId,
        'Retry without a session did not create one',
      );
      pass('PASS 无会话时恢复会重新创建会话');
      store.dispatch({ type: 'identity', token: 'fixture-org-b' });
      await wait(() => !latest.current.chat && !latest.current.opened);
      check(
        !latest.current.chat && !latest.current.opened,
        'Organization retained old chat',
      );
      pass('PASS 切组织清理会话与草稿');
      mode = 'complete';
      await latest.current.openGeneral(undefined, true);
      await sleep();
      latest.current.updateDraft({ message: '展示多行建模表单' });
      await sleep();
      await latest.current.send();
      await wait(() => !latest.current.chat?.busy);
      pass('PASS 展示真实组件表单及工具过程');
    } catch (error) {
      setResults([
        ...passed,
        `FAIL ${error instanceof Error ? error.message : String(error)}`,
      ]);
    } finally {
      setTesting(false);
    }
  };
  return (
    <>
      <aside
        hidden={location.search.includes('entryPreview')}
        style={{ padding: 16, background: '#f1f8f6' }}
      >
        <strong>本地集成测试 / 合成数据</strong>
        <p>页面路由：{location.pathname}</p>
        <Button disabled={testing} onClick={() => run()}>
          运行交互回归
        </Button>
        <Button onClick={() => latest.current.openModel('private')}>
          私聊权限场景
        </Button>
        <Button
          onClick={() => {
            mode = 'preview';
            latest.current.startModeling({
              message: '一吨工业用变形铝合金线材',
              files: [],
              modelingOptions: { scope: 0 },
            });
          }}
        >
          预览建模进行中
        </Button>
        <Button onClick={() => preview('ui-messages', messagePreview)}>
          预览消息与结果
        </Button>
        <Button onClick={() => preview('ui-review', reviewPreview)}>
          预览建模确认
        </Button>
        <Button
          onClick={() => {
            complete('ui-form');
            preview('ui-form', trace('ui-form').turns);
          }}
        >
          预览多行表单
        </Button>
        <ol>
          {results.map(result => (
            <li key={result}>{result}</li>
          ))}
        </ol>
        <details>
          <summary>最近发送请求（合成数据）</summary>
          <pre>
            {JSON.stringify(
              requests.filter(item => item.path.endsWith('/chatting')).at(-1)
                ?.body,
              null,
              2,
            )}
          </pre>
        </details>
      </aside>
      <ModelingEntry compact={location.search.includes('compactPreview')} />
      <CarbonAgent />
    </>
  );
}
const mobilePreview = location.search.includes('mobilePreview');
createRoot(document.getElementById('root')!).render(
  mobilePreview ? (
    <iframe
      title='390px mobile preview'
      src={`/mobile${
        location.search.includes('entryPreview') ? '?entryPreview' : ''
      }`}
      style={{ width: 390, height: 844, border: '1px solid #ddd' }}
    />
  ) : (
    <Provider store={store}>
      <ConfigProvider theme={{ token: { colorPrimary: '#026961' } }}>
        <BrowserRouter>
          <AICarbonFloatingProvider>
            <CarbonAgentProvider>
              <Harness />
            </CarbonAgentProvider>
          </AICarbonFloatingProvider>
        </BrowserRouter>
      </ConfigProvider>
    </Provider>
  ),
);
