import type { Obligation } from "@/lib/api";
import type { ObligationDetailDraft } from "./use-obligation-detail";

export function ObligationDetailDescription({ obligation, draft, change, editable, saving }: { obligation: Obligation; draft: ObligationDetailDraft; change: (field: "description", value: string) => void; editable: boolean; saving: boolean }) {
  return <section><h3 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Descripción</h3>{editable ? <textarea aria-label="Descripción" className="control-field mt-2 min-h-24 w-full resize-y rounded-[10px] border px-3 py-2 text-sm leading-6 outline-none" disabled={saving} onChange={(event) => change("description", event.target.value)} placeholder="Agregar descripción..." value={draft.description} /> : <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{obligation.description || "Sin descripción."}</p>}</section>;
}
