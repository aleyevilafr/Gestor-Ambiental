"use client";

import { useEffect, useRef, useState } from "react";
import { Card, EmptyState, StatusBadge } from "@/components/ui/surface";
import type { Obligation } from "@/lib/api";
import { formatDeadline, statusLabels } from "../table/obligation-table.utils";
import { CHECKLIST_PAGE_SIZE, loadChecklistBatch, type ChecklistResult } from "./checklist-data";

const tones = { PENDING: "warning", IN_PROGRESS: "info", COMPLIANT: "success", OVERDUE: "danger" } as const;

export function ChecklistRow({ obligation, result, onOpenDetail, onRetry }: {
  obligation: Obligation; result?: ChecklistResult;
  onOpenDetail: (obligation: Obligation) => void; onRetry: () => void;
}) {
  const summary = result?.summary;
  return <Card className="p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-base font-semibold text-slate-900">{obligation.title}</h2><p className="mt-1 text-sm text-slate-500">{obligation.matter}</p></div>
      <StatusBadge tone={tones[obligation.compliance_status]}>{statusLabels[obligation.compliance_status]}</StatusBadge>
    </div>
    <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
      <div><dt className="text-slate-500">Responsable</dt><dd className="mt-1 font-medium text-slate-800">{obligation.responsible_user?.name ?? (obligation.responsible_user_id ? "Responsable asignado" : "Sin responsable")}</dd></div>
      <div><dt className="text-slate-500">Fecha límite</dt><dd className="mt-1 font-medium text-slate-800">{formatDeadline(obligation.deadline)}</dd></div>
      {summary ? <>
        <div><dt className="text-slate-500">Controles</dt><dd className="mt-1 font-medium text-slate-800">{summary.total ? `${summary.completed} de ${summary.total} controles completados` : "Sin controles"}</dd>
          {summary.total > 0 ? <progress className="mt-2 h-1.5 w-full accent-sky-700" aria-label={`Progreso de controles de ${obligation.title}`} max={summary.total} value={summary.completed} /> : null}
        </div>
        <div><dt className="text-slate-500">Evidencias</dt><dd className="mt-1 space-y-1 text-slate-800"><p className="font-medium">{summary.evidenceCount ? "Evidencia disponible" : "Sin evidencia"}</p><p>{summary.backed} de {summary.total} controles con evidencia</p><p>{summary.general} {summary.general === 1 ? "evidencia general" : "evidencias generales"}</p></dd></div>
      </> : null}
    </dl>
    {!result ? <p role="status" className="mt-4 text-sm text-slate-500">Consultando controles y evidencias…</p> : result.error ? <div role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{result.error} <button type="button" className="font-semibold underline" onClick={onRetry}>Reintentar</button></div> : null}
    <div className="mt-4 flex justify-end border-t border-slate-100 pt-3"><button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-[#254d78] transition hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => onOpenDetail(obligation)} aria-label={`Ver detalle de ${obligation.title}`}>Ver detalle</button></div>
  </Card>;
}

export function ObligationChecklist({ obligations, onOpenDetail, revision }: {
  obligations: Obligation[]; onOpenDetail: (obligation: Obligation) => void; revision: number;
}) {
  const [limit, setLimit] = useState(CHECKLIST_PAGE_SIZE);
  const [results, setResults] = useState<Record<string, ChecklistResult>>({});
  const [retry, setRetry] = useState(0);
  const cache = useRef<Record<string, ChecklistResult>>({});
  const cacheRevision = useRef(revision);
  const allIds = JSON.stringify(obligations.map((item) => item.id));
  const visible = obligations.slice(0, limit);
  const ids = JSON.stringify(visible.map((item) => item.id));
  useEffect(() => { setLimit(CHECKLIST_PAGE_SIZE); }, [allIds]);
  useEffect(() => {
    let cancelled = false;
    if (cacheRevision.current !== revision) {
      cacheRevision.current = revision;
      cache.current = {};
      setResults({});
    }
    const missing = (JSON.parse(ids) as string[]).filter((id) => !cache.current[id]);
    void loadChecklistBatch(missing, (id, result) => {
      cache.current[id] = result;
      setResults((current) => ({ ...current, [id]: result }));
    }, () => cancelled);
    return () => { cancelled = true; };
  }, [ids, revision, retry]);
  if (!obligations.length) return <EmptyState title="No hay obligaciones que coincidan con los filtros actuales." description="Prueba ajustando la búsqueda, el estado, la materia o el responsable." />;
  return <section aria-label="Checklist de gestión ambiental" className="space-y-4">
    <p className="text-sm text-slate-500">Revisa responsables, acciones y respaldo documental. La evidencia no modifica automáticamente el estado de la obligación.</p>
    {visible.map((obligation) => <ChecklistRow key={obligation.id} obligation={obligation} result={cacheRevision.current === revision ? results[obligation.id] : undefined} onOpenDetail={onOpenDetail} onRetry={() => {
      delete cache.current[obligation.id];
      setResults((current) => { const next = { ...current }; delete next[obligation.id]; return next; });
      setRetry((value) => value + 1);
    }} />)}
    {limit < obligations.length ? <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-[#254d78] hover:bg-sky-50" onClick={() => setLimit((value) => value + CHECKLIST_PAGE_SIZE)}>Mostrar más obligaciones ({visible.length} de {obligations.length})</button> : null}
  </section>;
}
