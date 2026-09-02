import { useMemo, useState } from "react";

import type { AuthenticatedUser, Obligation, OrganizationUser } from "@/lib/api";

import { ObligationTableRow } from "./obligation-table-row";

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
  const eligibleUsers = useMemo(
    () =>
      users.filter(
        (candidate) =>
          candidate.is_active &&
          (candidate.role === "ADMIN" || candidate.role === "RESPONSIBLE"),
      ),
    [users],
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-[900px] w-full text-left text-sm">
        <thead className="border-b bg-[var(--surface-muted)] text-slate-600 [border-color:var(--border-subtle)]">
          <tr>
            {[
              "Obligación",
              "Materia",
              "Estado",
              "Responsable",
              "Fecha límite",
              "Fuente normativa",
              "Acciones",
            ].map((heading) => (
              <th className="px-5 py-4 font-semibold" key={heading} scope="col">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((obligation) => (
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
