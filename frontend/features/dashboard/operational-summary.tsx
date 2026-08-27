import { Card } from "@/components/ui/surface";
import type { DashboardSummary } from "@/lib/api";

export function OperationalSummary({ summary }: { summary: DashboardSummary }) {
  const segments = [
    { label: "Cumplidas", value: summary.compliant, color: "bg-emerald-500", text: "text-emerald-800" },
    { label: "En proceso", value: summary.in_progress, color: "bg-sky-500", text: "text-sky-800" },
    { label: "Pendientes", value: summary.pending, color: "bg-amber-400", text: "text-amber-800" },
    { label: "Vencidas", value: summary.overdue, color: "bg-red-400", text: "text-red-800" },
  ];
  return <Card className="dashboard-panel bg-[var(--surface-cool)] p-4 sm:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#111c30]">Estado de cumplimiento</h2><p className="mt-0.5 text-sm text-slate-500">Distribución actual de las obligaciones activas.</p></div><span className="rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs font-medium text-slate-600">{summary.active} activas</span></div><div className="mt-4 grid gap-4 md:grid-cols-[auto_minmax(0,1fr)] md:items-center"><div><p className="text-5xl font-semibold leading-none tracking-tight text-[#132544]">{summary.compliance_percentage}%</p><p className="mt-1.5 text-sm text-slate-600">{summary.compliant} de {summary.total_obligations} obligaciones cumplidas</p></div><div><div className="flex h-3.5 overflow-hidden rounded-full bg-slate-200/80 shadow-inner">{segments.map((segment) => <i key={segment.label} className={segment.color} style={{ width: `${segment.value * 100 / summary.total_obligations}%` }} />)}</div><div className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4 sm:divide-x sm:divide-slate-200/80">{segments.map((segment, index) => <p key={segment.label} className={index === 0 ? "sm:pr-4" : index === segments.length - 1 ? "sm:pl-4" : "sm:px-4"}><span className="block text-xs text-slate-500">{segment.label}</span><b className={`text-base ${segment.text}`}>{segment.value}</b></p>)}</div></div></div></Card>;
}
