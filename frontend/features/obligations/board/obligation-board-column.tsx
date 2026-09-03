import type { Obligation } from "@/lib/api";

import { ObligationBoardCard } from "./obligation-board-card";

export function ObligationBoardColumn({
  title,
  items,
  accentClass,
  dotClass,
  countClass,
  onOpenObligation,
}: {
  title: string;
  items: Obligation[];
  accentClass: string;
  dotClass: string;
  countClass: string;
  onOpenObligation: (obligation: Obligation) => void;
}) {
  return (
    <section className={`min-h-[224px] rounded-[18px] border border-slate-200 border-t-2 ${accentClass} bg-slate-50/80 p-3.5 sm:p-4`}>
      <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#172033]"><span aria-hidden="true" className={`size-2 rounded-full ${dotClass}`} />{title}</h2>
        <span className={`grid min-w-6 place-items-center rounded-full px-2 py-0.5 text-xs font-semibold ${countClass}`}>{items.length}</span>
      </header>
      <div className="mt-3 space-y-3">
        {items.length ? items.map((obligation) => (
          <ObligationBoardCard key={obligation.id} obligation={obligation} onOpen={() => onOpenObligation(obligation)} />
        )) : <p className="rounded-xl border border-dashed border-slate-200 bg-white/55 px-3 py-5 text-center text-sm text-slate-500">No hay obligaciones</p>}
      </div>
    </section>
  );
}
