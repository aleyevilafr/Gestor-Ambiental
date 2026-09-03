import { useMemo, useState } from "react";

import type { AuthenticatedUser, Obligation, OrganizationUser } from "@/lib/api";

import { ObligationTableRow } from "./obligation-table-row";
import { compareOperationally, deadlineSortValue, statusLabels } from "./obligation-table.utils";

type SortKey = "operational" | "title" | "compliance_status" | "responsible" | "deadline";
type Direction = "ascending" | "descending";

export function ObligationTable({
  items,
  user,
  users,
  onUpdated,
  onOpenDetail,
}: {
  items: Obligation[];
  user: AuthenticatedUser | null;
  users: OrganizationUser[];
  onUpdated: (obligation: Obligation) => void;
  onOpenDetail: (obligation: Obligation) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [sort, setSort] = useState<{ key: SortKey; direction: Direction }>({ key: "operational", direction: "ascending" });
  const eligibleUsers = useMemo(
    () =>
      users.filter(
        (candidate) =>
          candidate.is_active &&
          (candidate.role === "ADMIN" || candidate.role === "RESPONSIBLE"),
      ),
    [users],
  );
  const orderedItems = useMemo(() => [...items].sort((left, right) => {
    let result = 0;
    if (sort.key === "operational") result = compareOperationally(left, right);
    if (sort.key === "title") result = left.title.localeCompare(right.title, "es");
    if (sort.key === "compliance_status") result = statusLabels[left.compliance_status].localeCompare(statusLabels[right.compliance_status], "es");
    if (sort.key === "responsible") result = (left.responsible_user?.name ?? "Sin responsable").localeCompare(right.responsible_user?.name ?? "Sin responsable", "es");
    if (sort.key === "deadline") result = deadlineSortValue(left.deadline) - deadlineSortValue(right.deadline);
    return sort.direction === "ascending" ? result : -result;
  }), [items, sort]);
  const setSortKey = (key: Exclude<SortKey, "operational">) => setSort((current) => ({
    key,
    direction: current.key === key && current.direction === "ascending" ? "descending" : "ascending",
  }));
  const sortLabel = (key: Exclude<SortKey, "operational">) => sort.key === key ? (sort.direction === "ascending" ? " ↑" : " ↓") : " ↕";

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full text-left text-sm">
        <thead className="sticky top-0 z-10 border-b bg-[var(--surface-muted)] text-slate-600 [border-color:var(--border-subtle)]">
          <tr>
            <SortHeader label="Obligación" onClick={() => setSortKey("title")} sortLabel={sortLabel("title")} />
            <th className="px-5 py-4 font-semibold" scope="col">Materia</th>
            <SortHeader label="Estado" onClick={() => setSortKey("compliance_status")} sortLabel={sortLabel("compliance_status")} />
            <SortHeader label="Responsable" onClick={() => setSortKey("responsible")} sortLabel={sortLabel("responsible")} />
            <SortHeader label="Fecha límite" onClick={() => setSortKey("deadline")} sortLabel={sortLabel("deadline")} />
            <th className="px-5 py-4 font-semibold" scope="col">Fuente normativa</th>
            <th className="px-5 py-4 font-semibold" scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {orderedItems.map((obligation) => (
            <ObligationTableRow
              editing={editingId === obligation.id}
              key={obligation.id}
              obligation={obligation}
              onEdit={() => setEditingId(obligation.id)}
              onFinished={() => setEditingId(null)}
              onOpenDetail={onOpenDetail}
              onUpdated={onUpdated}
              user={user}
              users={eligibleUsers}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({ label, onClick, sortLabel }: { label: string; onClick: () => void; sortLabel: string }) {
  return <th className="px-5 py-4 font-semibold" scope="col"><button className="-m-1 rounded px-1 py-1 text-left transition hover:bg-slate-200/70 hover:text-[#111c30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111c30]/30" onClick={onClick} type="button">{label}<span aria-hidden="true" className="ml-1 text-xs text-slate-400">{sortLabel}</span></button></th>;
}
