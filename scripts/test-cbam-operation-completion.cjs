// node --test scripts/test-cbam-operation-completion.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const moduleExports = {};
const source = ts.transpileModule(
  fs.readFileSync(
    path.join(__dirname, '../src/views/cbamOperationReport/completion.ts'),
    'utf8',
  ),
  {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
    },
  },
).outputText;
vm.runInNewContext(source, { exports: moduleExports });
const {
  calculateOperationCompletionPreview,
  getOperationProcessMissingFields,
} = moduleExports;
const process = { itemKey: 'process-a', sourceItemKey: 'source-a' };
const sections = [
  ['CBAM_PRODUCT', 'processData.cbamProductJson.reportItems'],
  ['PRECURSOR', 'processData.precursorJson.reportItems'],
  ['DIRECT_EMISSION', 'processData.directEmissionJson.items'],
  ['NON_CBAM_PRODUCT', 'processData.nonCbamProductJson.items'],
  ['ELECTRICITY_CONSUMPTION', 'processData.electricityJson.items'],
  ['HEAT_FLOW', 'processData.heatFlowJson.items'],
  ['WASTE_GAS', 'processData.wasteGasJson.items'],
];

for (const [sectionCode, rowPath] of sections) {
  test(`${sectionCode} 缺项计入所属工序，其他工序不受影响`, () => {
    const missing = `${rowPath}[0].quantity`;
    const groups = [
      { sectionCode, missingFields: [missing, `${rowPath}[1].quantity`] },
    ];
    const rows = [
      { processItemKey: 'source-a' },
      { processItemKey: 'process-b' },
    ];
    const result = getOperationProcessMissingFields(
      groups,
      process,
      'process-a',
      0,
      2,
      [{ path: rowPath, rows }],
    );
    assert.equal(result.length, 1);
    assert.equal(result[0], missing);
    assert.equal(
      getOperationProcessMissingFields(
        [{ sectionCode, missingFields: [] }],
        process,
        'process-a',
        0,
        2,
        [{ path: rowPath, rows }],
      ).length,
      0,
    );
  });
}

test('工序说明、路线生产数量与跨 tab 缺项合并统计，不匹配其他工序或索引前缀', () => {
  const groups = [
    {
      missingFields: [
        'processData.processJson.processes[0].description',
        'processData.processJson.processes[0].routes[0].productionQuantity',
        'processData.processJson.processes[1].description',
        'processData.precursorJson.reportItems[0].directEmission',
        'processData.precursorJson.reportItems[10].directEmission',
        'processData.electricityJson.items[0].emissionFactor',
      ],
    },
  ];
  const rows = [
    {
      path: 'processData.precursorJson.reportItems',
      rows: [{ processItemKey: 'process-a' }],
    },
    {
      path: 'processData.electricityJson.items',
      rows: [{ processItemKey: 'process-a' }],
    },
  ];
  assert.equal(
    getOperationProcessMissingFields(groups, process, 'process-a', 0, 2, rows)
      .length,
    4,
  );
});

test('无工序关联的旧记录仅在单工序时计入，不适用分组不产生缺项', () => {
  const groups = [
    { missingFields: ['processData.heatFlowJson.items[0].heatAmount'] },
  ];
  const rows = [{ path: 'processData.heatFlowJson.items', rows: [{}] }];
  assert.equal(
    getOperationProcessMissingFields(groups, process, 'process-a', 0, 1, rows)
      .length,
    1,
  );
  assert.equal(
    getOperationProcessMissingFields(groups, process, 'process-a', 0, 2, rows)
      .length,
    0,
  );
  assert.equal(
    getOperationProcessMissingFields(
      [{ missingFields: [] }],
      process,
      'process-a',
      0,
      1,
      rows,
    ).length,
    0,
  );
});

test('默认值前体按排放值判断完整度，默认记录关联不影响必填', () => {
  const item = {
    emissionBasis: 'DEFAULT_VALUE',
    directEmission: '0',
    indirectEmission: '2',
    monitorStartDate: '2026-01-01',
    monitorEndDate: '2026-12-31',
    routeQuantities: [{ quantity: '1' }],
  };
  const payload = { processData: { precursorJson: { reportItems: [item] } } };
  const group = () =>
    calculateOperationCompletionPreview(payload).find(
      value => value.sectionCode === 'PRECURSOR',
    );
  assert.equal(group().completed, true);
  assert.equal(group().requiredCount, 5);
  assert.equal(group().missingFields.length, 0);
  item.defaultCnId = 7;
  assert.equal(group().completed, true);
  item.directEmission = ' ';
  assert.equal(group().missingFields.length, 1);
  assert.equal(
    group().missingFields[0],
    'processData.precursorJson.reportItems[0].directEmission',
  );
  item.directEmission = '0';
  item.indirectEmission = null;
  assert.equal(group().missingFields.length, 1);
  assert.equal(
    group().missingFields[0],
    'processData.precursorJson.reportItems[0].indirectEmission',
  );
  item.indirectEmission = '0';
  delete item.defaultCnId;
  assert.equal(group().completed, true);
  item.emissionBasis = 'MEASURED_VALUE';
  assert.equal(group().completed, true);
});
