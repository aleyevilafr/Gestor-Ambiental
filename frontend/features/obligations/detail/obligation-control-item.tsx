"use client";

import { useState } from "react";

import type { Control } from "@/lib/api";
import { controlStatusLabels, controlToDraft, type ControlDraft } from "@/features/controls/controls.types";

const statusOptions: Control["status"][] = ["PENDING", "IN_PROGRESS", "COMPLETED"];

const indicatorClass: Record<Control["status"], string> = {
  PENDING: "border-slate-300 bg-slate-100 text-slate-600",
  IN_PROGRESS: "border-sky-200 bg-sky-50 text-sky-700",
  COMPLETED: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function dateLabel(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(`${value}T12:00:00`))
    : "Sin fecha límite";
}

export function ObligationControlItem({
  control,
  editable,
  onSave,
}: {
  control: Control;
  editable: boolean;
  onSave: (control: Control, draft: ControlDraft) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<ControlDraft>(() => controlToDraft(control));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const setField = <K extends keyof ControlDraft>(field: K, value: ControlDraft[K]) => {
    setDraft((current) => ({ ...current, [field]: value }));
  };

  const cancel = () => {
    setDraft(controlToDraft(control));
    setError("");
    setEditing(false);
  };

  const save = async () => {
    if (!draft.title.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(control, draft);
      setEditing(false);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No fue posible guardar el control.");
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <li className="rounded-lg border border-sky-200 bg-sky-50/40 p-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Título</span>
            <input className="control-field h-9 w-full rounded-[8px] border px-2.5 text-sm" disabled={saving} onChange={(event) => setField("title", event.target.value)} value={draft.title} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Fecha límite</span>
            <input className="control-field h-9 w-full rounded-[8px] border px-2.5 text-sm" disabled={saving} onChange={(event) => setField("due_date", event.target.value)} type="date" value={draft.due_date} />
          </label>
          <label>
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Estado</span>
            <select className="control-field h-9 w-full rounded-[8px] border px-2.5 text-sm" disabled={saving} onChange={(event) => setField("status", event.target.value as Control["status"])} value={draft.status}>
              {statusOptions.map((status) => <option key={status} value={status}>{controlStatusLabels[status]}</option>)}
            </select>
          </label>
          <label className="sm:col-span-2">
            <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">Descripción</span>
            <textarea className="control-field min-h-16 w-full resize-y rounded-[8px] border px-2.5 py-2 text-sm" disabled={saving} onChange={(event) => setField("description", event.target.value)} value={draft.description} />
          </label>
        </div>
        {error ? <p className="mt-2 text-xs text-red-700">{error}</p> : null}
        <div className="mt-3 flex justify-end gap-2">
          <button className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white" disabled={saving} onClick={cancel} type="button">Cancelar</button>
          <button className="button-primary rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60" disabled={saving} onClick={() => void save()} type="button">{saving ? "Guardando..." : "Guardar"}</button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-start justify-between gap-3 rounded-lg border border-slate-200/90 bg-white px-3 py-2.5 transition hover:border-slate-300 hover:bg-slate-50/70">
      <div className="flex min-w-0 gap-2.5">
        <span aria-label={controlStatusLabels[control.status]} className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-xs font-bold ${indicatorClass[control.status]}`}>
          {control.status === "COMPLETED" ? "✓" : control.status === "IN_PROGRESS" ? "~" : "○"}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800">{control.title}</p>
          <p className="mt-0.5 text-xs text-slate-500">{dateLabel(control.due_date)}{control.description ? ` · ${control.description}` : ""}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${indicatorClass[control.status]}`}>{controlStatusLabels[control.status]}</span>
        {editable ? <button className="rounded-md px-2 py-1 text-xs font-semibold text-[#254d78] hover:bg-sky-50 hover:text-[#111c30]" onClick={() => setEditing(true)} type="button">Editar</button> : null}
      </div>
    </li>
  );
}
