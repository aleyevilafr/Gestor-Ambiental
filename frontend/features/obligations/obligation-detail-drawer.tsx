"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StatusBadge } from "@/components/ui/surface";
import { ApiError, archiveObligation, getEvidences, updateObligation, updateObligationStatus, type AuthenticatedUser, type Evidence, type Obligation, type OrganizationUser } from "@/lib/api";

const statusLabels = { PENDING: "Pendiente", IN_PROGRESS: "En proceso", COMPLIANT: "Cumplida", OVERDUE: "Vencida" };
const statusTones = { PENDING: "warning", IN_PROGRESS: "info", COMPLIANT: "success", OVERDUE: "danger" } as const;
type Draft = Pick<Obligation, "title" | "description" | "matter" | "regulatory_source" | "article" | "deadline" | "frequency" | "compliance_status" | "responsible_user_id">;

function draftFrom(item: Obligation): Draft {
  return { title: item.title, description: item.description ?? "", matter: item.matter, regulatory_source: item.regulatory_source, article: item.article ?? "", deadline: item.deadline ?? "", frequency: item.frequency ?? "", compliance_status: item.compliance_status, responsible_user_id: item.responsible_user_id };
}

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "Sin fecha";
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return <div><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm leading-6 text-slate-700">{value || "—"}</dd></div>;
}

export function ObligationDetailDrawer({ item, user, users, onClose, onSaved, onArchived }: { item: Obligation; user: AuthenticatedUser; users: OrganizationUser[]; onClose: () => void; onSaved: (item: Obligation) => void; onArchived: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(item));
  const [evidences, setEvidences] = useState<Evidence[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const canEdit = user.role === "ADMIN" || (user.role === "RESPONSIBLE" && item.responsible_user_id === user.id);
  const canAssign = user.role === "ADMIN";
  const eligibleUsers = useMemo(() => users.filter((person) => person.is_active && (person.role === "ADMIN" || person.role === "RESPONSIBLE")), [users]);
  const dirty = JSON.stringify(draft) !== JSON.stringify(draftFrom(item));

  useEffect(() => {
    setDraft(draftFrom(item));
    setEditing(false);
    setError("");
    setNotice("");
    setEvidences(null);
    closeButtonRef.current?.focus();
    void getEvidences(item.id).then(setEvidences).catch(() => setEvidences([]));
  }, [item.id]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") closeDrawer(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function closeDrawer() {
    if (dirty && !window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos?")) return;
    onClose();
  }

  function cancelEdit() {
    if (dirty && !window.confirm("¿Quieres descartar los cambios realizados?")) return;
    setDraft(draftFrom(item));
    setEditing(false);
    setError("");
  }

  async function save() {
    if (!draft.title.trim() || !draft.matter.trim() || !draft.regulatory_source.trim()) { setError("Nombre, materia y fuente normativa son obligatorios."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const payload: Record<string, unknown> = {};
      (["title", "description", "matter", "regulatory_source", "article", "deadline", "frequency"] as const).forEach((key) => {
        const value = draft[key];
        const original = draftFrom(item)[key];
        if (value !== original) payload[key] = value === "" ? null : value;
      });
      if (canAssign && draft.responsible_user_id !== item.responsible_user_id) payload.responsible_user_id = draft.responsible_user_id;
      let saved = item;
      if (Object.keys(payload).length) saved = await updateObligation(item.id, payload);
      if (draft.compliance_status !== item.compliance_status) saved = await updateObligationStatus(item.id, draft.compliance_status);
      onSaved(saved);
      setDraft(draftFrom(saved));
      setEditing(false);
      setNotice("Cambios guardados.");
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "No fue posible guardar los cambios.");
    } finally { setSaving(false); }
  }

  async function archive() {
    if (!window.confirm("¿Archivar esta obligación? Dejará de mostrarse en el Board activo.")) return;
    setSaving(true); setError("");
    try { await archiveObligation(item.id); onArchived(item.id); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "No fue posible archivar la obligación."); }
    finally { setSaving(false); }
  }

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));

  if (!mounted) return null;

  return createPortal(<div className="fixed inset-0 z-50" aria-labelledby="obligation-drawer-title" aria-modal="true" role="dialog">
    <button aria-label="Cerrar ficha de obligación" className="absolute inset-0 z-0 cursor-default bg-slate-950/[0.18]" onClick={closeDrawer} type="button" />
    <aside className="fixed inset-y-0 right-0 z-10 flex w-full flex-col overflow-hidden border-l border-slate-200 bg-[var(--surface)] shadow-[-16px_0_36px_rgba(15,23,42,.14)] sm:inset-y-3 sm:right-3 sm:w-[min(82vw,600px)] sm:rounded-[18px] sm:border">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-[var(--surface-cool)] px-5 py-5 sm:px-7">
        <div className="flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{item.matter}</span><StatusBadge tone={statusTones[item.compliance_status]}>{statusLabels[item.compliance_status]}</StatusBadge></div><h2 id="obligation-drawer-title" className="mt-3 text-xl font-semibold leading-7 text-[#111c30]">{item.title}</h2><p className="mt-1 truncate text-sm text-slate-500">{item.regulatory_source}{item.article ? ` · ${item.article}` : ""}</p></div><button ref={closeButtonRef} aria-label="Cerrar ficha" className="grid size-9 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-white hover:text-[#111c30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111c30]/30" onClick={closeDrawer} type="button">×</button></div>
        <div className="mt-4 flex flex-wrap items-center gap-2"><Link className="rounded-[9px] border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-[#172033] transition hover:border-slate-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111c30]/30" href={`/obligations/${item.id}`}>Ver detalle completo</Link>{canEdit && !editing && <button className="button-primary rounded-[10px] px-3.5 py-2 text-sm font-semibold text-white" onClick={() => setEditing(true)} type="button">Editar</button>}{user.role === "ADMIN" && <button className="rounded-[9px] border border-red-100 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 transition hover:border-red-200 hover:bg-red-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600/30" onClick={() => void archive()} type="button">Archivar</button>}</div>
      </header>

      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
        {error && <p className="mb-5 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700" role="alert">{error}</p>}
        {notice && <p className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800" role="status">{notice}</p>}
        {editing ? <div className="space-y-7"><section><h3 className="text-sm font-semibold text-[#172033]">Datos generales</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2">Nombre<input className="control-field mt-1.5 h-11 w-full rounded-[10px] border px-3" value={draft.title} onChange={(event) => set("title", event.target.value)} /></label><label>Materia<input className="control-field mt-1.5 h-11 w-full rounded-[10px] border px-3" value={draft.matter} onChange={(event) => set("matter", event.target.value)} /></label><label>Frecuencia<input className="control-field mt-1.5 h-11 w-full rounded-[10px] border px-3" value={draft.frequency ?? ""} onChange={(event) => set("frequency", event.target.value)} /></label><label className="sm:col-span-2">Descripción<textarea className="control-field mt-1.5 min-h-28 w-full rounded-[10px] border px-3 py-2.5" placeholder="Agrega una descripción que explique esta obligación y su alcance." value={draft.description ?? ""} onChange={(event) => set("description", event.target.value)} /></label><label>Fuente normativa<input className="control-field mt-1.5 h-11 w-full rounded-[10px] border px-3" value={draft.regulatory_source} onChange={(event) => set("regulatory_source", event.target.value)} /></label><label>Artículo o referencia<input className="control-field mt-1.5 h-11 w-full rounded-[10px] border px-3" value={draft.article ?? ""} onChange={(event) => set("article", event.target.value)} /></label></div></section><section className="border-t border-slate-200 pt-6"><h3 className="text-sm font-semibold text-[#172033]">Gestión</h3><div className="mt-3 grid gap-4 sm:grid-cols-2"><label>Estado<select className="control-field mt-1.5 h-11 w-full rounded-[10px] border px-3" value={draft.compliance_status} onChange={(event) => set("compliance_status", event.target.value as Obligation["compliance_status"])}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Fecha límite<input className="control-field mt-1.5 h-11 w-full rounded-[10px] border px-3" type="date" value={draft.deadline ?? ""} onChange={(event) => set("deadline", event.target.value)} /></label>{canAssign ? <label className="sm:col-span-2">Responsable<select className="control-field mt-1.5 h-11 w-full rounded-[10px] border px-3" value={draft.responsible_user_id ?? ""} onChange={(event) => set("responsible_user_id", event.target.value || null)}><option value="">Sin asignar</option>{eligibleUsers.map((person) => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label> : <div className="sm:col-span-2"><DetailRow label="Responsable" value={item.responsible_user?.name ?? "Sin asignar"} /></div>}</div></section></div> : <div className="space-y-7"><section><h3 className="text-sm font-semibold text-[#172033]">Gestión</h3><dl className="mt-3 grid gap-4 sm:grid-cols-2"><DetailRow label="Responsable" value={item.responsible_user?.name ?? "Sin asignar"} /><DetailRow label="Estado" value={statusLabels[item.compliance_status]} /><DetailRow label="Fecha límite" value={formatDate(item.deadline)} /><DetailRow label="Frecuencia" value={item.frequency} /></dl></section><section className="border-t border-slate-200 pt-6"><h3 className="text-sm font-semibold text-[#172033]">Detalle</h3><dl className="mt-3 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><DetailRow label="Descripción" value={item.description} /></div><DetailRow label="Fuente normativa" value={item.regulatory_source} /><DetailRow label="Artículo o referencia" value={item.article} /></dl></section></div>}
        <section className="mt-7 border-t border-slate-200 pt-6"><h3 className="text-sm font-semibold text-[#172033]">Documentos y evidencias</h3>{evidences === null ? <p className="mt-3 text-sm text-slate-500">Cargando evidencias…</p> : evidences.length === 0 ? <p className="mt-3 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-slate-500">Aún no hay documentos vinculados.</p> : <ul className="mt-3 divide-y divide-slate-200 rounded-xl border border-slate-200">{evidences.map((evidence) => { const href = evidence.external_url ?? evidence.file_url; return <li className="flex items-center justify-between gap-3 px-4 py-3" key={evidence.id}><span className="min-w-0"><b className="block truncate text-sm text-[#172033]">{evidence.name}</b><span className="mt-0.5 block text-xs text-slate-500">{evidence.evidence_type === "EXTERNAL_LINK" ? "Enlace externo" : "Archivo referenciado"} · {formatDate(evidence.created_at.slice(0, 10))}</span></span>{href && <a className="shrink-0 text-sm font-medium text-[#172033] underline-offset-4 hover:underline" href={href} rel="noreferrer" target="_blank">Abrir</a>}</li>; })}</ul>}</section>
        <section className="mt-7 border-t border-slate-200 pt-6"><h3 className="text-sm font-semibold text-[#172033]">Información del sistema</h3><dl className="mt-3 grid gap-4 sm:grid-cols-2"><DetailRow label="Creado" value={formatDate(item.created_at.slice(0, 10))} /><DetailRow label="Actualizado" value={formatDate(item.updated_at.slice(0, 10))} /><DetailRow label="Creador" value={item.created_by_user_id} /></dl></section>
      </div>

      {editing && <footer className="sticky bottom-0 z-10 flex items-center justify-end gap-3 border-t border-slate-200 bg-[var(--surface)] px-5 py-4 sm:px-7"><button className="rounded-[10px] px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100" disabled={saving} onClick={cancelEdit} type="button">Cancelar</button><button className="button-primary rounded-[10px] px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={saving} onClick={() => void save()} type="button">{saving ? "Guardando…" : "Guardar cambios"}</button></footer>}
    </aside>
  </div>, document.body);
}
