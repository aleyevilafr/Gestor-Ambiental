import { StatusBadge } from "@/components/ui/surface";
import type { Obligation, OrganizationUser } from "@/lib/api";

const labels = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  COMPLIANT: "Cumplida",
  OVERDUE: "Vencida",
};

const tones = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLIANT: "success",
  OVERDUE: "danger",
} as const;

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(`${value}T00:00:00`)) : "Sin fecha";
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CL", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm leading-6 text-slate-700">{children}</dd>
    </div>
  );
}

export function ObligationDetailContent({
  obligation,
  users,
}: {
  obligation: Obligation;
  users: OrganizationUser[];
}) {
  const responsible =
    obligation.responsible_user?.name ??
    users.find((user) => user.id === obligation.responsible_user_id)?.name ??
    "Sin responsable";

  return (
    <div className="space-y-7 px-5 py-6 sm:px-7">
      <section className="grid gap-5 border-b border-slate-200 pb-6 sm:grid-cols-2">
        <Detail label="Estado">
          <StatusBadge tone={tones[obligation.compliance_status]}>
            {labels[obligation.compliance_status]}
          </StatusBadge>
        </Detail>
        <Detail label="Responsable">{responsible}</Detail>
      </section>

      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Descripción</h3>
        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
          {obligation.description ?? "Sin descripción."}
        </p>
      </section>

      <section className="grid gap-5 sm:grid-cols-2">
        <Detail label="Materia">{obligation.matter}</Detail>
        <Detail label="Fecha límite">{formatDate(obligation.deadline)}</Detail>
        <Detail label="Frecuencia">{obligation.frequency ?? "No definida"}</Detail>
        <Detail label="Estado del registro">{obligation.is_active ? "Activo" : "Archivado"}</Detail>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Referencia normativa</h3>
        <dl className="mt-3 grid gap-5 sm:grid-cols-2">
          <Detail label="Fuente normativa">{obligation.regulatory_source}</Detail>
          <Detail label="Artículo o referencia">{obligation.article ?? "No informado"}</Detail>
        </dl>
      </section>

      <section className="border-t border-slate-200 pt-6">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Información del sistema</h3>
        <dl className="mt-3 grid gap-5 sm:grid-cols-2">
          <Detail label="Creado">{formatDateTime(obligation.created_at)}</Detail>
          <Detail label="Última actualización">{formatDateTime(obligation.updated_at)}</Detail>
        </dl>
      </section>
    </div>
  );
}
