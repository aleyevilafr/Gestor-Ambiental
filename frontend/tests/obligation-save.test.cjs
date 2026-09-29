const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Compile the production modules in memory; no test framework or network needed.
function load(relative, dependencies = {}) {
  const filename = path.join(__dirname, '..', relative);
  const js = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', js)((id) => dependencies[id] ?? require(id), module, module.exports);
  return module.exports;
}
const api = load('lib/api.ts');
const { saveObligationChanges, reconcileObligation } = load('features/obligations/save-obligation.ts', { '@/lib/api': api });
const original = {
  id: 'obligation-a', title: 'Original', compliance_status: 'PENDING',
  description: null, matter: 'REP', regulatory_source: 'Ley de prueba', article: null,
  deadline: null, frequency: null, responsible_user_id: 'responsible-a',
  responsible_user: { id: 'responsible-a', name: 'Ana', email: 'ana@example.com' },
  created_by_user_id: 'admin-a', is_active: true,
  created_at: '2026-09-01T12:00:00Z', updated_at: '2026-09-01T12:00:00Z',
};
function fakeHttp(t, responses) {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ path: new URL(url).pathname, method: options.method ?? 'GET', body: options.body && JSON.parse(options.body), credentials: options.credentials });
    assert.ok(responses.length, 'Unexpected additional request');
    const response = responses.shift();
    if (response instanceof Error) throw response;
    return new Response(JSON.stringify(response.body), { status: response.status ?? 200 });
  });
  return calls;
}
test('title only: general PATCH and complete backend response', async t => {
  const stored = { ...original, title: 'Updated', updated_at: '2026-09-16T10:00:00Z' };
  const calls = fakeHttp(t, [{ body: stored }]);
  const result = await saveObligationChanges(original, { title: 'Updated' }, 'PENDING');
  assert.deepEqual(result, { kind: 'saved', id: original.id, obligation: stored });
  assert.equal(calls.length, 1); assert.equal(calls[0].path, '/api/v1/obligations/obligation-a');
  assert.equal(calls[0].credentials, 'include'); assert.deepEqual(calls[0].body, { title: 'Updated' });
});
test('status only: no general PATCH', async t => {
  const stored = { ...original, compliance_status: 'COMPLIANT' };
  const calls = fakeHttp(t, [{ body: stored }]);
  assert.deepEqual((await saveObligationChanges(original, {}, 'COMPLIANT')).obligation, stored);
  assert.equal(calls.length, 1); assert.ok(calls[0].path.endsWith('/status'));
  assert.deepEqual(calls[0].body, { compliance_status: 'COMPLIANT' });
});
test('title + status: ordered PATCHes, authoritative final object', async t => {
  const fields = { ...original, title: 'Updated' };
  const final = { ...fields, compliance_status: 'COMPLIANT' };
  const calls = fakeHttp(t, [{ body: fields }, { body: final }]);
  assert.deepEqual((await saveObligationChanges(original, { title: 'Updated' }, 'COMPLIANT')).obligation, final);
  assert.deepEqual(calls.map(c => c.method), ['PATCH', 'PATCH']);
  assert.ok(calls[1].path.endsWith('/status'));
});
test('general PATCH rejected: stops writes and reads persisted data', async t => {
  const calls = fakeHttp(t, [{ status: 422, body: { detail: 'Internal validation details' } }, { body: original }]);
  const result = await saveObligationChanges(original, { title: 'Invalid' }, 'COMPLIANT');
  assert.deepEqual(result, { kind: 'reconciled', id: original.id, obligation: original });
  assert.deepEqual(calls.map(c => c.method), ['PATCH', 'GET']);
});
test('second PATCH fails: recovers changed title and actual previous status, no rollback', async t => {
  const stored = { ...original, title: 'Persisted title' };
  const calls = fakeHttp(t, [{ body: stored }, { status: 500, body: { detail: 'Secret stack trace' } }, { body: stored }]);
  const result = await saveObligationChanges(original, { title: stored.title }, 'COMPLIANT');
  assert.deepEqual(result, { kind: 'reconciled', id: original.id, obligation: stored });
  assert.deepEqual(calls.map(c => c.method), ['PATCH', 'PATCH', 'GET']);
  assert.equal(JSON.stringify(result).includes('Secret'), false);
});
test('first response lost after commit: GET discovers persistence', async t => {
  const stored = { ...original, title: 'Persisted despite network error' };
  const calls = fakeHttp(t, [new TypeError('Failed to fetch'), { body: stored }]);
  assert.deepEqual((await saveObligationChanges(original, { title: stored.title }, 'COMPLIANT')).obligation, stored);
  assert.deepEqual(calls.map(c => c.method), ['PATCH', 'GET']);
});
test('status response lost after commit: GET discovers both changes', async t => {
  const fields = { ...original, title: 'Updated' };
  const stored = { ...fields, compliance_status: 'COMPLIANT' };
  fakeHttp(t, [{ body: fields }, new TypeError('Failed to fetch'), { body: stored }]);
  const result = await saveObligationChanges(original, { title: fields.title }, 'COMPLIANT');
  assert.equal(result.kind, 'reconciled'); assert.deepEqual(result.obligation, stored);
});
test('GET also fails: no old/optimistic object represented as confirmed', async t => {
  fakeHttp(t, [{ body: { ...original, title: 'Persisted' } }, new Error('offline'), new Error('offline')]);
  assert.deepEqual(await saveObligationChanges(original, { title: 'Persisted' }, 'COMPLIANT'), { kind: 'unverified', id: original.id });
});
test('retry verification performs GET only', async t => {
  const stored = { ...original, title: 'Actual title' };
  const calls = fakeHttp(t, [{ body: stored }]);
  assert.deepEqual((await reconcileObligation(original.id)).obligation, stored);
  assert.deepEqual(calls.map(c => c.method), ['GET']);
});
test('403 mutation response is not retried or bypassed', async t => {
  const calls = fakeHttp(t, [{ status: 403, body: { detail: 'Forbidden' } }, { body: original }]);
  assert.equal((await saveObligationChanges(original, { title: 'Forbidden change' }, 'COMPLIANT')).kind, 'reconciled');
  assert.deepEqual(calls.map(c => c.method), ['PATCH', 'GET']);
});
test('loss of access to GET leaves result unverified', async t => {
  fakeHttp(t, [{ status: 403, body: {} }, { status: 403, body: {} }]);
  assert.equal((await saveObligationChanges(original, { title: 'Forbidden' }, 'COMPLIANT')).kind, 'unverified');
});
test('no changes: no requests', async t => {
  const calls = fakeHttp(t, []);
  assert.deepEqual((await saveObligationChanges(original, {}, 'PENDING')).obligation, original);
  assert.equal(calls.length, 0);
});
