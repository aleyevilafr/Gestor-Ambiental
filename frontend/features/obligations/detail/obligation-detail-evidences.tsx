"use client";

import { useEffect, useRef, useState } from "react";
import type { Control, Evidence } from "@/lib/api";
import { useModalActivity } from "./obligation-modal-activity";
import { emptyEvidenceDraft, safeEvidenceUrl, useObligationEvidences } from "./use-obligation-evidences";

export function EvidenceList({ items, controls }: { items: Evidence[]; controls: Control[] }) {
  const general = items.filter((item) => !item.control_id);
  const specific = items.filter((item) => item.control_id);
  const groups: Array<[string, Evidence[]]> = [["Generales", general], ["Asociadas a controles", specific]];
  if (!items.length) return <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">No hay evidencias registradas para esta obligación.</p>;
  return <div className="space-y-4">{groups.map(([label, entries]) => entries.length ? (
    <div key={label}><h4 className="mb-2 text-sm font-semibold text-slate-700">{label}</h4><ul className="space-y-2">{entries.map((item) => {
      const url = safeEvidenceUrl(item.evidence_type === "FILE" ? item.file_url : item.external_url);
      return <li key={item.id} className="rounded-lg border border-slate-200 bg-white p-3 text-sm">
        <p className="break-words font-semibold text-slate-800">{item.name}</p>
        <p className="mt-1 text-xs text-slate-500">{item.evidence_type === "FILE" ? "Archivo referenciado (FILE)" : "Enlace externo (EXTERNAL_LINK)"} · {new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(item.created_at))}</p>
        <p className="mt-1 break-words text-xs text-slate-600">{item.control_id ? `Control: ${controls.find((control) => control.id === item.control_id)?.title ?? item.control_id}` : "Evidencia general"}</p>
        {item.description ? <p className="mt-2 whitespace-pre-wrap break-words text-slate-600">{item.description}</p> : null}
        <p className="mt-1 text-xs text-slate-500">Registrada por {item.uploaded_by_user.name}</p>
        {url ? <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block font-medium text-[#254d78] underline underline-offset-2">Abrir referencia<span className="sr-only"> de {item.name} (nueva pestaña)</span></a> : <p className="mt-2 text-xs text-slate-500">Referencia no disponible.</p>}
      </li>;
    })}</ul></div>
  ) : null)}</div>;
}

export function ObligationDetailEvidences({ obligationId, editable, controls, controlsUnavailable, reloadControls }: {
  obligationId: string; editable: boolean; controls: Control[]; controlsUnavailable: boolean; reloadControls: () => Promise<void>;
}) {
  const data = useObligationEvidences(obligationId);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(emptyEvidenceDraft);
  const nameRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);
  // Independent write: only report busy state, never modify the obligation baseline.
  useModalActivity("evidence:register", false, data.submitting);
  useEffect(() => {
    if (open) nameRef.current?.focus({ preventScroll: true });
    else if (wasOpen.current) triggerRef.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [open]);
  const closeForm = () => { setOpen(false); setDraft(emptyEvidenceDraft()); };
  const field = "control-field mt-1 w-full rounded-lg border px-3 py-2 text-sm";
  return <section aria-labelledby="obligation-evidences-title" className="border-t border-slate-200/90 pt-5">
    <h3 id="obligation-evidences-title" className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Evidencias</h3>
    <p className="mt-2 text-sm text-slate-500">Las evidencias permiten respaldar documentalmente la gestión de esta obligación y sus controles.</p>
    {data.loading ? <p role="status" className="mt-3 text-sm text-slate-500">Cargando evidencias…</p> : null}
    {data.loadError ? <div role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{data.loadError}<button type="button" disabled={data.submitting || data.loading} className="ml-2 underline" onClick={() => void data.load()}>Reintentar carga de evidencias</button></div> : null}
    {!data.loading && !data.loadError ? <div className="mt-3 space-y-3"><p className="text-sm text-slate-600">{data.items.length} {data.items.length === 1 ? "evidencia registrada" : "evidencias registradas"}</p><EvidenceList items={data.items} controls={controls} /></div> : null}
    {data.success ? <p role="status" className="mt-3 text-sm text-emerald-700">{data.success}</p> : null}
    {editable ? <button ref={triggerRef} type="button" disabled={open || data.submitting} className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#254d78] disabled:opacity-50" onClick={() => setOpen(true)}>Registrar evidencia</button> : null}
    {editable && open ? <form className="mt-3 space-y-3 rounded-lg border border-sky-200 bg-sky-50/40 p-3" onSubmit={async (event) => { event.preventDefault(); if (await data.create(draft, controlsUnavailable ? [] : controls)) closeForm(); }}>
      <label className="block text-sm">Nombre *<input ref={nameRef} required maxLength={255} disabled={data.submitting} className={field} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="block text-sm">Tipo<select disabled className={field} value="EXTERNAL_LINK"><option value="EXTERNAL_LINK">Enlace externo</option></select></label>
      <p className="text-xs text-slate-500">Esta versión registra enlaces. No carga archivos físicos.</p>
      <label className="block text-sm">URL *<input required type="url" maxLength={2048} disabled={data.submitting} className={field} value={draft.external_url} onChange={(event) => setDraft({ ...draft, external_url: event.target.value })} /></label>
      <label className="block text-sm">Control asociado<select disabled={data.submitting || controlsUnavailable} className={field} value={draft.control_id} onChange={(event) => setDraft({ ...draft, control_id: event.target.value })}><option value="">Evidencia general de la obligación</option>{controls.map((control) => <option key={control.id} value={control.id}>{control.title}</option>)}</select></label>
      {controlsUnavailable ? <p className="text-xs text-slate-600">Los controles no están disponibles. Puedes registrar una evidencia general o <button type="button" className="underline" disabled={data.submitting} onClick={() => void reloadControls()}>recargar controles</button>.</p> : null}
      <label className="block text-sm">Descripción<textarea disabled={data.submitting} className={field} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
      {data.error ? <p role="alert" className="text-sm text-red-700">{data.error}</p> : null}
      <p className="text-xs text-slate-500">Este registro se guarda por separado; cancelar la obligación no elimina evidencias registradas.</p>
      <div className="flex justify-end gap-3"><button type="button" disabled={data.submitting} onClick={closeForm} className="rounded-lg px-3 py-2 text-sm">Cancelar registro</button><button type="submit" disabled={data.submitting} className="button-primary rounded-lg px-3 py-2 text-sm text-white disabled:opacity-50">{data.submitting ? "Registrando…" : "Guardar evidencia"}</button></div>
    </form> : null}
  </section>;
}
