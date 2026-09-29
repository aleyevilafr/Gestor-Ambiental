const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => deps[id] ?? require(id), mod, mod.exports);
  return mod.exports;
}
const { handleDialogEscape, requestDialogClose, trapDialogTab } = load('features/obligations/detail/obligation-dialog.utils.ts');

test('Escape in confirmation cancels only confirmation and stops propagation', () => {
  let cancelled = 0, prevented = 0, stopped = 0;
  const event = { key: 'Escape', preventDefault: () => prevented++, stopPropagation: () => stopped++ };
  assert.equal(handleDialogEscape(event, true, () => cancelled++, () => { throw Error('Must not close parent'); }), true);
  assert.deepEqual([cancelled, prevented, stopped], [1, 1, 1]);
});
test('Escape in main dialog uses guarded close; saving blocks it', () => {
  const event = { key: 'Escape', preventDefault() {}, stopPropagation() {} };
  let requested = 0;
  handleDialogEscape(event, false, () => { throw Error('No confirmation'); }, () => {
    requested++;
    requestDialogClose(true, true, () => { throw Error('No prompt while saving'); }, () => { throw Error('No close while saving'); });
  });
  assert.equal(requested, 1);
});
test('non-Escape key leaves focus traversal to active dialog', () => {
  assert.equal(handleDialogEscape({ key: 'Tab' }, true, () => { throw Error('Unexpected cancel'); }, () => { throw Error('Unexpected close'); }), false);
});

for (const source of ['X', 'Escape', 'overlay']) {
  test(`${source}: clean closes without confirmation`, () => {
    let closed = 0;
    requestDialogClose(false, false, () => { throw Error('Unexpected confirmation'); }, () => closed++);
    assert.equal(closed, 1);
  });
  test(`${source}: dirty requires confirmation; dismiss preserves dialog`, () => {
    let closed = 0, prompts = 0;
    requestDialogClose(false, true, () => { prompts++; return false; }, () => closed++);
    assert.equal(prompts, 1); assert.equal(closed, 0);
    requestDialogClose(false, true, () => true, () => closed++);
    assert.equal(closed, 1);
  });
  test(`${source}: saving blocks even a confirmed discard`, () => {
    requestDialogClose(true, true, () => { throw Error('Must not prompt'); }, () => { throw Error('Must not close'); });
  });
}

test('Tab and Shift+Tab wrap; fallback handles no enabled controls', t => {
  let focused, prevented = 0;
  const first = { tabIndex: 0, getClientRects: () => [1], focus: () => focused = first };
  const last = { tabIndex: 0, getClientRects: () => [1], focus: () => focused = last };
  const document = { activeElement: last };
  globalThis.document = document;
  globalThis.getComputedStyle = () => ({ visibility: 'visible' });
  t.after(() => { delete globalThis.document; delete globalThis.getComputedStyle; });
  const dialog = { querySelectorAll: () => [first, last], contains: node => [first, last].includes(node), focus: () => focused = dialog };
  const event = { key: 'Tab', shiftKey: false, preventDefault: () => prevented++ };
  trapDialogTab(event, dialog); assert.equal(focused, first);
  document.activeElement = first; event.shiftKey = true;
  trapDialogTab(event, dialog); assert.equal(focused, last);
  dialog.querySelectorAll = () => [];
  trapDialogTab(event, dialog); assert.equal(focused, dialog); assert.equal(prevented, 3);
});

// Minimal deterministic hook runtime: exercise the production hook and effects
// without adding a test renderer dependency. Browser validation covers real DOM.
function harness(save) {
  let slots = [], index = 0, effects = [], props, value;
  const react = {
    useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => slots[i] = typeof next === 'function' ? next(slots[i]) : next]; },
    useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; },
    useEffect(fn, deps) { const i = index++; if (!slots[i] || deps.some((v, n) => v !== slots[i][n])) { effects.push(fn); slots[i] = deps; } },
  };
  const module = load('features/obligations/detail/use-obligation-detail.ts', { react, '../save-obligation': { saveObligationChanges: save, reconciledMessage: 'partial', unverifiedMessage: 'unverified' } });
  const original = { id: 'a', title: 'Original', matter: 'REP', regulatory_source: 'Ley', compliance_status: 'PENDING', responsible_user_id: null };
  props = { obligation: original, canAssign: true, onSaveResult: result => { if (result.kind !== 'unverified') props.obligation = result.obligation; } };
  function render() { index = 0; value = module.useObligationDetail(props); const pending = effects; effects = []; pending.forEach(fn => fn()); return value; }
  return { render, props, original, module };
}
test('new draft clean; values normalized; Cancel resets only local fields', () => {
  const h = harness(() => { throw Error('Cancel must not call API'); });
  let v = h.render(); assert.equal(v.dirty, false);
  v.change('title', ' Original '); v = h.render(); assert.equal(v.dirty, false);
  v.change('title', 'Draft'); v = h.render(); assert.equal(v.dirty, true);
  v.reset(); v = h.render(); assert.equal(v.dirty, false); assert.equal(v.draft.title, 'Original');
});
test('save success cleans draft and synchronous lock prevents double submit', async () => {
  let resolve, calls = 0;
  const h = harness(() => { calls++; return new Promise(r => resolve = r); });
  h.render().change('title', 'Saved'); let v = h.render();
  const first = v.save(); await v.save(); assert.equal(calls, 1); assert.equal(v.isSaving(), true);
  resolve({ kind: 'saved', obligation: { ...h.original, title: 'Saved' } }); await first;
  h.render(); v = h.render(); assert.equal(v.dirty, false); assert.equal(v.saving, false); assert.equal(v.saved, true);
});
test('safe failed save preserves draft through parent reconciliation', async () => {
  const h = harness(async () => ({ kind: 'reconciled', obligation: { ...h.original } }));
  h.render().change('title', 'Keep my draft'); await h.render().save();
  h.render(); const v = h.render(); assert.equal(v.draft.title, 'Keep my draft'); assert.equal(v.dirty, true); assert.equal(v.error, 'partial'); assert.equal(v.saving, false);
});
test('partial persistence adopts actual server resource, keeping error visible', async () => {
  const h = harness(async () => ({ kind: 'reconciled', obligation: { ...h.original, title: 'Persisted' } }));
  h.render().change('title', 'Persisted'); h.render().change('compliance_status', 'COMPLIANT'); await h.render().save();
  h.render(); const v = h.render(); assert.equal(v.draft.compliance_status, 'PENDING'); assert.equal(v.dirty, false); assert.equal(v.error, 'partial');
});
test('RESPONSIBLE does not send reassignment', async () => {
  let fields;
  const h = harness(async (obligation, payload) => { fields = payload; return { kind: 'saved', obligation }; });
  h.props.canAssign = false; h.render().change('responsible_user_id', 'other'); await h.render().save();
  assert.equal('responsible_user_id' in fields, false);
});
