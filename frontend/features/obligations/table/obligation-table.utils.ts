import type { Obligation } from "@/lib/api";

export const statusLabels = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  COMPLIANT: "Cumplida",
  OVERDUE: "Vencida",
} as const;

const DAY = 24 * 60 * 60 * 1000;

function atMidnight(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function deadlineDate(deadline: string | null) {
  return deadline ? new Date(`${deadline}T00:00:00`) : null;
}

export function formatDeadline(deadline: string | null) {
  return deadline
    ? new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(deadlineDate(deadline)!)
    : "Sin fecha";
}

export function deadlineSignal(obligation: Obligation, now = new Date()) {
  const deadline = deadlineDate(obligation.deadline);
  if (!deadline || obligation.compliance_status === "COMPLIANT") {
    return { kind: "none" as const, label: null };
  }

  const difference = Math.round((deadline.getTime() - atMidnight(now).getTime()) / DAY);
  if (difference < 0) {
    const days = Math.abs(difference);
    return { kind: "overdue" as const, label: `Vencida hace ${days} ${days === 1 ? "día" : "días"}` };
  }
  if (difference <= 30) {
    return {
      kind: "due-soon" as const,
      label: difference === 0 ? "Vence hoy" : `Vence en ${difference} ${difference === 1 ? "día" : "días"}`,
    };
  }
  return { kind: "none" as const, label: null };
}

export function requiresAttention(obligation: Obligation) {
  const signal = deadlineSignal(obligation);
  return signal.kind !== "none" || !obligation.responsible_user_id;
}

export function attentionRank(obligation: Obligation) {
  const signal = deadlineSignal(obligation);
  if (signal.kind === "overdue") return 0;
  if (signal.kind === "due-soon") return 1;
  if (!obligation.responsible_user_id) return 2;
  if (obligation.compliance_status === "PENDING" || obligation.compliance_status === "IN_PROGRESS") return 3;
  return 4;
}

export function deadlineSortValue(deadline: string | null) {
  return deadlineDate(deadline)?.getTime() ?? Number.POSITIVE_INFINITY;
}

export function compareOperationally(left: Obligation, right: Obligation) {
  const rankDifference = attentionRank(left) - attentionRank(right);
  if (rankDifference !== 0) return rankDifference;
  return deadlineSortValue(left.deadline) - deadlineSortValue(right.deadline);
}
