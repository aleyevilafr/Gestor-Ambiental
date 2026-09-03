import type { Obligation } from "@/lib/api";

import { ObligationBoardColumn } from "./obligation-board-column";

const columns = [
  ["PENDING", "Pendientes", "border-amber-300", "bg-amber-500", "bg-amber-50 text-amber-800"],
  ["IN_PROGRESS", "En proceso", "border-sky-300", "bg-sky-500", "bg-sky-50 text-sky-800"],
  ["COMPLIANT", "Cumplidas", "border-emerald-300", "bg-emerald-500", "bg-emerald-50 text-emerald-800"],
  ["OVERDUE", "Vencidas", "border-red-300", "bg-red-500", "bg-red-50 text-red-800"],
] as const;

export function ObligationBoard({
  obligations,
  onOpenObligation,
}: {
  obligations: Obligation[];
  onOpenObligation: (obligation: Obligation) => void;
}) {
  return (
    <section aria-label="Planner de obligaciones" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {columns.map(([status, title, accentClass, dotClass, countClass]) => (
        <ObligationBoardColumn
          accentClass={accentClass}
          countClass={countClass}
          dotClass={dotClass}
          items={obligations.filter((obligation) => obligation.compliance_status === status)}
          key={status}
          onOpenObligation={onOpenObligation}
          title={title}
        />
      ))}
    </section>
  );
}
