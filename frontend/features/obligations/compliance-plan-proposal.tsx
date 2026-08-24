"use client";

import { useEffect, useState } from "react";
import { PrimaryButton } from "@/components/ui/primary-button";
import { Card } from "@/components/ui/surface";
import { createControlsBatch, type CompliancePlanProposal, type OrganizationUser } from "@/lib/api";

type EditableAction = CompliancePlanProposal["recommended_actions"][number] & {
  selected: boolean;
  responsible_user_id: string | null;
};

type Props = {
  obligationId: string;
  proposal: CompliancePlanProposal;
  users: OrganizationUser[];
  onDiscard: () => void;
  onCreated: () => void;
  onError: (message: string) => void;
};

export function CompliancePlanProposalCard({ obligationId, proposal, users, onDiscard, onCreated, onError }: Props) {
  const [actions, setActions] = useState<EditableAction[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setActions(proposal.recommended_actions.map((action) => ({ ...action, selected: true, responsible_user_id: null })));
  }, [proposal]);

  function update(index: number, field: keyof EditableAction, value: string | boolean | null) {
    setActions((current) => current.map((action, actionIndex) => actionIndex === index ? { ...action, [field]: value } : action));
  }

  async function addSelected() {
    const selected = actions.filter((action) => action.selected);
    if (!selected.length) {
      onError("Selecciona al menos una acción para agregarla.");
      return;
    }
    setSubmitting(true);
    try {
      await createControlsBatch(obligationId, selected.map(({ selected: _selected, suggested_due_date, ...action }) => ({
        ...action,
        due_date: suggested_due_date || null,
        status: "PENDING",
      })));
      onCreated();
    } catch (caught) {
      onError(caught instanceof Error ? caught.message : "No fue posible agregar las acciones propuestas.");
    } finally {
      setSubmitting(false);
    }
  }

  const eligibleUsers = users.filter((user) => user.is_active && (user.role === "ADMIN" || user.role === "RESPONSIBLE"));
  return <Card className="p-5 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-[#111c30]">Plan propuesto</h2><p className="mt-1 text-sm text-slate-600">Propuesta temporal generada automáticamente. Revísala antes de crear acciones.</p></div></div>
    {(proposal.objective || proposal.assessment) && <div className="mt-5 grid gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">{proposal.objective && <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Objetivo</p><p className="mt-1 text-sm text-slate-700">{proposal.objective}</p></div>}{proposal.assessment && <div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Diagnóstico</p><p className="mt-1 text-sm text-slate-700">{proposal.assessment}</p></div>}</div>}
    {proposal.warnings.length > 0 && <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><p className="font-semibold">Advertencias</p><ul className="mt-2 list-disc space-y-1 pl-5">{proposal.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul></div>}
    <div className="mt-5 space-y-4">{actions.map((action, index) => <section key={index} className="rounded-lg border border-slate-200 p-4"><label className="flex items-center gap-2 text-sm font-semibold text-[#111c30]"><input checked={action.selected} onChange={(event) => update(index, "selected", event.target.checked)} type="checkbox" className="h-4 w-4" /> Acción sugerida {index + 1}</label><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-sm text-slate-700">Título<input value={action.title} onChange={(event) => update(index, "title", event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3" /></label><label className="text-sm text-slate-700">Fecha objetivo<input value={action.suggested_due_date ?? ""} onChange={(event) => update(index, "suggested_due_date", event.target.value || null)} type="date" className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3" /></label><label className="text-sm text-slate-700">Responsable<select value={action.responsible_user_id ?? ""} onChange={(event) => update(index, "responsible_user_id", event.target.value || null)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3"><option value="">Sin asignar</option>{eligibleUsers.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</select></label><label className="text-sm text-slate-700">Evidencia esperada<input value={action.expected_evidence ?? ""} onChange={(event) => update(index, "expected_evidence", event.target.value || null)} className="mt-1 h-10 w-full rounded-lg border border-slate-300 px-3" /></label><label className="sm:col-span-2 text-sm text-slate-700">Descripción<textarea value={action.description ?? ""} onChange={(event) => update(index, "description", event.target.value || null)} className="mt-1 min-h-20 w-full rounded-lg border border-slate-300 p-3" /></label></div></section>)}{actions.length === 0 && <p className="rounded-lg bg-slate-50 p-4 text-sm text-slate-600">No se propusieron acciones. Completa la información de la obligación y vuelve a intentarlo si corresponde.</p>}</div>
    <div className="mt-6 flex flex-wrap justify-end gap-3"><button type="button" onClick={onDiscard} disabled={submitting} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50">Descartar</button><PrimaryButton type="button" onClick={addSelected} disabled={submitting || !actions.some((action) => action.selected)}>{submitting ? "Agregando acciones…" : "Agregar acciones seleccionadas"}</PrimaryButton></div>
  </Card>;
}
