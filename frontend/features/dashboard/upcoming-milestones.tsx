import Link from "next/link";
import { Card, StatusBadge } from "@/components/ui/surface";
import type { DashboardObligation } from "@/lib/api";

const labels = { COMPLIANT: "Cumplida", IN_PROGRESS: "En proceso", PENDING: "Pendiente", OVERDUE: "Vencida" };
const tones = { COMPLIANT: "success", IN_PROGRESS: "info", PENDING: "warning", OVERDUE: "danger" } as const;

function deadlineMeta(deadline: string | null) {
  if (!deadline) return { label: "Sin fecha", className: "text-slate-500" };
  const date = new Date(`${deadline}T00:00:00`); const today = new Date(); today.setHours(0, 0, 0, 0);
  const days = Math.ceil((date.getTime() - today.getTime()) / 86400000);
  if (days < 0) return { label: "Vencida", className: "text-red-700" };
  if (days <= 7) return { label: days === 0 ? "Hoy" : `En ${days} días`, className: "text-amber-800" };
  if (days <= 30) return { label: `En ${days} días`, className: "text-sky-700" };
  return { label: "Posterior", className: "text-slate-500" };
}

export function UpcomingMilestones({ items }: { items: DashboardObligation[] }) {
  return <Card className="dashboard-panel bg-[var(--surface)] p-4 sm:p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#111c30]">Hitos y próximos vencimientos</h2><p className="mt-0.5 text-sm text-slate-500">Agenda operativa ordenada por fecha límite.</p></div><Link href="/obligations" className="text-sm font-medium text-[#172033] underline-offset-4 transition hover:text-[#4f86b7] hover:underline">Ir a obligaciones</Link></div><div className="mt-2.5 divide-y divide-slate-200/70">{items.slice(0, 5).length ? items.slice(0, 5).map((item) => { const meta = deadlineMeta(item.deadline); return <Link key={item.id} href={`/obligations/${item.id}`} className="-mx-2 flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition duration-200 hover:bg-[var(--surface-cool)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111c30]/30"><span className="min-w-0"><b className="block truncate text-sm text-[#111c30]">{item.title}</b><span className="mt-0.5 block truncate text-xs text-slate-500">{item.matter ?? "Sin materia"} · {item.responsible_name ?? "Sin responsable"}</span></span><span className="shrink-0 text-right"><small className={`block text-xs font-semibold ${meta.className}`}>{meta.label}</small><span className="mt-0.5 flex items-center justify-end gap-1.5"><StatusBadge tone={tones[item.compliance_status]}>{labels[item.compliance_status]}</StatusBadge><small className="text-xs text-slate-500">{item.deadline ?? "—"}</small></span></span></Link>; }) : <p className="py-5 text-sm text-slate-500">No hay próximos vencimientos.</p>}</div></Card>;
}
