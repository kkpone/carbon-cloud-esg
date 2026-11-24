const assert = require('node:assert/strict');
const test = require('node:test');
const ts = require('typescript');
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');

const langRoot = path.resolve(__dirname, '../../../../lang');

function loadTs(filename, mocks = {}) {
  const mod = new Module(filename, module);
  const native = Module.createRequire(filename);
  mod.require = name => {
    if (Object.prototype.hasOwnProperty.call(mocks, name)) return mocks[name];
    return native(name);
  };
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    fileName: filename,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  });
  mod._compile(result.outputText, filename);
  return mod.exports;
}

const helpers = loadTs(path.join(__dirname, 'securityHelpers.ts'));
const errors = loadTs(path.join(__dirname, 'errors.ts'), {
  './i18n': { teamText: key => key },
  '@src/lang/createI18nLabelMap': loadTs(
    path.resolve(__dirname, '../../../../lang/createI18nLabelMap.ts'),
  ),
});
const securityMock = loadTs(path.join(__dirname, 'securityMock.ts'), {
  '@src/store/actionTypes': { SET_COMPANY_USER_INFO: 'SET_COMPANY_USER_INFO' },
  '@src/utils/feishuSession': { getLoginStorage: () => ({ getItem: () => null }) },
  './errors': errors,
});

test('zero-retention agreement path preserves optional region query param', () => {
  assert.equal(
    helpers.getZeroRetentionAgreementPath(),
    '/agreement/zero-retention',
  );
  assert.equal(
    helpers.getZeroRetentionAgreementPath('DOMESTIC'),
    '/agreement/zero-retention?region=domestic',
  );
  assert.equal(
    helpers.getZeroRetentionAgreementPath('OVERSEAS'),
    '/agreement/zero-retention?region=overseas',
  );
});

test('security mode and conversation sharing follow workspace type and security policy', () => {
  const personal = {
    companyId: '1',
    companyName: 'Personal',
    workspaceType: 'PERSONAL',
    canEnter: true,
    canManage: false,
    canUseAi: true,
    security: { enabled: true, allowSessionShare: false },
  };
  assert.equal(helpers.isSecurityModeActive(personal), false);
  assert.equal(helpers.canShareWorkspaceConversation(true, personal), true);

  const teamSecurityOff = {
    companyId: '2',
    companyName: 'Team A',
    workspaceType: 'TEAM',
    canEnter: true,
    canManage: true,
    canUseAi: true,
    security: { enabled: false, allowSessionShare: true },
  };
  assert.equal(helpers.isSecurityModeActive(teamSecurityOff), false);
  assert.equal(
    helpers.canShareWorkspaceConversation(false, teamSecurityOff),
    false,
  );

  const teamShareBlocked = {
    ...teamSecurityOff,
    security: {
      enabled: true,
      modelRegion: 'DOMESTIC',
      allowSessionShare: false,
    },
  };
  assert.equal(helpers.isSecurityModeActive(teamShareBlocked), true);
  assert.equal(
    helpers.canShareWorkspaceConversation(false, teamShareBlocked),
    false,
  );

  const teamShareAllowed = {
    ...teamSecurityOff,
    security: {
      enabled: true,
      modelRegion: 'OVERSEAS',
      allowSessionShare: true,
    },
  };
  assert.equal(helpers.isSecurityModeActive(teamShareAllowed), true);
  assert.equal(
    helpers.canShareWorkspaceConversation(false, teamShareAllowed),
    true,
  );
});

test('batch desensitization word parser handles commas, tabs, duplicates and invalid lengths', () => {
  const parsed = helpers.parseBatchDesensitizationWords(
    [
      '',
      '星辰项目',
      '华东精密, [客户A], 客户 / 供应商',
      '星辰项目',
      '已有词条',
      'A',
      'Project Alpha\t[PROJECT_1]\t项目',
    ].join('\n'),
    ['已有词条'],
  );

  assert.equal(parsed.skippedEmpty, 1);
  assert.deepEqual(parsed.duplicateWords, ['星辰项目', '已有词条']);
  assert.deepEqual(parsed.invalidWords, ['A']);
  assert.deepEqual(parsed.items, [
    { word: '星辰项目', enabled: true },
    {
      word: '华东精密',
      replacement: '[客户A]',
      category: '客户 / 供应商',
      enabled: true,
    },
    {
      word: 'Project Alpha',
      replacement: '[PROJECT_1]',
      category: '项目',
      enabled: true,
    },
  ]);
});

test('agentTeam zh-CN and en-US keys and placeholders remain aligned after security additions', () => {
  const zh = loadTs(path.join(langRoot, 'zh-CN/agentTeam.ts')).default;
  const en = loadTs(path.join(langRoot, 'en-US/agentTeam.ts')).default;
  assert.deepEqual(Object.keys(en).sort(), Object.keys(zh).sort());
  const vars = value => (value.match(/\{\w+\}/g) || []).sort();
  for (const key of Object.keys(zh)) {
    assert.ok(en[key].trim(), key);
    assert.ok(!/[\u3400-\u9fff]/.test(en[key]), key);
    assert.deepEqual(vars(en[key]), vars(zh[key]), key);
  }
});

test('security API fallback triggers on gateway unimplemented 404/500 responses but preserves auth and AGENT_* errors', () => {
  assert.equal(
    securityMock.isSecurityApiUnavailable({
      status: 200,
      data: { code: 500, msg: '内部服务器错误' },
    }),
    true,
  );
  assert.equal(
    securityMock.isSecurityApiUnavailable({
      response: { status: 404, data: { code: 404 } },
    }),
    true,
  );
  assert.equal(
    securityMock.isSecurityApiUnavailable({
      status: 200,
      data: { code: 403, msg: 'AGENT_TEAM_MANAGEMENT_FORBIDDEN' },
    }),
    false,
  );
  assert.equal(
    securityMock.isSecurityApiUnavailable({
      status: 200,
      data: { code: 401, msg: 'Unauthorized' },
    }),
    false,
  );
  assert.equal(
    securityMock.isSecurityApiUnavailable({
      status: 200,
      data: { code: 500, msg: 'AGENT_SECURITY_WORD_DUPLICATE' },
    }),
    false,
  );
});
