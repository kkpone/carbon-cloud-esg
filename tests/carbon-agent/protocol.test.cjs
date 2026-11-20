const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const vm = require('node:vm');
const sourceDir = path.resolve(__dirname, '../../src/components/CarbonAgent');
const { I18N } = require('./i18n.test-helper.cjs');
const cache = {};
function load(name, overrides = {}) {
  if (cache[name] && !Object.keys(overrides).length) return cache[name];
  const filename = path.join(sourceDir, `${name}.ts`);
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, {
    filename,
  })(
    id =>
      overrides[id] ||
      (id === '@/lang/I18N'
        ? { default: I18N }
        : id.startsWith('./')
        ? load(id.slice(2))
        : require(id)),
    module,
    module.exports,
  );
  if (!Object.keys(overrides).length) cache[name] = module.exports;
  return module.exports;
}
const p = load('protocol');
const f = load('forms');
const approvals = load('approvals');
const turn = () => ({
  id: 'a',
  messageId: 'm',
  role: 'assistant',
  content: '',
  blocks: [],
  tools: [],
});
test('SSE UTF-8/CRLF split at every byte, multiline data and comments', () => {
  const frames = [];
  const parse = p.createSseParser(value => frames.push(value));
  const decoder = new TextDecoder();
  const bytes = new TextEncoder().encode(
    ': heartbeat\r\n\r\nid: 1\r\nevent: message_delta\r\ndata: {"delta":\r\ndata: "材料碳足迹"}\r\n\r\nid: 2\nevent: completed\ndata: {}\n\n',
  );
  for (const byte of bytes)
    parse(decoder.decode(new Uint8Array([byte]), { stream: true }));
  parse(decoder.decode(), true);
  assert.equal(frames.length, 2);
  assert.equal(frames[0].data.delta, '材料碳足迹');
  assert.equal(frames[0].id, '1');
});
test('Incomplete stream refuses to treat lost JSON as completion', () =>
  assert.throws(() =>
    p.createSseParser(() => {})('data: {"delta":"cut"}', true),
  ));
test('Unsafe numeric IDs are preserved while form numbers remain numbers', () => {
  const data = p.parseJson(
    '{"accountId":9223372036854775807,"amount":0.07,"zero":0,"flag":false,"text":"1234567890123456789"}',
  );
  assert.equal(data.accountId, '9223372036854775807');
  assert.equal(data.amount, 0.07);
  assert.equal(data.zero, 0);
  assert.equal(data.flag, false);
});
test('Tool terminal status beats replayed start and hidden events are omitted', () => {
  let value = p.applyEvent(turn(), {
    eventType: 'tool_call_start',
    toolCallId: 't',
    display: { stageName: '材料核算' },
  });
  value = p.applyEvent(value, {
    eventType: 'tool_call_failed',
    toolCallId: 't',
    errorMessage: '材料缺少单位',
  });
  value = p.applyEvent(value, {
    eventType: 'tool_call_start',
    toolCallId: 't',
  });
  value = p.applyEvent(value, {
    eventType: 'tool_call_start',
    toolCallId: 'hidden',
    safePayload: { visible: 0 },
  });
  assert.equal(value.tools.length, 1);
  assert.equal(value.tools[0].status, 'FAILED');
});
test('Cards duplicated in blocks and cards are merged by actual business ID', () => {
  const card = {
    cardType: 'product_carbon_model',
    bizId: '9223372036854775807',
    bizRef: { accountId: '9223372036854775807', productId: '20' },
  };
  const blocks = p.responseBlocks({
    blocks: [
      { blockId: 'model', blockType: 'business_card', card, orderNo: 5 },
    ],
    cards: [card],
  });
  assert.equal(blocks.length, 1);
  assert.equal(p.cardPayload(blocks[0]).bizRef.productId, '20');
});
test('Real trace envelopes merge tool start/end and surface MCP business errors', () => {
  const event = (eventType, eventId, safePayload) => ({
    messageId: 'm',
    eventType,
    eventId,
    safePayloadJson: JSON.stringify({ eventType, eventId, safePayload }),
  });
  const trace = p.normalizeTrace({
    session: { sessionId: 's', status: 'IDLE' },
    turns: [{ id: '1', role: 'assistant', messageId: 'm', payload: {} }],
    events: [
      event('tool_call_start', 'start', {
        toolCallId: 'tool',
        display: { stageName: '因子检索' },
      }),
      event('tool_call_success', 'end', {
        toolCallId: 'tool',
        contentJson: {
          type: 'mcp_tool_error',
          message: 'agent session auth failed',
        },
      }),
    ],
  });
  assert.equal(trace.turns[0].tools.length, 1);
  assert.equal(trace.turns[0].tools[0].status, 'FAILED');
  assert.match(trace.turns[0].tools[0].error, /鉴权失败/);
  assert.equal(p.running('EXECUTING'), true);
  const live = p.applyEvent(turn(), {
    eventType: 'tool_call_success',
    safePayload: { toolCallId: 't', contentJson: { success: false } },
  });
  assert.equal(live.tools[0].status, 'FAILED');
  const closed = p.applyEvent(turn(), {
    eventType: 'tool_call_success',
    safePayload: { toolCallId: 't', autoClosed: true },
  });
  assert.equal(closed.tools[0].status, 'ENDED');
});
test('Structured modeling approval replaces raw tool dumps only when review data exists', () => {
  const content =
    "Tool execution requires approval\n\nTool: agent_modeling_execute_structured\nArgs: {'sessionId':'internal'}";
  const blocks = p.responseBlocks({
    blocks: [
      {
        blockId: 'review',
        blockType: 'actions',
        extra: {
          actionRequests: [
            {
              name: 'agent_modeling_execute_structured',
              args: { productName: '矿泉水' },
            },
          ],
        },
      },
    ],
  });
  assert.equal(
    p.modelingApproval(p.cardPayload(blocks[0])).args.productName,
    '矿泉水',
  );
  assert.doesNotMatch(p.approvalText(content, blocks), /sessionId|Args:/);
  assert.equal(p.approvalText(content, []), content);
  assert.equal(p.approvalText('请核对数据', blocks), '请核对数据');
});
test('Live forms keep root resumeRequest; history blocks fall back to result templates', () => {
  const resumeRequest = {
    submit: {
      action: 'resume',
      formDataPath: 'resumeData.interrupt.form_submission',
      checkpoint: { id: 'cp' },
    },
  };
  const live = p.applyEvent(turn(), {
    eventType: 'form_request',
    blockId: 'form',
    ui: { fields: [{ name: 'amount', kind: 'number' }] },
    resumeRequest,
  });
  assert.deepEqual(p.cardPayload(live.blocks[0]).resumeRequest, resumeRequest);
  const historical = p.responseBlocks({
    blocks: [
      { blockId: 'form', blockType: 'form', extra: { ui: { fields: [] } } },
    ],
    result: { resumeRequest },
  });
  assert.deepEqual(p.cardPayload(historical[0]).resumeRequest, resumeRequest);
});
test('Final response repairs a truncated delta and keeps form cards', () => {
  let value = p.applyEvent(turn(), {
    eventType: 'message_delta',
    delta: '截断',
  });
  value = p.applyEvent(value, {
    eventType: 'form_request',
    blockId: 'f',
    resumeRequest: { submit: {} },
  });
  value = p.applyEvent(value, {
    eventType: 'final_response',
    reply: '完整结果',
    cards: [],
  });
  assert.equal(value.content, '完整结果');
  assert.equal(value.blocks.length, 1);
  assert.equal(value.blocks[0].blockType, 'form_request');
});
test('Trace attaches tools to their own turns and unlocks only the pending form', () => {
  const trace = p.normalizeTrace({
    session: { sessionId: 's', status: 'NEED_USER_INPUT' },
    turns: [
      { id: '1', role: 'assistant', messageId: 'm1', payload: {} },
      { id: '2', role: 'assistant', messageId: 'm2', payload: {} },
    ],
    events: [
      {
        messageId: 'm1',
        eventType: 'tool_call_start',
        safePayloadJson: '{"toolCallId":"t"}',
      },
    ],
  });
  assert.equal(trace.turns[0].tools[0].status, 'ENDED');
  assert.equal(trace.turns[1].tools.length, 0);
  assert.equal(trace.turns[0].locked, true);
  assert.equal(trace.turns[1].locked, false);
});
test('Nested table values preserve false/zero, defaults and required row validation', () => {
  const fields = f.fieldsFrom({
    rawInterrupt: {
      value: {
        ui: {
          fields: [
            {
              name: 'materials',
              kind: 'table',
              required: true,
              default_rows: [{ amount: 0, estimated: false }],
              columns: [
                { name: 'amount', kind: 'number', required: true, default: 10 },
                { name: 'estimated', kind: 'checkbox', default: true },
              ],
            },
          ],
        },
      },
    },
  });
  const values = f.initialValues(fields);
  assert.deepEqual(values.materials, [{ amount: 0, estimated: false }]);
  assert.equal(f.validateFields(fields, values), undefined);
  assert.equal(f.validateFields(fields, { materials: [] }), 'materials');
});
test('Resume preserves nested template, arrays and types; cancel skips validation', () => {
  const payload = {
    resumeRequest: {
      submit: {
        action: 'resume',
        interruptId: 'i',
        resumeEventId: 'e',
        checkpoint: { id: 'c' },
        copyFormDataToResumeRoot: false,
        formDataPath: 'resumeData.i.form_submission',
        resumeData: { i: { existing: 1 } },
      },
      cancel: { action: 'resume', resumeData: { i: { decision: 'cancel' } } },
    },
  };
  const values = {
    materials: [{ amount: 0, estimated: false }],
    stages: ['a', 'b'],
  };
  const result = p.buildResume(payload, 'submit', values);
  assert.deepEqual(result.resumeData.i.form_submission, values);
  assert.equal(result.resumeData.i.existing, 1);
  assert.equal(result.formDataPath, undefined);
  assert.equal(result.copyFormDataToResumeRoot, false);
  assert.equal(
    payload.resumeRequest.submit.resumeData.i.form_submission,
    undefined,
  );
  assert.deepEqual(
    p.buildResume(payload, 'cancel'),
    payload.resumeRequest.cancel,
  );
  assert.throws(() =>
    p.buildResume(
      { resumeRequest: { submit: { formDataPath: '__proto__.polluted' } } },
      'submit',
      {},
    ),
  );
});
test('Business 403 never logs user out; authenticated upload binds session and enforces 20 MB', async () => {
  let loggedOut = 0;
  let token = 'fixture-token';
  const requests = [];
  const api = load('api', {
    '@/utils/cookie': { getToken: () => token },
    '@/utils': { logout: () => loggedOut++ },
  });
  const original = global.fetch;
  try {
    global.fetch = async (url, init) => {
      requests.push({ url, init });
      return new Response(
        JSON.stringify({
          code: 403,
          data: { reasonCode: 'AGENT_SEAT_REQUIRED' },
        }),
        { status: 403 },
      );
    };
    await assert.rejects(api.api('/restricted'), /席位/);
    assert.equal(loggedOut, 0);
    global.fetch = async (url, init) => {
      requests.push({ url, init });
      return new Response(
        JSON.stringify({ code: 200, data: { fileId: 'file_1' } }),
      );
    };
    const file = new File(['data'], 'materials.csv');
    const uploaded = await api.uploadFile('session_a', file);
    assert.equal(uploaded.fileId, 'file_1');
    assert.equal(requests.at(-1).init.body.get('sessionId'), 'session_a');
    const count = requests.length;
    await assert.rejects(
      api.uploadFile('session_a', { size: 20 * 1024 * 1024 + 1 }),
      /20 MB/,
    );
    assert.equal(requests.length, count);
    global.fetch = async () => {
      token = 'new-org';
      return new Response(JSON.stringify({ code: 200, data: {} }));
    };
    await assert.rejects(api.api('/old-org'), { name: 'AbortError' });
  } finally {
    global.fetch = original;
  }
});

test('Permission and protocol fallback messages follow runtime language changes', () => {
  const api = load('api', {
    '@/utils/cookie': { getToken: () => 'fixture-token' },
    '@/utils': { logout: () => {} },
  });
  try {
    for (const [locale, expected] of [
      [
        'en-US',
        'The team subscription has expired. Please contact your administrator to renew it.',
      ],
      ['zh-TW', '團隊訂閱已到期，請聯繫管理員續費'],
      ['zh-CN', '团队订阅已到期，请联系管理员续费'],
    ]) {
      I18N.setLang(locale);
      assert.equal(api.reasonText('AGENT_TEAM_EXPIRED'), expected);
      assert.equal(
        p.safeText('Authorization: secret'),
        I18N.carbonAgent.safeError,
      );
      assert.throws(() => p.buildResume({}, 'submit'), {
        message: I18N.carbonAgent.resumeTemplateMissing,
      });
      assert.equal(
        p.approvalText('Tool execution requires approval\nTool: modeling', [
          {
            blockId: 'review',
            blockType: 'actions',
            orderNo: 0,
            actionRequests: [{ name: 'agent_modeling_execute_structured' }],
          },
        ]),
        '',
      );
    }
  } finally {
    I18N.setLang('zh-CN');
  }
});

test('Emission update approvals use business display fields and hide technical dumps', () => {
  const payload = {
    cardType: 'action_request',
    actionRequests: [
      {
        name: 'agent_modeling_emission_update_structured',
        args: {
          emissionId: '4979998895262720',
          amount: '120',
          sessionId: 'private',
          messageId: 'internal',
          idempotencyKey: 'work-write',
        },
      },
    ],
    displayActionRequests: [
      {
        actionName: 'agent_modeling_emission_update_structured',
        actionLabel: '修改天然气消耗量',
        fields: [
          { key: 'emissionName', label: '排放源', displayValue: '天然气' },
          { key: 'amount', label: '消耗量', displayValue: '120 立方米' },
          { key: 'zero', label: '数值', displayValue: 0 },
          { key: 'flag', label: '开关', displayValue: false },
          { key: 'stages', label: '阶段', displayValue: ['生产', '运输'] },
        ],
      },
    ],
    resumeRequest: {
      approve: {
        action: 'resume',
        resumeData: { interrupt: { decisions: [{ type: 'approve' }] } },
        checkpoint: { id: 'cp' },
      },
      reject: {
        action: 'resume',
        resumeData: { interrupt: { decisions: [{ type: 'reject' }] } },
      },
    },
  };
  const live = p.applyEvent(turn(), {
    eventType: 'action_request',
    card: { safePayload: payload },
  });
  const normalized = p.cardPayload(live.blocks[0]);
  assert.equal(p.isApproval(normalized), true);
  const reviews = approvals.approvalReviews(normalized);
  assert.equal(reviews[0].title, '修改天然气消耗量');
  assert.deepEqual(
    reviews[0].fields.map(field => field.value),
    ['天然气', '120 立方米', '0', '否', '生产 / 运输'],
  );
  assert.doesNotMatch(
    JSON.stringify(reviews),
    /private|sessionId|idempotencyKey/,
  );
  const dump =
    "Tool execution requires approval\n\nTool: agent_modeling_emission_update_structured Args: {'sessionId': 'private'}";
  assert.equal(p.approvalText(dump, live.blocks), '');
  assert.equal(
    p.approvalText('请确认天然气修改', live.blocks),
    '请确认天然气修改',
  );
  for (const action of ['approve', 'reject'])
    assert.deepEqual(
      p.buildResume(normalized, action),
      payload.resumeRequest[action],
    );
  const history = p.normalizeTrace({
    session: { sessionId: 's', status: 'WAIT_CONFIRM' },
    turns: [
      {
        role: 'assistant',
        messageId: 'm',
        content: dump,
        payload: { blocks: [{ blockType: 'actions', extra: payload }] },
      },
    ],
  });
  assert.equal(history.turns[0].locked, false);
  assert.equal(
    p.approvalText(history.turns[0].content, history.turns[0].blocks),
    '',
  );
  assert.deepEqual(
    approvals.approvalReviews(p.cardPayload(history.turns[0].blocks[0])),
    reviews,
  );
});

test('Approval fallback reviews raw business arguments, including zero and false', () => {
  const reviews = approvals.approvalReviews({
    rawInterrupt: {
      value: {
        action_requests: [
          {
            name: 'agent_modeling_emission_update_structured',
            args: {
              input: {
                emissionId: '4979998895262720',
                amount: 0,
                estimated: false,
                sessionId: 'secret',
                messageId: 'secret',
                idempotencyKey: 'secret',
              },
            },
          },
        ],
      },
    },
  });
  assert.equal(reviews[0].title, '修改排放源数据');
  assert.deepEqual(
    reviews[0].fields.map(field => field.value),
    ['4979998895262720', '0', '否'],
  );
  assert.doesNotMatch(JSON.stringify(reviews), /secret/);
  assert.equal(
    approvals.approvalValue({ details: { sessionId: 'secret', amount: 120 } }),
    'details: amount: 120',
  );
});

test('Approval review renders consumption and target instead of an empty result card', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const filename = path.join(
    sourceDir,
    'components/Messages/components/MessageCard/components/ApprovalReview/index.tsx',
  );
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${output}\n})`, {
    filename,
  })(
    id =>
      id === '@/lang/I18N'
        ? { default: I18N }
        : id.endsWith('/approvals')
        ? approvals
        : id.endsWith('.less')
        ? { default: {} }
        : require(id),
    module,
    module.exports,
  );
  const markup = renderToStaticMarkup(
    React.createElement(module.exports.default, {
      payload: {
        actionRequests: [
          {
            name: 'agent_modeling_emission_update_structured',
            args: {
              emissionId: '4979998895262720',
              amount: '120',
              sessionId: 'private',
              messageId: 'internal',
              idempotencyKey: 'write-key',
            },
          },
        ],
      },
    }),
  );
  assert.match(markup, /修改排放源数据/);
  assert.match(markup, /<dt>消耗量<\/dt><dd>120<\/dd>/);
  assert.match(markup, /4979998895262720/);
  assert.doesNotMatch(
    markup,
    /sessionId|messageId|idempotencyKey|private|internal|write-key/,
  );
});
