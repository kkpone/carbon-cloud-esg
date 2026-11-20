// node --test scripts/test-competition-tasks.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const target = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(
    fs.readFileSync(
      path.join(
        __dirname,
        '../src/views/system/carbonCompetition/components/CompetitionTasks/taskAccess.ts',
      ),
      'utf8',
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2020,
      },
    },
  ).outputText,
  { exports: target.exports, module: target },
);
const { canSubmitModule, phaseStatus } = target.exports;
const allowed = participant =>
  ['C', 'R', 'E', 'O', 'S'].filter(code =>
    canSubmitModule({ participant }, code),
  );
test('personal entrants and enterprise members submit only C/E; captains submit all five', () => {
  assert.deepEqual(
    allowed({ status: 'REGISTERED', track: 'INDIVIDUAL', role: 'INDIVIDUAL' }),
    ['C', 'E'],
  );
  assert.deepEqual(
    allowed({ status: 'REGISTERED', track: 'ENTERPRISE', role: 'MEMBER' }),
    ['C', 'E'],
  );
  assert.deepEqual(
    allowed({ status: 'REGISTERED', track: 'ENTERPRISE', role: 'CAPTAIN' }),
    ['C', 'R', 'E', 'O', 'S'],
  );
});
test('unregistered or ineligible participants cannot submit', () => {
  for (const status of ['PROFILE', 'PENDING_REGISTER', 'REMOVED']) {
    assert.deepEqual(
      allowed({ status, track: 'ENTERPRISE', role: 'CAPTAIN' }),
      [],
    );
  }
  assert.deepEqual(
    allowed({
      status: 'REGISTERED',
      eligible: false,
      track: 'ENTERPRISE',
      role: 'CAPTAIN',
    }),
    [],
  );
  assert.equal(canSubmitModule(undefined, 'C'), false);
});
test('Boss phase settings use inclusive start and exclusive deadline, and require confirmation', () => {
  const start = Date.parse('2026-11-11T00:00:00Z');
  const end = Date.parse('2026-11-12T00:00:00Z');
  const phase = {
    enabled: true,
    confirmed: true,
    opensAt: new Date(start).toISOString(),
    closesAt: new Date(end).toISOString(),
  };
  assert.equal(phaseStatus(phase, start - 1), 'NOT_OPEN');
  assert.equal(phaseStatus(phase, start), 'OPEN');
  assert.equal(phaseStatus(phase, end - 1), 'OPEN');
  assert.equal(phaseStatus(phase, end), 'CLOSED');
  assert.equal(phaseStatus({ ...phase, enabled: false }, start), 'NOT_OPEN');
  assert.equal(phaseStatus({ ...phase, confirmed: false }, start), 'NOT_OPEN');
  assert.equal(phaseStatus(undefined, start), 'NOT_OPEN');
});
