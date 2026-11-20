// node --test scripts/test-cbam-factory-defaults.cjs
// 执行 FactoryDrawer 的真实实体回填回调；隔离 UI 渲染，不向服务器写入工厂。
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/views/cbamMonitor/components/FactoryDrawer.tsx'), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } },
).outputText;
const regions = [
  { value: '110000', label: '北京市', children: [{ value: '110100', label: '北京市', children: [{ value: '110102', label: '西城区' }] }] },
  { value: '710000', label: '台湾省', children: [{ value: '710100', label: '台北市' }] },
  { value: '810000', label: '香港特别行政区', children: [{ value: '810100', label: '香港岛' }] },
  { value: '820000', label: '澳门特别行政区', children: [{ value: '820100', label: '澳门半岛' }] },
  { value: '900000', label: '海外', children: [{ value: '984000', label: '美国' }] },
];
const countries = [
  { label: '中国', value: '49', relatedValue: 'CN' },
  { label: '香港', value: '97', relatedValue: 'HK' },
  { label: '美国', value: '237', relatedValue: 'US' },
];

/** 运行真实回填 effect，保留其异步清理及 touched 字段保护逻辑。 */
async function fill(org, options = {}) {
  const effects = [];
  const fields = { ...options.fields };
  const errors = [];
  const form = { setFieldValue: (key, value) => { fields[key] = value; } };
  const labels = new Proxy({}, { get: (_, key) => key });
  const moduleExports = {};
  const noop = () => null;
  const dependencies = {
    'react/jsx-runtime': { jsx: noop, jsxs: noop },
    react: {
      useEffect: effect => effects.push(effect),
      useRef: () => ({ current: new Set(options.touched) }),
      useState: initial => [initial, noop],
    },
    antd: { Form: { useForm: () => [form], useWatch: () => [1113] }, message: { error: error => errors.push(error) } },
    '@src/lang/I18N': { __esModule: true, default: { cbam: labels, cbamMonitor: labels, carbonFootprint: labels } },
    '@/hooks/useCityInfo': { useCityInfo: () => options.regions || regions },
    '@/views/dashborad/organization/services': {
      getCompanyOrgInfo: async () => {
        if (options.fail) throw new Error('entity request failed');
        return { data: { data: org } };
      },
      getUserList: async () => ({ data: [{ id: 7, userId: 8, employName: '联系人', employEmail: 'contact@example.com', employPhone: '+86 13800000000' }] }),
    },
    '@/views/system/login/service': {},
    '@/components/CbamFieldLabel': {},
    '@/components/CbamDrawerHeader': {},
    '../index.module.less': {},
    '../service': {},
  };
  vm.runInNewContext(source, {
    exports: moduleExports,
    require: key => {
      if (!(key in dependencies)) throw new Error(`Unexpected dependency: ${key}`);
      return dependencies[key];
    },
  });
  moduleExports.FactoryDrawer({ open: true, countryOptions: options.countries || countries });
  // 第二个 effect 专门负责切换实体后的自动回填。
  const cleanup = effects[1]();
  if (options.cancel) cleanup();
  await new Promise(resolve => setImmediate(resolve));
  return { fields, errors };
}

test('实体 1113 的 orgArea 字符串 null 不报错，地址与联系人仍可独立带入', async () => {
  const result = await fill({ orgArea: 'null', addrDetail: '实体地址', linkmanUserid: 8 });
  assert.equal(result.errors.length, 0);
  assert.equal(result.fields.country, undefined);
  assert.equal(result.fields.detailedAddress, '实体地址');
  assert.equal(result.fields.authorizedRepresentative, '联系人');
  assert.equal(result.fields.phoneAreaCode, '+86');
  assert.equal(result.fields.mobile, '13800000000');
  for (const orgArea of [null, '', '[]']) {
    assert.equal((await fill({ orgArea })).errors.length, 0);
  }
});

test('非海外分支国家统一为中国，城市取二级且不取三级区县', async () => {
  const domestic = await fill({ orgArea: '[110000,110100,110102]' });
  assert.equal(domestic.fields.country, '49');
  assert.equal(domestic.fields.city, '北京市');
  for (const [orgArea, city] of [
    ['[710000,710100]', '台北市'],
    ['[810000,810100]', '香港岛'],
    ['[820000,820100]', '澳门半岛'],
  ]) {
    const result = await fill({ orgArea });
    assert.equal(result.fields.country, '49');
    assert.equal(result.fields.city, city);
  }
  const english = await fill({ orgArea: '[110000,110100]' }, {
    countries: [{ label: 'China', value: '49', relatedValue: 'CN' }],
  });
  assert.equal(english.fields.country, '49');
  assert.equal((await fill({ orgArea: '[999999]' })).fields.country, undefined);
});

test('海外分支国家取二级，城市留空并清除之前自动带入的城市', async () => {
  const result = await fill({ orgArea: '[900000,984000]' }, {
    fields: { country: '49', city: '北京市' },
  });
  assert.equal(result.fields.country, '237');
  assert.equal(result.fields.city, '');
  assert.equal(result.errors.length, 0);
});

test('字典未加载时不写入国家，加载后可回填，手动修改的国家和地址不被覆盖', async () => {
  const org = { orgArea: '[110000,110100]', addrDetail: '实体地址' };
  assert.equal((await fill(org, { countries: [] })).fields.country, undefined);
  assert.equal((await fill(org)).fields.country, '49');
  const protectedFields = await fill(org, {
    touched: ['country', 'detailedAddress'], fields: { country: '237', detailedAddress: '手动地址' },
  });
  assert.equal(protectedFields.fields.country, '237');
  assert.equal(protectedFields.fields.detailedAddress, '手动地址');
});

test('切换实体后的旧请求不写回；真实请求失败仍保留错误提示', async () => {
  const cancelled = await fill({ orgArea: '[110000,110100]' }, { cancel: true });
  assert.equal(Object.keys(cancelled.fields).length, 0);
  assert.equal(cancelled.errors.length, 0);
  assert.equal((await fill({}, { fail: true })).errors.length, 1);
});
