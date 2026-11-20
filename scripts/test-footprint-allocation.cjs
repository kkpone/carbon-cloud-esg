const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync('src/components/FootprintAllocation/calculation.ts', 'utf8');
const code = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText;
const fixtureModule = { exports: {} };
vm.runInThisContext(`(function(require,module,exports){${code}\n})`)(require, fixtureModule, fixtureModule.exports);
const { allocationPercentage, isAllocationValid, unitAmount } = fixtureModule.exports;

test('allocation uses rounded percentage and preserves decimal precision', () => {
  const config = { enabled: true, totalAmount: '3', currentAmount: '1', unitCode: 'kg' };
  assert.equal(allocationPercentage(config), '33.33');
  assert.equal(isAllocationValid(config), true);
  assert.equal(unitAmount('3', config, '10'), '1.111000000');
  assert.equal(unitAmount('0.000000001', undefined, '0'), '0.000000001');
});

test('invalid quantities, units and loss are rejected', () => {
  assert.equal(allocationPercentage({ enabled: true, totalAmount: '0', currentAmount: '1' }), '');
  assert.equal(isAllocationValid({ enabled: true, totalAmount: '3', currentAmount: '1' }), false);
  assert.equal(unitAmount('1', undefined, '100'), '');
});
