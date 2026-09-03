import type { Obligation } from "@/lib/api";

import { deadlineSignal, formatDeadline } from "../table/obligation-table.utils";

export function ObligationBoardCard({ obligation, onOpen }: { obligation: Obligation; onOpen: () => void }) {
  const deadline = deadlineSignal(obligation);
  const responsible = obligation.responsible_user?.name ?? "Sin responsable";

  return (
    <button
      className="group w-full cursor-pointer rounded-xl border border-slate-200 bg-white p-4 text-left shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,background-color] duration-200 hover:border-slate-300 hover:bg-slate-50/40 hover:shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111c30]/30"
      onClick={onOpen}
      type="button"
    >
      <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{obligation.matter}</span>
      <span className="mt-2.5 line-clamp-3 block text-sm font-semibold leading-5 text-[#172033] group-hover:text-[#254d78]">{obligation.title}</span>
      <span className={`mt-3 block truncate text-xs ${obligation.responsible_user_id ? "text-slate-500" : "font-medium text-amber-700"}`}>{responsible}</span>
      <span className="mt-2 block text-xs text-slate-600">{formatDeadline(obligation.deadline)}</span>
      {deadline.label ? <span className={`mt-1 block text-xs font-medium ${deadline.kind === "overdue" ? "text-red-700" : "text-amber-700"}`}>{deadline.label}</span> : null}
    </button>
  );
}
