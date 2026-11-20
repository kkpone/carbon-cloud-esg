/* node --test scripts/test-cloud-locale.cjs */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

function load(file, dependencies, globals = {}) {
  const code = ts.transpileModule(
    fs.readFileSync(path.join(__dirname, '..', file), 'utf8'),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
      },
    },
  ).outputText;
  const exports = {};
  vm.runInNewContext(code, {
    exports,
    URLSearchParams,
    ...globals,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  });
  return exports;
}

function setup({
  pathname = '/en/work/index',
  search = '?x=1',
  hash = '#part',
  account = true,
  ticketLang = 'zt',
  accountLang = 'en',
} = {}) {
  const calls = [];
  const effects = [];
  const states = [];
  const location = {
    pathname,
    search,
    hash,
    reload: () => calls.push(['reload']),
  };
  const window = {
    location,
    history: {
      state: {},
      replaceState(_state, _title, url) {
        calls.push(['replace', url]);
        const parsed = new URL(url, 'https://example.test');
        Object.assign(location, {
          pathname: parsed.pathname,
          search: parsed.search,
          hash: parsed.hash,
        });
      },
    },
  };
  const localePath = load(
    'src/router/localePath.ts',
    { '../config': { __esModule: true, default: { BASENAME: '' } } },
    { window },
  );
  const langs = { zhCN: 'zh-CN', zhTW: 'zh-TW', enUS: 'en-US' };
  const storage = {
    getItem: () => (account ? '{"access_token":"test"}' : '{}'),
    removeItem() {},
    setItem() {},
  };
  const component = load(
    'src/components/LocaleProvider/index.tsx',
    {
      'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
      react: {
        createContext: () => ({ Provider: 'Provider' }),
        useMemo: fn => fn(),
        useCallback: fn => fn,
        useEffect: fn => effects.push(fn),
        useState: initial => {
          const index = states.length;
          states.push(typeof initial === 'function' ? initial() : initial);
          return [
            states[index],
            value => {
              states[index] = value;
            },
          ];
        },
      },
      '@formily/core': {
        setValidateLanguage: value => calls.push(['validation', value]),
      },
      '@src/lang/I18N': {
        __esModule: true,
        default: { setLang: value => calls.push(['kiwi', value]) },
        LocaleType: langs,
        initLocale: langs.zhCN,
        setCurrentLocale: value => calls.push(['current', value]),
        serviceLangMap: { 'zh-CN': 'zh', 'zh-TW': 'zt', 'en-US': 'en' },
        serviceLangMapReverse: { zh: 'zh-CN', zt: 'zh-TW', en: 'en-US' },
      },
      '@src/router/localePath': localePath,
      '@src/api/api': { apiQuideList: async () => ({ data: { data: [] } }) },
      '@src/store/actionTypes': { SET_COMPANY_USER_INFO: 'user' },
      '@src/store/module/nav': { USER_KEY: 'nav' },
      '@src/utils': { mapChildren: value => value },
      '@src/utils/feishuSession': { getLoginStorage: () => storage },
      '@src/views/system/login/service': {
        getLanguage: async () => {
          calls.push(['query']);
          if (accountLang instanceof Error) throw accountLang;
          return { lang: accountLang };
        },
        getLanguageByTicket: async () => {
          calls.push(['ticket']);
          return { lang: ticketLang };
        },
        switchLanguage: async params => calls.push(['switch', params.lang]),
        switchLanguageByTicket: async params =>
          calls.push(['switchTicket', params.lang]),
      },
      '@src/config/deploy': { isAgentDeploy: false },
      ahooks: { useTitle() {} },
      antd: { Spin: 'Spin' },
      'lodash-es': { noop() {} },
      '../LayoutNavBar/utils': {
        getProductPermission: async () => [null, null],
      },
    },
    { window, sessionStorage: { getItem: () => null } },
  );
  const rendered = component.LocaleProvider({ children: 'app' });
  effects.forEach(effect => effect());
  return { calls, states, rendered, localePath };
}

const flush = () => new Promise(resolve => setImmediate(resolve));

test('account language wins over a legacy URL and visiting does not change the account', async () => {
  const app = setup();
  await flush();
  assert.deepEqual(
    app.calls.find(call => call[0] === 'replace'),
    ['replace', '/work/index?x=1#part'],
  );
  assert.ok(
    app.calls.some(call => call[0] === 'current' && call[1] === 'en-US'),
  );
  assert.equal(
    app.calls.some(call => call[0] === 'switch'),
    false,
  );
  assert.equal(app.states[1], true);
});

test('ticket language takes priority; anonymous legacy URLs preserve initial language', async () => {
  const ticket = setup({ search: '?ticket=one', account: true });
  await flush();
  assert.ok(
    ticket.calls.some(call => call[0] === 'current' && call[1] === 'zh-TW'),
  );
  assert.equal(
    ticket.calls.some(call => call[0] === 'query'),
    false,
  );
  const anonymous = setup({ pathname: '/en/work/index', account: false });
  await flush();
  assert.ok(
    anonymous.calls.some(call => call[0] === 'current' && call[1] === 'en-US'),
  );
});

test('user language changes update the backend and reload without adding a prefix', async () => {
  const app = setup({ pathname: '/work/index' });
  await flush();
  await app.rendered.props.value.changeLocale({
    currentLocale: 'en-US',
    syncUrl: true,
  });
  assert.ok(app.calls.some(call => call[0] === 'switch' && call[1] === 'en'));
  assert.equal(app.calls.at(-1)[0], 'reload');
  assert.equal(
    app.localePath.withCurrentLocalePrefix('/work/index'),
    '/work/index',
  );
});

test('failed backend language lookup does not mount the app in a guessed language', async () => {
  const app = setup({ accountLang: new Error('offline') });
  await flush();
  assert.equal(app.states[1], false);
  assert.equal(app.states[2], true);
  assert.equal(
    app.calls.some(call => call[0] === 'switch'),
    false,
  );
});

test('new navigation omits locale prefixes and old paths preserve their parameters', () => {
  const app = setup({ account: false });
  const { localePath } = app;
  assert.equal(localePath.withCurrentLocalePrefix('/carbon/detail?id=7'), '/carbon/detail?id=7');
  assert.equal(localePath.buildLocaleSwitchPath('en', {
    basename: '/app', pathname: '/app/zt/work/index', search: '?id=7', hash: '#part',
  }), '/app/work/index?id=7#part');
  assert.equal(localePath.getLocaleRouterBasename('/app/en/work', '/app'), '/app');
});
