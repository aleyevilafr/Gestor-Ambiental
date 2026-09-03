import type { AuthenticatedUser, Obligation, OrganizationUser } from "@/lib/api";

import { ObligationDetailDescription } from "./obligation-detail-description";
import { ObligationDetailControls } from "./obligation-detail-controls";
import { ObligationDetailFields } from "./obligation-detail-fields";
import { ObligationDetailFutureSection } from "./obligation-detail-future-section";
import { ObligationDetailReference } from "./obligation-detail-reference";
import type { ObligationDetailDraft } from "./use-obligation-detail";

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ObligationDetailContent({
  obligation,
  users,
  user,
  draft,
  change,
  editable,
  saving,
}: {
  obligation: Obligation;
  users: OrganizationUser[];
  user: AuthenticatedUser | null;
  draft: ObligationDetailDraft;
  change: <K extends keyof ObligationDetailDraft>(field: K, value: ObligationDetailDraft[K]) => void;
  editable: boolean;
  saving: boolean;
}) {
  return (
    <div className="space-y-5 px-5 py-5 sm:px-6">
      {editable ? <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">Nombre de la obligación</span><input aria-label="Nombre de la obligación" className="control-field h-10 w-full rounded-[9px] border px-3 text-sm text-slate-800 outline-none" disabled={saving} onChange={(event) => change("title", event.target.value)} value={draft.title} /></label> : null}
      <ObligationDetailFields canAssign={user?.role === "ADMIN"} change={change} draft={draft} editable={editable} obligation={obligation} saving={saving} users={users} />
      <ObligationDetailDescription change={change} draft={draft} editable={editable} obligation={obligation} saving={saving} />
      <ObligationDetailReference change={change} draft={draft} editable={editable} obligation={obligation} saving={saving} />
      <ObligationDetailControls editable={editable} obligation={obligation} />
      <ObligationDetailFutureSection actionLabel="evidencia" description="No hay evidencias asociadas." title="Evidencias" />
      <section className="border-t border-slate-200/90 pt-4"><h3 className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400">Información del sistema</h3><div className="mt-2 grid gap-1.5 text-xs text-slate-500 sm:grid-cols-3"><span>Creado: {formatDateTime(obligation.created_at)}</span><span>Actualizado: {formatDateTime(obligation.updated_at)}</span><span>{obligation.is_active ? "Registro activo" : "Registro archivado"}</span></div></section>
    </div>
  );
}
