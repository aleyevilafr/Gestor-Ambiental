const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { renderToStaticMarkup } = require('react-dom/server');
const { createElement } = require('react');

function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => deps[id] ?? require(id), mod, mod.exports);
  return mod.exports;
}
function runtime() {
  let slots = [], index = 0, pending = [];
  return {
    react: {
      useState(initial) { const i = index++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], next => slots[i] = typeof next === 'function' ? next(slots[i]) : next]; },
      useRef(initial) { const i = index++; return slots[i] ??= { current: initial }; },
      useCallback(fn, deps) { const i = index++; if (!slots[i] || deps.some((v,n) => v !== slots[i].deps[n])) slots[i] = { fn, deps }; return slots[i].fn; },
      useEffect(fn, deps) { const i = index++; if (!slots[i] || deps.some((v,n) => v !== slots[i][n])) { slots[i] = deps; pending.push(fn); } },
    },
    render(fn) { index = 0; const value = fn(); const effects = pending; pending = []; effects.forEach(fn => fn()); return value; },
  };
}
class ApiError extends Error { constructor(status) { super('Internal detail'); this.status = status; } }
const baseApi = { ApiError, getEvidences: async () => [], createEvidence: async () => ({}) };
const modulePath = 'features/obligations/detail/use-obligation-evidences.ts';
const utils = load(modulePath, { '@/lib/api': baseApi });
const draft = { name: ' Registro ', description: '', external_url: 'https://example.com/registro', control_id: '' };
const control = { id: 'c', obligation_id: 'o', title: 'Revisión mensual' };
const evidence = { id: 'e', obligation_id: 'o', name: 'Resolución vigente', description: null, control_id: null, evidence_type: 'EXTERNAL_LINK', external_url: draft.external_url, file_url: null, created_at: '2026-09-29T12:00:00Z', uploaded_by_user: { name: 'Ana' } };
function hook(api = {}) {
  const rt = runtime();
  const { useObligationEvidences } = load(modulePath, { react: rt.react, '@/lib/api': { ...baseApi, ...api } });
  return () => rt.render(() => useObligationEvidences('o'));
}

test('general EXTERNAL_LINK payload uses supported fields only', () => {
  assert.deepEqual(utils.evidencePayload(draft, []), { name: 'Registro', description: null, external_url: draft.external_url, control_id: null, evidence_type: 'EXTERNAL_LINK' });
});
test('selector accepts only controls provided by this obligation', () => {
  assert.equal(utils.evidencePayload({ ...draft, control_id: 'c' }, [control]).control_id, 'c');
  assert.throws(() => utils.evidencePayload({ ...draft, control_id: 'other' }, [control]), /control disponible/);
});
test('reject blank names and unsafe URL schemes; safe existing FILE URL remains readable', () => {
  assert.throws(() => utils.evidencePayload({ ...draft, name: '  ' }, []));
  assert.throws(() => utils.evidencePayload({ ...draft, external_url: 'javascript:alert(1)' }, []));
  assert.equal(utils.safeEvidenceUrl('javascript:alert(1)'), null);
  assert.equal(utils.safeEvidenceUrl('https://example.com/file.pdf'), 'https://example.com/file.pdf');
});
test('load existing evidences and empty list without conflating states', async () => {
  const render = hook({ getEvidences: async () => [evidence] });
  assert.equal(render().loading, true);
  await render().load();
  assert.deepEqual(render().items, [evidence]); assert.equal(render().loading, false);
  const empty = hook(); await empty().load(); assert.deepEqual(empty().items, []); assert.equal(empty().loadError, '');
});
test('load error is distinct from an empty successful response', async () => {
  const render = hook({ getEvidences: async () => { throw Error('offline'); } });
  await render().load(); assert.match(render().loadError, /Reintenta/); assert.equal(render().loading, false);
});
test('creation waits for POST then GET and uses refreshed authoritative list', async () => {
  const calls = []; let stored = [];
  const render = hook({ getEvidences: async () => { calls.push('GET'); return stored; }, createEvidence: async (id, payload) => { calls.push('POST'); assert.equal(id, 'o'); assert.equal(payload.evidence_type, 'EXTERNAL_LINK'); stored = [evidence]; return evidence; } });
  render(); await Promise.resolve(); calls.length = 0;
  assert.equal(await render().create(draft, []), true);
  assert.deepEqual(calls, ['POST', 'GET']); assert.deepEqual(render().items, [evidence]); assert.match(render().success, /registrada/);
});
test('confirmed creation with failed refresh stays successful: no duplicate POST', async () => {
  let posts = 0;
  const render = hook({ createEvidence: async () => { posts++; return evidence; }, getEvidences: async () => { throw Error('offline'); } });
  assert.equal(await render().create(draft, []), true);
  await render().load(); assert.equal(posts, 1); assert.match(render().success, /registrada/); assert.ok(render().loadError); assert.equal(render().error, '');
});
test('creation rejection does not insert fictitious record', async () => {
  const render = hook({ createEvidence: async () => { throw new ApiError(422); } });
  assert.equal(await render().create(draft, []), false); assert.deepEqual(render().items, []); assert.match(render().error, /datos y tus permisos/); assert.equal(render().submitting, false);
});
test('uncertain network outcome warns and refetches persisted records', async () => {
  const render = hook({ createEvidence: async () => { throw Error('response lost'); }, getEvidences: async () => [evidence] });
  assert.equal(await render().create(draft, []), false); assert.match(render().error, /evitar duplicados/); assert.deepEqual(render().items, [evidence]);
});
test('synchronous submit lock prevents duplicate POST', async () => {
  let finish, count = 0;
  const render = hook({ createEvidence: () => { count++; return new Promise(resolve => finish = resolve); } });
  const first = render().create(draft, []); assert.equal(render().submitting, true);
  assert.equal(await render().create(draft, []), false); assert.equal(count, 1);
  finish(evidence); await first; assert.equal(render().submitting, false);
});

function component(editable = true, overrides = {}) {
  const rt = runtime(); const activity = []; const data = { items: [], loading: false, loadError: '', error: '', success: '', submitting: false, load: async () => true, create: async () => true, ...overrides };
  const { ObligationDetailEvidences, EvidenceList } = load('features/obligations/detail/obligation-detail-evidences.tsx', {
    react: rt.react,
    './use-obligation-evidences': { ...utils, useObligationEvidences: () => data },
    './obligation-modal-activity': { useModalActivity: (...args) => activity.push(args) },
  });
  return { data, activity, EvidenceList, render: () => rt.render(() => ObligationDetailEvidences({ obligationId: 'o', editable, controls: [control], controlsUnavailable: false, reloadControls: async () => {} })) };
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined;
  if (predicate(node)) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const result = find(child, predicate); if (result) return result; }
}
test('render list groups general and control evidence; FILE is reference, not upload', () => {
  const c = component();
  const html = renderToStaticMarkup(createElement(c.EvidenceList, { items: [evidence, { ...evidence, id: 'f', control_id: 'c', evidence_type: 'FILE', file_url: 'https://example.com/file.pdf' }], controls: [control] }));
  for (const label of ['Generales', 'Evidencia general', 'Asociadas a controles', 'Revisión mensual', 'FILE', 'EXTERNAL_LINK', 'Ana']) assert.ok(html.includes(label), label);
});
test('empty state and READER has no creation action', () => {
  const c = component(false); const html = renderToStaticMarkup(c.render());
  assert.ok(html.includes('No hay evidencias registradas para esta obligación.')); assert.equal(html.includes('Registrar evidencia'), false); assert.equal(html.includes('<form'), false);
});
test('opening form exposes optional control and labels without new dialog', () => {
  const c = component();
  find(c.render(), node => node.type === 'button' && node.props.children === 'Registrar evidencia').props.onClick();
  const html = renderToStaticMarkup(c.render());
  for (const value of ['<form', 'Evidencia general de la obligación', 'Revisión mensual', 'Guardar evidencia', 'Enlace externo']) assert.ok(html.includes(value), value);
  assert.equal(html.includes('type="file"'), false); assert.equal(html.includes('role="dialog"'), false);
});
test('form retains draft on rejection and clears only after confirmed create', async () => {
  let ok = false, captured;
  const c = component(true, { create: async value => { captured = value; return ok; } });
  find(c.render(), node => node.type === 'button' && node.props.children === 'Registrar evidencia').props.onClick();
  find(c.render(), node => node.type === 'input' && node.props.maxLength === 255).props.onChange({ target: { value: 'My evidence' } });
  await find(c.render(), node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(captured.name, 'My evidence'); assert.equal(find(c.render(), node => node.type === 'input' && node.props.maxLength === 255).props.value, 'My evidence');
  ok = true; await find(c.render(), node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  assert.equal(find(c.render(), node => node.type === 'form'), undefined);
});
test('independent evidence save reports busy, never obligation dirty', () => {
  const c = component(true, { submitting: true }); c.render();
  assert.deepEqual(c.activity.at(-1), ['evidence:register', false, true]);
});
