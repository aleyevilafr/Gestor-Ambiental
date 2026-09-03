import { StatusBadge } from "@/components/ui/surface";
import type { Obligation } from "@/lib/api";

const labels = { PENDING: "Pendiente", IN_PROGRESS: "En proceso", COMPLIANT: "Cumplida", OVERDUE: "Vencida" };
const tones = { PENDING: "warning", IN_PROGRESS: "info", COMPLIANT: "success", OVERDUE: "danger" } as const;

export function ObligationDetailHeader({ obligation, onClose, closeButtonRef }: { obligation: Obligation; onClose: () => void; closeButtonRef: React.RefObject<HTMLButtonElement | null> }) {
  return <header className="flex items-start justify-between gap-4 border-b border-slate-200/90 px-5 py-4 sm:px-6"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-semibold tracking-tight text-[#111c30] sm:text-[22px]" id="obligation-detail-title">{obligation.title}</h2><StatusBadge tone={tones[obligation.compliance_status]}>{labels[obligation.compliance_status]}</StatusBadge></div><p className="mt-1 truncate text-sm text-slate-500">{obligation.matter} · {obligation.regulatory_source}</p></div><button aria-label="Cerrar detalle" className="grid size-8 shrink-0 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#111c30] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111c30]/30" onClick={onClose} ref={closeButtonRef} type="button"><span aria-hidden="true" className="text-xl leading-none">×</span></button></header>;
}
