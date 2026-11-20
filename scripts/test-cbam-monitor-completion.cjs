// node --test scripts/test-cbam-monitor-completion.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

const moduleExports = {};
const source = ts.transpileModule(
  fs.readFileSync(path.join(__dirname, '../src/views/cbamMonitor/completion.ts'), 'utf8'),
  { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } },
).outputText;
vm.runInNewContext(source, { exports: moduleExports });
const { calculateCompletionPreview, calculateNavPendingCounts } = moduleExports;

/** 构造其余必填字段完整的控制程序，编号由各场景单独设置。 */
function procedure(procedureType) {
  return { procedureType, title: '程序', positionOrDepartment: '组长', frequency: 'SHIFT', recordLocation: '磁盘' };
}

/** 复现请求中的三个管理程序、一个数据流程序及八个控制活动。 */
function control() {
  return {
    divideWorkJson: { responsibilities: [{ positionName: '组长' }] },
    manageEvaluateJson: { procedures: [
      procedure('RESPONSIBILITY_ASSIGNMENT'),
      procedure('PLAN_REGULAR_EVALUATION'),
      procedure('IMPROVEMENT_REPORT_DEADLINE'),
    ] },
    dataFlowJson: { procedures: [procedure('DATA_FLOW')] },
    controlActivityJson: { procedures: [
      procedure('RISK_ASSESSMENT'), procedure('MEASUREMENT_QUALITY_ASSURANCE'),
      procedure('IT_QUALITY_ASSURANCE'), procedure('INTERNAL_REVIEW'),
      procedure('CORRECTIVE_ACTION'), procedure('OUTSOURCED_PROCESS'),
      procedure('DATA_GAP'), procedure('RECORD_KEEPING'),
    ] },
    otherProcedureJson: { procedures: [procedure()] },
  };
}

/** 仅取本次修复涉及的控制与确认完整度。 */
function quality(value) {
  return calculateCompletionPreview({ controlConfirmation: value })
    .find(group => group.sectionCode === 'DATA_QUALITY_CONTROL');
}

test('管理、数据流及八类控制活动编号均未填写时计十二项缺失', () => {
  const value = control();
  const groups = calculateCompletionPreview({ controlConfirmation: value });
  const result = quality(value);
  assert.equal(result.completed, false);
  assert.equal(result.requiredCount - result.filledRequiredCount, 12);
  assert.equal(calculateNavPendingCounts(groups).control, 1);
  assert.equal(groups.length, 22);
});

test('各组程序编号逐项填写，全部有效后才完成；空白编号仍未完成', () => {
  const value = control();
  const procedures = [...value.manageEvaluateJson.procedures, ...value.dataFlowJson.procedures, ...value.controlActivityJson.procedures];
  procedures.forEach((item, index) => {
    item.referenceNo = `REF-${index + 1}`;
    assert.equal(quality(value).completed, index === procedures.length - 1);
  });
  value.dataFlowJson.procedures[0].referenceNo = '  ';
  assert.equal(quality(value).completed, false);
});

test('控制活动要求编号，补充程序编号选填，外包关闭后忽略其未填字段', () => {
  const value = control();
  [...value.manageEvaluateJson.procedures, ...value.dataFlowJson.procedures, ...value.controlActivityJson.procedures]
    .forEach(item => { item.referenceNo = 'REF'; });
  const outsourced = value.controlActivityJson.procedures.find(item => item.procedureType === 'OUTSOURCED_PROCESS');
  delete outsourced.positionOrDepartment;
  assert.equal(quality(value).completed, true);
  delete outsourced.referenceNo;
  assert.equal(quality(value).completed, false);
  outsourced.enabled = false;
  delete outsourced.title;
  delete outsourced.frequency;
  delete outsourced.recordLocation;
  assert.equal(quality(value).completed, true);
  outsourced.enabled = true;
  assert.equal(quality(value).completed, false);
  Object.assign(outsourced, procedure('OUTSOURCED_PROCESS'), { referenceNo: 'OUT-REF' });
  assert.equal(quality(value).completed, true);
  delete value.controlActivityJson.procedures[0].positionOrDepartment;
  assert.equal(quality(value).completed, false);
});


// 计量、分配方法分别计入必填项，历史合并字段不能抵扣缺项。
test('设施内发电完整度仅按两个新方法字段分别计算', () => {
  const cases = [
    { meteringMethod: undefined, allocationMethod: undefined, filled: 4 },
    { meteringMethod: 'DIRECT_METER', allocationMethod: undefined, filled: 5 },
    { meteringMethod: undefined, allocationMethod: 'DIRECT_ATTRIBUTION', filled: 5 },
    { meteringMethod: 'DIRECT_METER', allocationMethod: '  ', filled: 5 },
    { meteringMethod: '  ', allocationMethod: 'DIRECT_ATTRIBUTION', filled: 5 },
    { meteringMethod: 'DIRECT_METER', allocationMethod: 'DIRECT_ATTRIBUTION', filled: 6 },
  ];
  cases.forEach(({ meteringMethod, allocationMethod, filled }) => {
    const payload = { condition: { facilityElectricityJson: { applicable: true, generators: [{
      generationMode: 'SOLAR', energyProperty: 'RENEWABLE', includedInOutputBoundary: false,
      processItemKey: 'process', meteringAllocationMethod: '旧合并方法', meteringMethod, allocationMethod,
    }] } } };
    const result = calculateCompletionPreview(payload).find(group => group.sectionCode === 'FACILITY_ELECTRICITY');
    assert.equal(result.requiredCount, 6);
    assert.equal(result.filledRequiredCount, filled);
    assert.equal(result.completed, filled === 6);
    delete payload.condition.facilityElectricityJson.generators[0].meteringAllocationMethod;
    assert.deepEqual(calculateCompletionPreview(payload).find(group => group.sectionCode === 'FACILITY_ELECTRICITY'), result);
  });
});

// 表单修改后重新计算，应同步更新条件配置的待完善分组数；不适用仍自动完成。
test('清空任一发电方法后实时恢复待完善状态，不适用时保持完成', () => {
  const generator = {
    generationMode: 'SOLAR', energyProperty: 'RENEWABLE', includedInOutputBoundary: true,
    processItemKey: 'process', meteringMethod: 'DIRECT_METER', allocationMethod: 'DIRECT_ATTRIBUTION',
  };
  const electricity = { applicable: true, generators: [generator] };
  const payload = { condition: { facilityElectricityJson: electricity } };
  const completeGroups = calculateCompletionPreview(payload);
  const before = calculateNavPendingCounts(completeGroups).condition;
  assert.equal(completeGroups.find(group => group.sectionCode === 'FACILITY_ELECTRICITY').completed, true);
  for (const field of ['meteringMethod', 'allocationMethod']) {
    const original = generator[field];
    generator[field] = '';
    const groups = calculateCompletionPreview(payload);
    assert.equal(groups.find(group => group.sectionCode === 'FACILITY_ELECTRICITY').completed, false);
    assert.equal(calculateNavPendingCounts(groups).condition, before + 1);
    generator[field] = original;
  }
  electricity.applicable = false;
  electricity.generators = [];
  const groups = calculateCompletionPreview(payload);
  assert.equal(groups.find(group => group.sectionCode === 'FACILITY_ELECTRICITY').completed, true);
  assert.equal(calculateNavPendingCounts(groups).condition, before);
});
