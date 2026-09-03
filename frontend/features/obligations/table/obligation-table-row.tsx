import { StatusBadge } from "@/components/ui/surface";
import type { AuthenticatedUser, Obligation, OrganizationUser } from "@/lib/api";

import { useObligationRowEdit } from "./use-obligation-row-edit";
import { deadlineSignal, formatDeadline } from "./obligation-table.utils";

const labels = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  COMPLIANT: "Cumplida",
  OVERDUE: "Vencida",
};

const tone = {
  PENDING: "warning",
  IN_PROGRESS: "info",
  COMPLIANT: "success",
  OVERDUE: "danger",
} as const;

const statuses = ["PENDING", "IN_PROGRESS", "COMPLIANT", "OVERDUE"] as const;

export function ObligationTableRow({
  obligation,
  user,
  users,
  editing,
  onEdit,
  onFinished,
  onUpdated,
  onOpenDetail,
}: {
  obligation: Obligation;
  user: AuthenticatedUser | null;
  users: OrganizationUser[];
  editing: boolean;
  onEdit: () => void;
  onFinished: () => void;
  onUpdated: (obligation: Obligation) => void;
  onOpenDetail: (obligation: Obligation) => void;
}) {
  const canEdit = Boolean(
    user &&
      (user.role === "ADMIN" ||
        (user.role === "RESPONSIBLE" && obligation.responsible_user_id === user.id)),
  );
  const canAssign = user?.role === "ADMIN";
  const { cancel, change, draft, error, save, saving } = useObligationRowEdit({
    obligation,
    canAssign,
    editing,
    onFinished,
    onUpdated,
  });
  const deadline = deadlineSignal(obligation);
  const needsAttention = deadline.kind !== "none" || !obligation.responsible_user_id;

  return (
    <tr
      className={`border-b border-slate-100 transition-colors duration-200 ${
        editing ? "bg-[#f2f7fc]" : "hover:bg-[var(--surface-cool)]"
      }`}
    >
      <td className={`border-l-[3px] px-5 py-4 font-semibold text-[#111c30] ${deadline.kind === "overdue" ? "border-red-300" : deadline.kind === "due-soon" ? "border-amber-300" : !obligation.responsible_user_id && needsAttention ? "border-violet-300" : "border-transparent"}`}>
        {editing ? (
          <input
            aria-label={`Nombre de ${obligation.title}`}
            className="control-field h-10 w-full min-w-[180px] rounded-[8px] border px-3 text-sm outline-none"
            disabled={saving}
            onChange={(event) => change("title", event.target.value)}
            value={draft.title}
          />
        ) : (
          <button
            className="text-left transition hover:text-[#254d78] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111c30]/30"
            onClick={() => onOpenDetail(obligation)}
            type="button"
          >
            {obligation.title}
          </button>
        )}
      </td>
      <td className="px-5 py-4 text-slate-700"><span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{obligation.matter}</span></td>
      <td className="px-5 py-4">
        {editing ? (
          <select
            aria-label={`Estado de ${obligation.title}`}
            className="control-field h-10 min-w-[132px] rounded-[8px] border px-3 text-sm outline-none"
            disabled={saving}
            onChange={(event) =>
              change("compliance_status", event.target.value as Obligation["compliance_status"])
            }
            value={draft.compliance_status}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {labels[status]}
              </option>
            ))}
          </select>
        ) : (
          <StatusBadge tone={tone[obligation.compliance_status]}>
            {labels[obligation.compliance_status]}
          </StatusBadge>
        )}
      </td>
      <td className="px-5 py-4 text-slate-700">
        {editing && canAssign ? (
          <select
            aria-label={`Responsable de ${obligation.title}`}
            className="control-field h-10 min-w-[160px] rounded-[8px] border px-3 text-sm outline-none"
            disabled={saving}
            onChange={(event) => change("responsible_user_id", event.target.value || null)}
            value={draft.responsible_user_id ?? ""}
          >
            <option value="">Sin responsable</option>
            {users.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {candidate.name}
              </option>
            ))}
          </select>
        ) : (
          obligation.responsible_user?.name ?? <span className="font-medium text-violet-700">Sin responsable</span>
        )}
      </td>
      <td className="px-5 py-4 text-slate-700">
        {editing ? (
          <input
            aria-label={`Fecha límite de ${obligation.title}`}
            className="control-field h-10 min-w-[142px] rounded-[8px] border px-3 text-sm outline-none"
            disabled={saving}
            onChange={(event) => change("deadline", event.target.value)}
            type="date"
            value={draft.deadline}
          />
        ) : (
          <div><span>{formatDeadline(obligation.deadline)}</span>{deadline.label ? <small className={`mt-1 block text-xs font-medium ${deadline.kind === "overdue" ? "text-red-700" : "text-amber-700"}`}>{deadline.label}</small> : null}</div>
        )}
      </td>
      <td className="max-w-[240px] truncate px-5 py-4 text-slate-700">
        {obligation.regulatory_source}
      </td>
      <td className="px-5 py-4">
        {editing ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              className="font-semibold text-[#254d78] transition hover:text-[#111c30] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              onClick={() => void save()}
              type="button"
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
            <button
              className="font-medium text-slate-600 transition hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              onClick={cancel}
              type="button"
            >
              Cancelar
            </button>
            {error ? <p className="basis-full text-xs text-red-700">{error}</p> : null}
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              className="font-semibold text-[#254d78] transition hover:text-[#111c30] hover:underline"
              onClick={() => onOpenDetail(obligation)}
              type="button"
            >
              Ver
            </button>
            {canEdit ? (
              <button
                className="font-semibold text-[#254d78] transition hover:text-[#111c30] hover:underline"
                onClick={onEdit}
                type="button"
              >
                Editar
              </button>
            ) : null}
          </div>
        )}
      </td>
    </tr>
  );
}
