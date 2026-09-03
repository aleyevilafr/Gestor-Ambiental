import type { Obligation } from "@/lib/api";
import type { ObligationDetailDraft } from "./use-obligation-detail";

const inputClass = "control-field mt-1.5 h-10 w-full rounded-[9px] border px-3 text-sm text-slate-800 outline-none";
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}{children}</label>; }

export function ObligationDetailReference({ obligation, draft, change, editable, saving }: { obligation: Obligation; draft: ObligationDetailDraft; change: <K extends "matter" | "regulatory_source" | "article">(field: K, value: ObligationDetailDraft[K]) => void; editable: boolean; saving: boolean }) {
  const value = (field: "matter" | "regulatory_source" | "article", fallback: string) => editable ? <input aria-label={field} className={inputClass} disabled={saving} onChange={(event) => change(field, event.target.value)} value={draft[field]} /> : <p className="mt-1.5 text-sm font-medium normal-case tracking-normal text-slate-700">{fallback}</p>;
  return <section className="border-t border-slate-200/90 pt-5"><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Referencia normativa</h3><div className="mt-3 grid gap-x-4 gap-y-3 sm:grid-cols-2"><Field label="Materia">{value("matter", obligation.matter)}</Field><Field label="Fuente normativa">{value("regulatory_source", obligation.regulatory_source)}</Field><Field label="Artículo o referencia">{value("article", obligation.article ?? "No informado")}</Field></div></section>;
}
