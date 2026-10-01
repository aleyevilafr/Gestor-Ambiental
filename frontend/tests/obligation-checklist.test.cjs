const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function source(file) { return fs.readFileSync(path.join(__dirname, '..', file), 'utf8'); }
function load(file, deps = {}) {
  const code = ts.transpileModule(source(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', code)(id => deps[id] ?? require(id), mod, mod.exports);
  return mod.exports;
}
const dataFile = 'features/obligations/checklist/checklist-data.ts';
const data = load(dataFile, { '@/lib/api': {} });
const controls = [{id:'c1',obligation_id:'o',status:'COMPLETED'}, {id:'c2',obligation_id:'o',status:'PENDING'}, {id:'c3',obligation_id:'o',status:'COMPLETED'}];
const evidences = [{control_id:'c1',obligation_id:'o'}, {control_id:'c1',obligation_id:'o'}, {control_id:'c2',obligation_id:'o'}, {control_id:null,obligation_id:'o'}];
const summary = data.summarizeChecklist('o', controls, evidences);
const surface = load('components/ui/surface.tsx');
const utils = load('features/obligations/table/obligation-table.utils.ts');
const components = load('features/obligations/checklist/obligation-checklist.tsx', { '@/components/ui/surface':surface, '../table/obligation-table.utils':utils, './checklist-data': data });
const obligation = {id:'o',title:'Declaración REP',matter:'REP',responsible_user:{name:'Ana Pérez'},responsible_user_id:'ana',deadline:'2026-10-20',compliance_status:'IN_PROGRESS'};
function row(result = {summary}, extra = {}) { return renderToStaticMarkup(React.createElement(components.ChecklistRow,{obligation:{...obligation,...extra},result,onOpenDetail:()=>{},onRetry:()=>{}})); }

test('counts completed controls without inferring obligation compliance', () => {
  assert.deepEqual(summary,{total:3,completed:2,backed:2,general:1,evidenceCount:4});
  assert.equal(obligation.compliance_status,'IN_PROGRESS');
});
test('multiple evidences on same control count only once', () => { assert.equal(summary.backed,2); });
test('general evidence is separate and does not back a control', () => {
  assert.deepEqual(data.summarizeChecklist('o',controls,[{control_id:null,obligation_id:'o'}]),{total:3,completed:2,backed:0,general:1,evidenceCount:1});
});
test('does not count foreign controls or foreign obligation evidence', () => {
  const s = data.summarizeChecklist('o',[...controls,{id:'foreign',obligation_id:'other',status:'COMPLETED'}],[...evidences,{control_id:'foreign',obligation_id:'other'}]);
  assert.deepEqual(s,summary);
});
test('row shows title, matter, responsible, deadline and real status', () => {
  const html=row(); for(const text of ['Declaración REP','Ana Pérez','En proceso','2026','REP']) assert.ok(html.includes(text));
});
test('row shows progress, backed controls and general evidence', () => {
  const html=row(); for(const text of ['2 de 3 controles completados','2','controles con evidencia','evidencia general','<progress']) assert.ok(html.includes(text));
});
test('no controls and no evidences is a successful empty state, not loading', () => {
  const html=row({summary:data.summarizeChecklist('o',[],[])},{responsible_user:null,responsible_user_id:null});
  for(const text of ['Sin controles','Sin evidencia','Sin responsable']) assert.ok(html.includes(text));
  assert.ok(!html.includes('<progress')); assert.ok(!html.includes('role="alert"'));
});
test('loading and error do not display fabricated zero counts', () => {
  assert.ok(row(undefined).includes('controles')); // default data tested separately below
  const loading = renderToStaticMarkup(React.createElement(components.ChecklistRow,{obligation,onOpenDetail:()=>{},onRetry:()=>{}}));
  assert.ok(loading.includes('Consultando')); assert.ok(!loading.includes('Sin evidencia'));
  const error=row({error:'Consulta fallida'}); assert.ok(error.includes('role="alert"')); assert.ok(error.includes('Reintentar')); assert.ok(!error.includes('Sin evidencia'));
});
test('detail action forwards original obligation and has no mutation actions for any role', () => {
  let opened;
  const tree=components.ChecklistRow({obligation,result:{summary},onOpenDetail:o=>opened=o,onRetry:()=>{}});
  function find(node) { if(node?.type==='button' && node.props['aria-label']) return node; for(const child of [node?.props?.children].flat(Infinity)){if(child&&typeof child==='object'){const result=find(child);if(result)return result;}} }
  find(tree).props.onClick(); assert.equal(opened,obligation);
  const html=row(); assert.ok(!html.includes('Guardar')); assert.ok(!html.includes('Editar'));
});
test('Checklist renders provided scope only and exact empty state', () => {
  const html=renderToStaticMarkup(React.createElement(components.ObligationChecklist,{obligations:[obligation],revision:0,onOpenDetail:()=>{}}));
  assert.ok(html.includes('Declaración REP'));
  const empty=renderToStaticMarkup(React.createElement(components.ObligationChecklist,{obligations:[],revision:0,onOpenDetail:()=>{}}));
  assert.ok(empty.includes('No hay obligaciones que coincidan con los filtros actuales.'));
});
test('initial rendering is bounded to eight obligations', () => {
  const html=renderToStaticMarkup(React.createElement(components.ObligationChecklist,{obligations:Array.from({length:20},(_,i)=>({...obligation,id:String(i),title:`Registro-${i}`})),revision:0,onOpenDetail:()=>{}}));
  assert.ok(html.includes('Registro-7')); assert.ok(!html.includes('Registro-8')); assert.ok(html.includes('Mostrar más'));
});
test('switcher retains Table/Planner and adds Checklist', () => {
  const {ObligationsViewSwitcher}=load('features/obligations/obligations-view-switcher.tsx');
  const html=renderToStaticMarkup(React.createElement(ObligationsViewSwitcher,{value:'checklist',onChange:()=>{}}));
  for(const text of ['Tabla','Planner','Checklist','aria-pressed="true"']) assert.ok(html.includes(text));
});
test('batch fetches only supplied IDs, deduplicates and caps concurrency at four', async () => {
  let active=0,max=0;const seen=[];
  const request=async id=>{seen.push(id);active++;max=Math.max(max,active);await new Promise(r=>setImmediate(r));active--;return [];};
  const {loadChecklistBatch}=load(dataFile,{'@/lib/api':{getControls:request,getEvidences:request}});
  const results=[];await loadChecklistBatch(['a','b','c','a'],(id,result)=>results.push([id,result]));
  assert.equal(max,4);assert.equal(seen.length,6);assert.equal(results.length,3);
});
test('failed API lookup reports error, while successful siblings remain available', async () => {
  const {loadChecklistBatch}=load(dataFile,{'@/lib/api':{getControls:async id=>{if(id==='a')throw Error('403');return [];},getEvidences:async()=>[]}});
  const results={};await loadChecklistBatch(['a','b'],(id,r)=>results[id]=r);
  assert.ok(results.a.error);assert.equal(results.a.summary,undefined);assert.equal(results.b.summary.total,0);
});
test('cancelled batch stops publishing stale results', async () => {
  let cancelled=false;
  const {loadChecklistBatch}=load(dataFile,{'@/lib/api':{getControls:async()=>{cancelled=true;return [];},getEvidences:async()=>[]}});
  let published=0;await loadChecklistBatch(['a','b','c'],()=>published++,()=>cancelled);assert.equal(published,0);
});
test('page wires all views to shared filtered scope and single existing modal; closes refresh checklist', () => {
  const page=source('app/obligations/page.tsx');
  assert.match(page,/<ObligationChecklist obligations=\{filtered\} onOpenDetail=\{handleOpenDetail\}/);
  assert.match(page,/<ObligationBoard obligations=\{filtered\} onOpenObligation=\{handleOpenDetail\}/);
  assert.match(page,/<ObligationTable\s+items=\{filtered\}/);
  assert.equal((page.match(/<ObligationDetailModal/g)||[]).length,1);
  assert.match(page,/setChecklistRevision\(\(value\) => value \+ 1\)/);
});
