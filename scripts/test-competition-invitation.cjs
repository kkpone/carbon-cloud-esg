// node --test scripts/test-competition-invitation.cjs
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const ts = require('typescript');

function client() {
  const values = new Map();
  const state = { companyUserInfo: { userInfo: {}, access_token: '' } };
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key),
  };
  const requests = [];
  const visitors = [];
  const modules = {
    '@src/store': { default: { getState: () => state } },
    '@/utils/cookie': { getToken: () => state.companyUserInfo.access_token },
    '@src/lang/I18N': { default: { carbonCompetition: { failed: 'failed' } } },
    './visitor': {
      invitationVisitor: async scope => {
        visitors.push(scope);
        return scope;
      },
    },
    '@api/request': {
      request: options =>
        new Promise(resolve => requests.push({ options, resolve })),
    },
  };
  const load = file => {
    const module = { exports: {} };
    vm.runInNewContext(
      ts.transpileModule(
        fs.readFileSync(
          path.join(__dirname, '../src/views/system/carbonCompetition', file),
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
        exports: module.exports,
        module,
        require: name => {
          assert.ok(modules[name], name);
          return modules[name];
        },
        localStorage,
        crypto: webcrypto,
        URLSearchParams,
      },
    );
    return module.exports;
  };
  const invitation = load('invitation.ts');
  modules['./invitation'] = invitation;
  const service = load('service.ts');
  const login = id => {
    state.companyUserInfo.userInfo = id ? { userId: id } : {};
    state.companyUserInfo.access_token = id ? `session-${id}` : '';
  };
  const finish = async (promise, receipt) => {
    await new Promise(resolve => setImmediate(resolve));
    const request = requests.shift();
    request.resolve({
      data: { code: 200, data: { firstTouchReceipt: receipt } },
    });
    await promise;
    return request.options;
  };
  return { ...invitation, ...service, login, finish, visitors, values };
}

test('account A -> B -> A keeps separate receipt and visitor namespaces', async () => {
  const c = client();
  c.login('A');
  await c.finish(c.openInvitation('event', 'first'), 'receipt-A');
  c.login('B');
  assert.equal(c.mutation('event').firstTouchReceipt, '');
  const request = await c.finish(
    c.openInvitation('event', 'second'),
    'receipt-B',
  );
  assert.equal(request.headers['X-Competition-Receipt'], undefined);
  assert.notEqual(c.visitors[0], c.visitors[1]);
  assert.equal(c.mutation('event').firstTouchReceipt, 'receipt-B');
  c.login('A');
  assert.equal(c.mutation('event').firstTouchReceipt, 'receipt-A');
  assert.equal(c.mutation('another-event').firstTouchReceipt, '');
});

test('anonymous first receipt crosses login once; switching account cannot claim it again', async () => {
  const c = client();
  await c.finish(c.openInvitation('event', 'first'), 'guest-first');
  c.login('A');
  assert.equal(c.restoreInvitation('event')[0], 'guest-first');
  c.finishInvitationRestore(
    'event',
    c.invitationOwner('event'),
    'guest-first',
    true,
  );
  assert.equal(c.mutation('event').firstTouchReceipt, 'guest-first');
  const request = await c.finish(
    c.openInvitation('event', 'later'),
    'guest-first',
  );
  assert.equal(request.headers['X-Competition-Receipt'], 'guest-first');
  c.login('B');
  c.restoreInvitation('event');
  assert.equal(c.mutation('event').firstTouchReceipt, '');
  c.login(null);
  assert.equal(c.mutation('event').firstTouchReceipt, '');
});

test('account switch discards an in-flight response instead of contaminating either account', async () => {
  const c = client();
  c.login('A');
  const pending = c.openInvitation('event', 'first');
  c.login('B');
  await c.finish(pending, 'late-A');
  assert.equal(c.mutation('event').firstTouchReceipt, '');
  c.login('A');
  assert.equal(c.mutation('event').firstTouchReceipt, '');
});

test('existing account receipt survives a later anonymous invitation and another event is preserved', async () => {
  const c = client();
  c.login('A');
  await c.finish(c.openInvitation('event', 'first'), 'original-A');
  c.login(null);
  await c.finish(c.openInvitation('event', 'later'), 'later-guest');
  await c.finish(c.openInvitation('other', 'first'), 'other-guest');
  c.login('A');
  assert.equal(c.restoreInvitation('event')[0], 'later-guest');
  c.finishInvitationRestore(
    'event',
    c.invitationOwner('event'),
    'later-guest',
    true,
  );
  assert.equal(c.mutation('event').firstTouchReceipt, 'original-A');
  assert.equal(c.restoreInvitation('other')[0], 'other-guest');
  c.finishInvitationRestore(
    'other',
    c.invitationOwner('other'),
    'other-guest',
    true,
  );
  assert.equal(c.mutation('other').firstTouchReceipt, 'other-guest');
});

test('legacy shared storage is not sent automatically; invalid cleanup does not remove a newer receipt', async () => {
  const c = client();
  c.values.set('competition-receipt:event', 'legacy-foreign');
  c.login('B');
  assert.equal(c.mutation('event').firstTouchReceipt, '');
  await c.finish(c.openInvitation('event', 'first'), 'fresh-B');
  const owner = c.invitationOwner('event');
  c.clearInvitationReceipt('event', owner, 'obsolete-B');
  assert.equal(c.mutation('event').firstTouchReceipt, 'fresh-B');
  c.clearInvitationReceipt('event', owner, 'fresh-B');
  assert.equal(c.mutation('event').firstTouchReceipt, '');
});

test('anonymous handoff survives network failure and is retried only by its receiving account', async () => {
  const c = client();
  await c.finish(c.openInvitation('event', 'first'), 'pending-guest');
  c.login('A');
  assert.equal(c.restoreInvitation('event')[0], 'pending-guest');
  c.login('B');
  assert.equal(c.restoreInvitation('event').length, 0);
  c.login('A');
  assert.equal(c.restoreInvitation('event')[0], 'pending-guest');
  c.finishInvitationRestore(
    'event',
    c.invitationOwner('event'),
    'pending-guest',
    true,
  );
  assert.equal(c.restoreInvitation('event').length, 0);
  assert.equal(c.mutation('event').firstTouchReceipt, 'pending-guest');
});

test('legacy candidate is validated once and cannot overwrite an account receipt', async () => {
  const c = client();
  c.values.set('competition-receipt:event', 'legacy-foreign');
  c.login('B');
  assert.equal(c.restoreInvitation('event')[0], 'legacy-foreign');
  assert.equal(c.mutation('event').firstTouchReceipt, '');
  c.finishInvitationRestore(
    'event',
    c.invitationOwner('event'),
    'legacy-foreign',
    false,
  );
  assert.equal(c.restoreInvitation('event').length, 0);
  assert.equal(c.mutation('event').firstTouchReceipt, '');
  c.values.set('competition-receipt:event', 'legacy-valid');
  assert.equal(c.restoreInvitation('event')[0], 'legacy-valid');
  c.finishInvitationRestore(
    'event',
    c.invitationOwner('event'),
    'legacy-valid',
    true,
  );
  assert.equal(c.mutation('event').firstTouchReceipt, 'legacy-valid');
});
