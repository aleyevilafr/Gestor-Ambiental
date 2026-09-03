"use client";

import { useState } from "react";

export function ObligationAnalysisUpload({ disabled, onAnalyze }: { disabled: boolean; onAnalyze: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  const submit = () => {
    if (!file) {
      setError("Selecciona un documento PDF o TXT.");
      return;
    }
    if (!(file.type === "application/pdf" || file.type === "text/plain" || /\.(pdf|txt)$/i.test(file.name))) {
      setError("Solo se aceptan documentos PDF o TXT.");
      return;
    }
    setError("");
    onAnalyze(file);
  };

  return <div className="space-y-4"><div><h3 className="text-lg font-semibold text-slate-900">Selecciona un documento</h3><p className="mt-1 text-sm text-slate-600">La IA propondrá obligaciones respaldadas por el texto. Nada se creará sin tu revisión.</p></div><label className="block rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:border-sky-300 hover:bg-sky-50/50"><span className="block text-sm font-semibold text-slate-800">PDF o TXT</span><span className="mt-1 block text-xs text-slate-500">Máximo 5 MB. Los documentos no se almacenan.</span><input accept="application/pdf,text/plain,.pdf,.txt" className="sr-only" disabled={disabled} onChange={(event) => { setFile(event.target.files?.[0] ?? null); setError(""); }} type="file" /></label>{file ? <p className="text-sm text-slate-700">Seleccionado: <span className="font-medium">{file.name}</span></p> : null}{error ? <p className="text-sm text-red-700">{error}</p> : null}<button className="button-primary rounded-[10px] px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60" disabled={disabled} onClick={submit} type="button">Analizar documento</button></div>;
}
