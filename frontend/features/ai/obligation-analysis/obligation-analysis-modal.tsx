"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { Obligation } from "@/lib/api";

import { ObligationAnalysisResults } from "./obligation-analysis-results";
import { ObligationAnalysisUpload } from "./obligation-analysis-upload";
import { useObligationAnalysis } from "./use-obligation-analysis";

export function ObligationAnalysisModal({ existingTitles, onClose, onCreated }: { existingTitles: string[]; onClose: () => void; onCreated: (obligations: Obligation[]) => void }) {
  const [mounted, setMounted] = useState(false);
  const { analyze, documentName, error, incorporate, phase, proposals, reset, toggleProposal, updateProposal, warnings } = useObligationAnalysis(existingTitles, onCreated);
  const busy = phase === "analyzing" || phase === "creating";
  const close = () => { if (!busy) onClose(); };

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", escape);
    };
  }, [busy, onClose]);
  if (!mounted) return null;

  const showResults = phase === "success" || phase === "creating";

  return createPortal(<div className="fixed inset-0 z-[9999] flex items-center justify-center p-4"><button aria-label="Cerrar análisis de documento" className="absolute inset-0 bg-slate-950/50" disabled={busy} onClick={close} type="button"/><section aria-labelledby="obligation-analysis-title" aria-modal="true" className="relative z-[10000] max-h-[88vh] w-full max-w-[920px] overflow-y-auto rounded-2xl bg-white shadow-2xl" role="dialog"><header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-6"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#254d78]">Asistente IA</p><h2 className="mt-1 text-xl font-semibold text-slate-900" id="obligation-analysis-title">Analizar documento para obligaciones</h2><p className="mt-1 text-sm text-slate-600">Las propuestas requieren validación humana antes de crear obligaciones.</p></div><button aria-label="Cerrar" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50" disabled={busy} onClick={close} type="button">×</button></header><div className="p-5 sm:p-6">{phase === "analyzing" ? <div className="py-12 text-center"><div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-200 border-t-[#254d78]"/><h3 className="mt-4 text-lg font-semibold text-slate-900">Analizando documento…</h3><p className="mt-1 text-sm text-slate-600">Estamos extrayendo propuestas estructuradas. Esto puede tardar unos segundos.</p></div> : showResults ? <><p className="mb-4 text-xs text-slate-500">Documento: {documentName}</p><ObligationAnalysisResults creating={phase === "creating"} error={error} onChange={updateProposal} onIncorporate={() => void incorporate()} onToggle={toggleProposal} proposals={proposals} warnings={warnings}/></> : <><ObligationAnalysisUpload disabled={busy} onAnalyze={(file) => void analyze(file)} />{error ? <div className="mt-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm text-red-700"><p>{error}</p><button className="mt-2 font-semibold underline" onClick={reset} type="button">Reintentar</button></div> : null}</>}</div></section></div>, document.body);
}
