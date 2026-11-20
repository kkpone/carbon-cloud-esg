// node --test scripts/test-competition-paper-error.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const friendly = '暂无可分配的标准赛题，请联系赛事运营补充题目后重试。';
function service(request) {
  const output = { exports: {} };
  const dependencies = {
    '@api/request': { request },
    '@src/lang/I18N': {
      default: {
        carbonCompetition: {
          failed: '请求失败',
          taskUi: { paperExhausted: friendly },
        },
      },
    },
    './visitor': {},
    './invitation': {},
  };
  vm.runInNewContext(
    ts.transpileModule(
      fs.readFileSync(
        path.join(
          __dirname,
          '../src/views/system/carbonCompetition/service.ts',
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
    {
      exports: output.exports,
      module: output,
      require: name => dependencies[name],
    },
  );
  return output.exports;
}
test('paper exhaustion is readable for interceptor rejection and Axios rejection', async () => {
  for (const error of [
    { data: { code: 500, msg: 'PAPER_EXHAUSTED' } },
    {
      data: { code: 500, msg: 'error', data: { errorKey: 'PAPER_EXHAUSTED' } },
    },
    { response: { data: { code: 500, msg: 'PAPER_EXHAUSTED' } } },
  ]) {
    await assert.rejects(
      service(async () => {
        throw error;
      }).assignCompetitionPaper('event', 'C_PRODUCT', {}),
      e => e.message === friendly,
    );
  }
});
test('business error returned normally is also translated', async () => {
  await assert.rejects(
    service(async () => ({
      data: { code: 500, msg: 'PAPER_EXHAUSTED' },
    })).assignCompetitionPaper('event', 'C_PRODUCT', {}),
    e => e.message === friendly,
  );
});
test('success and unrelated errors retain the original contract', async () => {
  const task = { assignmentId: 'assigned' };
  assert.equal(
    await service(async () => ({
      data: { code: 200, data: task },
    })).assignCompetitionPaper('event', 'C_PRODUCT', {}),
    task,
  );
  const original = { data: { code: 500, msg: 'VERSION_CONFLICT' } };
  await assert.rejects(
    service(async () => {
      throw original;
    }).assignCompetitionPaper('event', 'C_PRODUCT', {}),
    e => e === original,
  );
});
