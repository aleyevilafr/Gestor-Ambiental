"use client";

import { useEffect, useState } from "react";
import { DashboardGate } from "@/components/auth/dashboard-gate";
import { Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { analyzeDocument, getCurrentUser, type OrganizationProposal } from "@/lib/api";

const MAX_DOCUMENT_LENGTH = 20_000;

export default function DocumentAnalysisPage() {
  const [text, setText] = useState("");
  const [proposal, setProposal] = useState<OrganizationProposal | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => { getCurrentUser().then((user) => setAllowed(user.role === "ADMIN")).catch(() => setAllowed(false)); }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try { setProposal(await analyzeDocument(text)); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible analizar el documento."); }
    finally { setLoading(false); }
  }

  return <DashboardGate>{allowed === false ? <EmptyState title="Acceso restringido" description="Solo los administradores pueden analizar documentos." /> : <div className="mx-auto max-w-4xl space-y-8">
    <PageHeader title="Completar datos desde un documento" description="Obtén una propuesta de información a partir del contenido de un documento. Revisa los datos antes de utilizarlos." />
    <Card className="p-5 sm:p-6"><h2 className="font-semibold text-[#111c30]">Contenido del documento</h2><p className="mt-1 text-sm text-slate-500">Pega solo el contenido necesario. No se guarda automáticamente.</p><form onSubmit={submit} className="mt-6"><label htmlFor="document-content" className="sr-only">Contenido del documento</label><textarea id="document-content" required maxLength={MAX_DOCUMENT_LENGTH} value={text} onChange={(event) => setText(event.target.value)} className="min-h-64 w-full rounded-lg border border-slate-300 bg-white p-3 text-[15px] text-slate-950 outline-none transition placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-slate-900 focus-visible:ring-4 focus-visible:ring-slate-900/10" placeholder="Pega aquí el texto del documento que deseas analizar..." /><div className="mt-2 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-slate-500">{text.length.toLocaleString("es-CL")} / {MAX_DOCUMENT_LENGTH.toLocaleString("es-CL")} caracteres</p><div className="w-full sm:w-auto"><PrimaryButton type="submit" className="sm:w-auto" isLoading={loading} loadingLabel="Analizando…">Analizar documento</PrimaryButton></div></div></form></Card>
    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>}
    {proposal && <Card className="p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="font-semibold text-[#111c30]">Propuesta generada</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Los datos son una propuesta generada automáticamente y deben ser revisados antes de utilizarlos.</p></div></div><div className="mt-6 grid gap-5 sm:grid-cols-2"><TextField id="proposal-organization" label="Nombre organización" defaultValue={proposal.organization_name ?? ""} /><TextField id="proposal-rut" label="RUT" defaultValue={proposal.rut ?? ""} /><div className="sm:col-span-2"><label htmlFor="proposal-activity" className="mb-2 block text-sm font-medium text-slate-800">Descripción de actividad</label><textarea id="proposal-activity" defaultValue={proposal.activity_description ?? ""} className="min-h-28 w-full rounded-lg border border-slate-300 bg-white p-3 text-[15px] text-slate-950 outline-none transition hover:border-slate-400 focus-visible:border-slate-900 focus-visible:ring-4 focus-visible:ring-slate-900/10" /></div></div>{proposal.warnings.length > 0 && <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"><p className="text-sm font-medium text-amber-900">Advertencias</p><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-800">{proposal.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></div>}<div className="mt-6 border-t border-slate-200 pt-5"><button type="button" onClick={() => setProposal(null)} className="text-sm font-medium text-slate-700 underline-offset-4 hover:text-slate-950 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">Descartar</button></div></Card>}
  </div>}</DashboardGate>;
}
