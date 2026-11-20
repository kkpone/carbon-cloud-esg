const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { createForm } = require('@formily/core');

const root = path.resolve(__dirname, '..');
const reportRoot = 'src/views/carbonFootprint3/Report/Info/';
const monteRoot = `${reportRoot}components/MonteCarloAnalysis/`;
const constants = {
  REPORT_TYPE: { REPORT: 0, COMPARE: 1, CARBON_LABEL: 2, REDUCTION: 3 },
  COMPARISON_REPORT_TYPE: { TARGET: 0, STANDARD: 1 },
  FootprintAccountStatusType: { QUICK: 0, PROCESS: 1 },
  FootprintAccountListTypeValue: { COMPLETE: 2 },
};

function fixture(overrides = {}) {
  const cache = new Map();
  const calls = [];
  const messages = [];
  const i18n = {
    carbonFootprint: {},
    carbonFootprint3: {},
    template: (text, values) =>
      text.replace(/\{(\w+)\}/g, (_, key) => values[key]),
  };
  const save = async ({ report }) => {
    calls.push(report);
    return { data: { code: 200 } };
  };
  const mocks = {
    '@/lang/I18N': { default: i18n },
    '@src/lang/I18N': { default: i18n },
    '@src/utils': { tryParseJSON: JSON.parse },
    '@/api/request': { request: overrides.request },
    '@/utils/Toast': { Toast: () => {} },
    antd: {
      Modal: { error: () => {}, warning: () => {} },
      message: { warning: text => messages.push(text) },
    },
    react: {
      useRef: current => ({ current }),
      useState: value => [value, () => {}],
    },
    'react-router-dom': {
      useHistory: () => ({ push: () => {} }),
      useParams: () => ({ pageInfoType: 'add', id: 'null' }),
    },
    '@/router/type': { PageInfoType: { add: 'add', edit: 'edit' } },
    '@/router/route-paths/corbonFootprint3': {
      RouteMapsCorbonFootprint3: {
        carbonFootprint3ProcessReport: '/carbonFootprint3/report',
      },
    },
    '@/sdks_v2/footprint3V2ApiDocs': {
      POSTfdf3917ac048472511d90e1110fbcb73: overrides.save || save,
      POST78bcf124777efe639e8c76d0c6aea265: overrides.save || save,
    },
  };
  function load(file) {
    const absolute = path.resolve(root, file);
    if (cache.has(absolute)) return cache.get(absolute).exports;
    const module = { exports: {} };
    cache.set(absolute, module);
    const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
      fileName: absolute,
    }).outputText;
    const localRequire = name => {
      if (Object.hasOwn(mocks, name)) return mocks[name];
      if (name.endsWith('/constant')) return constants;
      if (name.startsWith('.')) {
        const target = path.resolve(path.dirname(absolute), name);
        return load(
          fs.existsSync(`${target}.ts`) ? `${target}.ts` : `${target}.tsx`,
        );
      }
      return require(name);
    };
    vm.runInThisContext(`(function(require,module,exports){${code}\n})`, {
      filename: absolute,
    })(localRequire, module, module.exports);
    return module.exports;
  }
  return { load, calls, messages };
}

const parameter = {
  id: 'activity-1',
  dataType: 'activity',
  sourceName: 'Material',
  sourceType: 1,
  stage: 1,
  unit: 'kg',
  mean: '10',
  uncertainty: '5',
  distribution: 'NORMAL',
};

test('draft validation relaxes empty required fields and restores rules after success or failure', async () => {
  const { validateDraft } = fixture().load(`${reportRoot}validateDraft.ts`);
  const form = createForm();
  const empty = form.createField({ name: 'empty', required: true });
  const code = form.createField({
    name: 'code',
    required: true,
    validator: { pattern: /^[a-z]+$/, message: 'letters only' },
  });
  code.setValue('valid');
  await validateDraft(form);
  assert.equal(empty.required, true);
  code.setValue('123');
  await assert.rejects(validateDraft(form));
  assert.equal(empty.required, true);
  assert.equal(code.required, true);
});

test('Monte Carlo rejects missing/invalid input and accepts hidden factor means and zero uncertainty', () => {
  const { parameterReady, monteCarloConfigReady } = fixture().load(
    `${monteRoot}validation.ts`,
  );
  assert.equal(parameterReady({ ...parameter, uncertainty: 0 }), true);
  for (const uncertainty of [null, undefined, '', -1, 'invalid']) {
    assert.equal(
      parameterReady({ ...parameter, uncertainty }),
      false,
      `uncertainty=${uncertainty}`,
    );
  }
  assert.equal(parameterReady({ ...parameter, mean: 0 }), false);
  assert.equal(
    parameterReady({
      ...parameter,
      mean: null,
      dataType: 'factor',
      valueHidden: true,
    }),
    true,
  );
  for (const iterations of [null, 0, 1.5, 100000]) {
    assert.equal(
      monteCarloConfigReady({ iterations, parameters: [parameter] }),
      false,
    );
  }
  assert.equal(
    monteCarloConfigReady({ iterations: 1000, parameters: [parameter] }),
    true,
  );
  assert.equal(
    monteCarloConfigReady({ iterations: 1000, parameters: [] }),
    false,
  );
});

test('AI defaults fill blanks without replacing user edits, including edits cleared while pending', () => {
  const { mergeMonteCarloAIDefaults } = fixture().load(
    `${monteRoot}aiDefaults.ts`,
  );
  const before = {
    ...parameter,
    distribution: undefined,
    uncertainty: null,
    mean: null,
  };
  const current = { ...before, mean: '22' };
  const result = mergeMonteCarloAIDefaults(
    before,
    current,
    parameter,
    new Set(['distribution']),
  );
  assert.equal(result.mean, '22');
  assert.equal(result.uncertainty, '5');
  assert.equal(result.distribution, undefined);
  assert.equal(before.uncertainty, null);
  assert.equal(
    mergeMonteCarloAIDefaults(
      before,
      { ...before, valueHidden: true },
      parameter,
    ).mean,
    null,
  );
  assert.equal(
    mergeMonteCarloAIDefaults(before, current, { ...parameter, id: 'other' }),
    current,
  );
});

test('analysis requests retain share context and omit display fields from Monte Carlo input', async () => {
  let request;
  const f = fixture({
    request: async args => {
      request = args;
      return { data: { data: [] } };
    },
  });
  const { getSensitivityResults } = f.load(
    'src/views/carbonFootprint3/components/SensitivityTable/service.ts',
  );
  await getSensitivityResults(42, {
    snapFlag: 7,
    shareAuth: 'fixture-share',
    accountId: 1,
  });
  assert.equal(request.url, '/footprint3/account/sensitivity/list');
  assert.deepEqual(request.params, {
    snapFlag: 7,
    shareAuth: 'fixture-share',
    accountId: 42,
  });
  const { monteCarloRequest } = f.load(`${monteRoot}service.ts`);
  const result = monteCarloRequest({
    accountId: 42,
    config: { iterations: 1000, parameters: [parameter] },
    reportActivityList: [{ dataType: 1, uncertain: 5, descs: 'display only' }],
  });
  assert.equal(result.config.parameters[0].unit, 'kg');
  assert.equal(result.config.parameters[0].sourceName, undefined);
  assert.deepEqual(result.reportActivityList, [{ dataType: 1, uncertain: 5 }]);
});

test('sensitivity scope migration maps split IDs, removes deleted IDs, and retains hidden selections', async () => {
  const f = fixture({
    request: async () => ({
      data: {
        data: [{ id: 'new', idMappings: { old: 'new,new-2', removed: '' } }],
      },
    }),
  });
  const { getReportSensitivityResults } = f.load(
    `${reportRoot}components/ReportSensitivity/service.ts`,
  );
  assert.equal(
    (await getReportSensitivityResults('42', 'old,removed,hidden,new'))
      .sensitivityScope,
    'new,new-2,hidden',
  );
  assert.equal(
    (await getReportSensitivityResults('42', '0')).sensitivityScope,
    '0',
  );
  assert.equal(
    (await getReportSensitivityResults('42', '')).sensitivityScope,
    '',
  );
});

test('report analysis round-trip preserves unvisited products and submits calculation IDs instead of results', () => {
  const { collectMonteCarloStates, attachMonteCarloStates } = fixture().load(
    `${reportRoot}reportUtils.ts`,
  );
  const config = { iterations: 1000, parameters: [parameter] };
  const report = {
    type: 0,
    reportAccountList: [
      {
        accountId: 1,
        monteCarloConfig: JSON.stringify(config),
        monteCarloResult: JSON.stringify({ calculationId: 'job-1' }),
        monteCarloDescription: 'saved',
      },
      { accountId: 2, monteCarloConfig: config },
    ],
    monteCarloByAccount: {
      2: { config: { ...config, iterations: 2000 }, description: 'edited' },
    },
  };
  const states = collectMonteCarloStates(report);
  attachMonteCarloStates(report, states);
  assert.equal(report.reportAccountList[0].monteCarloCalculationId, 'job-1');
  assert.equal(report.reportAccountList[0].monteCarloDescription, 'saved');
  assert.equal(report.reportAccountList[1].monteCarloConfig.iterations, 2000);
  assert.equal(report.reportAccountList[1].monteCarloDescription, 'edited');
  assert.equal(report.reportAccountList[0].monteCarloResult, undefined);
  assert.equal(report.monteCarloByAccount, undefined);
  assert.equal(report.uncertaintyMethod, 'TAYLOR');
});

function saveOptions(values) {
  return {
    form: { current: createForm({ values }) },
    accountId: { current: undefined },
    accountTypeRef: { current: 0 },
    units: { current: [] },
    compareUnits: { current: [] },
    sensitivityConfigs: {},
    hasSubmitAttemptedRef: { current: false },
    setAnalysisTab: () => {},
  };
}

test('all report types can save name-only drafts, including a carbon label without stage data', async () => {
  for (const type of [0, 1, 2, 3]) {
    const f = fixture();
    const { useReportSave } = f.load(`${reportRoot}hooks/useReportSave.ts`);
    const options = saveOptions({ reportName: 'Draft fixture', type });
    await useReportSave(options).handleSave(true);
    assert.equal(f.calls.length, 1, `report type=${type}`);
    assert.equal(f.calls[0].reportStatus, 0);
    assert.equal(options.form.current.values.productId, undefined);
  }
});

test('cleared target accounts are not restored from a stale selection when saving drafts', async () => {
  for (const type of [1, 2, 3]) {
    const f = fixture();
    const { useReportSave } = f.load(`${reportRoot}hooks/useReportSave.ts`);
    const options = saveOptions({
      reportName: 'Cleared target',
      type,
      productName: 2,
    });
    options.accountId.current = 42;
    await useReportSave(options).handleSave(true);
    assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].accountId, undefined, `report type=${type}`);
    assert.ok(
      f.calls[0].reportAccountList?.every(row => row.accountId !== 42) ?? true,
    );
  }
});

test('comparison options retain account type restrictions and reduction requires completed quick accounts', () => {
  const { filterReportComparisonAccounts } = fixture().load(
    `${reportRoot}reportUtils.ts`,
  );
  const accounts = [
    { id: 10, type: 0, accountStatus: 2 },
    { id: 11, type: 0, accountStatus: 1 },
    { id: 12, type: 1, accountStatus: 2 },
    { id: 13, type: 1, accountStatus: 1 },
    { id: 14, type: 0, accountStatus: 2 },
  ];
  assert.deepEqual(
    filterReportComparisonAccounts(accounts, 3, 10).map(row => row.id),
    [14],
  );
  assert.deepEqual(
    filterReportComparisonAccounts(accounts, 1, 12, 1).map(row => row.id),
    [13],
  );
  assert.deepEqual(
    filterReportComparisonAccounts(accounts, 1).map(row => row.id),
    [10, 11, 12, 13, 14],
  );
  assert.deepEqual(
    filterReportComparisonAccounts(accounts, 1, 12, '1').map(row => row.id),
    [13],
  );
});

test('completed comparison reports preserve target/base associations and both analysis configurations', async () => {
  const f = fixture();
  const { useReportSave } = f.load(`${reportRoot}hooks/useReportSave.ts`);
  const config = { iterations: 1000, parameters: [parameter] };
  const options = saveOptions({
    reportName: 'Comparison',
    type: 1,
    productName: 1,
    accountName: 42,
    compareProductName: 2,
    compareAccountName: 77,
    suppose: 'Original assumptions',
    uncertaintyMethod: 'MONTE_CARLO',
    monteCarloByAccount: {
      42: {
        config,
        description: 'Target analysis',
        result: { calculationId: 'target-job' },
      },
      77: {
        config,
        description: 'Base analysis',
        result: { calculationId: 'base-job' },
      },
    },
  });
  options.units.current = [{ id: 42, type: 1 }];
  options.compareUnits.current = [{ id: 77, type: 1 }];
  options.accountTypeRef.current = 1;
  options.sensitivityConfigs = {
    42: { scope: '', description: 'Target excludes all' },
    77: { scope: 'factor-1', description: 'Base subset' },
  };
  await useReportSave(options).handleSave(false);
  const report = f.calls[0];
  assert.equal(report.reportStatus, 1);
  assert.equal(report.accountType, 1);
  assert.equal(report.suppose, 'Original assumptions');
  assert.deepEqual(
    report.reportAccountList.map(row => [
      row.accountId,
      row.productId,
      row.baseType,
    ]),
    [
      [42, 1, 0],
      [77, 2, 1],
    ],
  );
  assert.deepEqual(
    report.reportAccountList.map(row => row.sensitivityScope),
    ['', 'factor-1'],
  );
  assert.deepEqual(
    report.reportAccountList.map(row => row.monteCarloCalculationId),
    ['target-job', 'base-job'],
  );
});

test('reduction reports retain scenario and lifecycle fields while excluding other report data', async () => {
  const f = fixture();
  const { useReportSave } = f.load(`${reportRoot}hooks/useReportSave.ts`);
  const options = saveOptions({
    reportName: 'Reduction',
    type: 3,
    productName: 1,
    accountName: 42,
    compareProductName: 2,
    compareAccountName: 77,
    description: 'Project',
    suppose: 'Assumptions',
    reduceExtra: {
      stageList: [{ stage: 0, name: 'Raw materials' }],
      targetScence: 'Target',
      baseScence: 'Base',
      suggestion: 'Suggestion',
    },
    reportFactoryList: [{ dataType: 0, uncertain: 5 }],
    reportExtraInfo: { producer: 'Not applicable' },
    uncertaintyMethod: 'MONTE_CARLO',
  });
  options.units.current = [{ id: 42, type: 0 }];
  await useReportSave(options).handleSave(false);
  const report = f.calls[0];
  assert.deepEqual(report.reportAccountList, [
    { accountId: 42, baseType: 0 },
    { accountId: 77, baseType: 1 },
  ]);
  assert.equal(report.description, 'Project');
  assert.equal(report.suppose, 'Assumptions');
  assert.equal(report.reduceExtra.stageList[0].name, 'Raw materials');
  assert.equal(report.reduceExtra.targetScence, 'Target');
  assert.equal(report.reduceExtra.baseScence, 'Base');
  assert.equal(report.reduceExtra.suggestion, 'Suggestion');
  assert.equal(report.reportFactoryList, undefined);
  assert.equal(report.reportExtraInfo, undefined);
  assert.equal(report.uncertaintyMethod, undefined);
});

test('carbon labels preserve certification and stage details and strip only the stage helper field', async () => {
  const f = fixture();
  const { useReportSave } = f.load(`${reportRoot}hooks/useReportSave.ts`);
  const options = saveOptions({
    reportName: 'Label',
    type: 2,
    productName: 1,
    accountName: 42,
    reportExtraInfo: {
      producer: 'Factory',
      productIndicator: [
        { name: 'Size', standard: 'Specification', indicatorValue: '1' },
      ],
    },
    stageEmissions: { stages: [0], 0: [{ thirdId: 1, source: 'Material' }] },
    reportFactoryList: [{ dataType: 0, uncertain: 5 }],
  });
  await useReportSave(options).handleSave(false);
  const report = f.calls[0];
  assert.equal(report.accountId, 42);
  assert.equal(report.reportExtraInfo.producer, 'Factory');
  assert.equal(report.reportExtraInfo.productIndicator[0].indicatorValue, '1');
  assert.deepEqual(report.stageEmissions[0], [
    { thirdId: 1, source: 'Material' },
  ]);
  assert.equal(report.stageEmissions.stages, undefined);
  assert.equal(report.reportFactoryList[0].uncertain, 5);
  assert.deepEqual(options.form.current.values.stageEmissions.stages, [0]);
});

test('draft requires a name and completed Monte Carlo report requires complete configuration', async () => {
  const f = fixture();
  const { useReportSave } = f.load(`${reportRoot}hooks/useReportSave.ts`);
  await useReportSave(saveOptions({ reportName: ' ', type: 0 })).handleSave(
    true,
  );
  const options = saveOptions({
    reportName: 'Incomplete',
    type: 0,
    uncertaintyMethod: 'MONTE_CARLO',
    reportAccountList: [{ productName: 1, accountName: 42 }],
  });
  let tab;
  options.setAnalysisTab = value => {
    tab = value;
  };
  await useReportSave(options).handleSave(false);
  assert.equal(f.calls.length, 0);
  assert.equal(tab, 'evaluation');
});

test('save guards duplicate submissions and preserves per-account sensitivity configuration', async () => {
  let resolve;
  const calls = [];
  const f = fixture({
    save: ({ report }) => {
      calls.push(report);
      return new Promise(done => {
        resolve = done;
      });
    },
  });
  const { useReportSave } = f.load(`${reportRoot}hooks/useReportSave.ts`);
  const options = saveOptions({
    reportName: 'Complete',
    type: 0,
    reportAccountList: [{ productName: 1, accountName: 42 }],
  });
  options.sensitivityConfigs = {
    42: { scope: 'activity-1', description: 'Scope fixture' },
  };
  const { handleSave } = useReportSave(options);
  const pending = handleSave(false);
  await handleSave(false);
  await new Promise(done => setImmediate(done));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].reportStatus, 1);
  assert.equal(calls[0].reportAccountList[0].sensitivityScope, 'activity-1');
  assert.equal(
    calls[0].reportAccountList[0].sensitivityDescription,
    'Scope fixture',
  );
  resolve({ data: { code: 200 } });
  await pending;
  assert.equal(
    options.form.current.values.reportAccountList[0].accountName,
    42,
  );
});
