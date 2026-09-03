"use client";

import { useState } from "react";

import type { Control, Obligation } from "@/lib/api";
import { emptyControlDraft, type ControlDraft } from "@/features/controls/controls.types";
import { useObligationControls } from "@/features/controls/use-obligation-controls";

import { ObligationControlItem } from "./obligation-control-item";

export function ObligationDetailControls({ obligation, editable }: { obligation: Obligation; editable: boolean }) {
  const { controls, create, load, loadError, loading, update } = useObligationControls(obligation.id);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<ControlDraft>(emptyControlDraft);
  const [creatingControl, setCreatingControl] = useState(false);
  const [formError, setFormError] = useState("");

  const completed = controls.filter((control) => control.status === "COMPLETED").length;
  const setField = <K extends keyof ControlDraft>(field: K, value: ControlDraft[K]) => setDraft((current) => ({ ...current, [field]: value }));
  const cancelCreate = () => {
    setCreating(false);
    setDraft(emptyControlDraft());
    setFormError("");
  };
  const submitCreate = async () => {
    if (!draft.title.trim()) {
      setFormError("El título es obligatorio.");
      return;
    }
    setCreatingControl(true);
    setFormError("");
    try {
      await create(draft);
      cancelCreate();
    } catch (createError) {
      setFormError(createError instanceof Error ? createError.message : "No fue posible crear el control.");
    } finally {
      setCreatingControl(false);
    }
  };

  return (
    <section aria-labelledby="obligation-controls-title" className="border-t border-slate-200/90 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500" id="obligation-controls-title">Controles</h3>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{completed}/{controls.length}</span>
      </div>

      {loading ? <div aria-label="Cargando controles" className="mt-2.5 space-y-2"><div className="h-12 animate-pulse rounded-lg bg-slate-100" /><div className="h-12 animate-pulse rounded-lg bg-slate-100" /></div> : null}
      {!loading && loadError ? <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5"><p className="text-sm text-red-700">No fue posible cargar los controles.</p><button className="text-xs font-semibold text-red-800 underline underline-offset-2" onClick={() => void load()} type="button">Reintentar</button></div> : null}
      {!loading && !loadError && controls.length === 0 ? <p className="mt-2.5 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">No hay controles asociados.</p> : null}
      {!loading && !loadError && controls.length > 0 ? <ul className="mt-2.5 space-y-2">{controls.map((control) => <ObligationControlItem control={control} editable={editable} key={control.id} onSave={async (item, itemDraft) => { await update(item, itemDraft); }} />)}</ul> : null}

      {editable && !creating ? <button className="mt-3 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#254d78] transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#111c30]" onClick={() => setCreating(true)} type="button">+ Agregar control</button> : null}
      {editable && creating ? (
        <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50/40 p-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Título *</span><input className="control-field h-9 w-full rounded-[8px] border px-2.5 text-sm" disabled={creatingControl} onChange={(event) => setField("title", event.target.value)} value={draft.title} /></label>
            <label><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha límite</span><input className="control-field h-9 w-full rounded-[8px] border px-2.5 text-sm" disabled={creatingControl} onChange={(event) => setField("due_date", event.target.value)} type="date" value={draft.due_date} /></label>
            <label><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</span><select className="control-field h-9 w-full rounded-[8px] border px-2.5 text-sm" disabled={creatingControl} onChange={(event) => setField("status", event.target.value as Control["status"])} value={draft.status}><option value="PENDING">Pendiente</option><option value="IN_PROGRESS">En proceso</option><option value="COMPLETED">Completado</option></select></label>
            <label className="sm:col-span-2"><span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</span><textarea className="control-field min-h-16 w-full resize-y rounded-[8px] border px-2.5 py-2 text-sm" disabled={creatingControl} onChange={(event) => setField("description", event.target.value)} value={draft.description} /></label>
          </div>
          {formError ? <p className="mt-2 text-xs text-red-700">{formError}</p> : null}
          <div className="mt-3 flex justify-end gap-2"><button className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white" disabled={creatingControl} onClick={cancelCreate} type="button">Cancelar</button><button className="button-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" disabled={creatingControl} onClick={() => void submitCreate()} type="button">{creatingControl ? "Creando..." : "Crear control"}</button></div>
        </div>
      ) : null}
    </section>
  );
}
