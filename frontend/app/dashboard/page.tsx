"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardGate } from "@/components/auth/dashboard-gate";
import { Card, PageHeader, StatusBadge } from "@/components/ui/surface";
import { KpiStrip } from "@/components/ui/kpi-strip";
import { getCurrentUser, getDashboardSummary, type AuthenticatedUser, type DashboardObligation, type DashboardSummary } from "@/lib/api";

const label = { COMPLIANT: "Cumplida", IN_PROGRESS: "En proceso", PENDING: "Pendiente", OVERDUE: "Vencida" };
const tone = { COMPLIANT: "success", IN_PROGRESS: "info", PENDING: "warning", OVERDUE: "danger" } as const;

function ObligationList({ items, empty }: { items: DashboardObligation[]; empty: string }) {
  return <div className="divide-y divide-slate-100">{items.length ? items.map((item) => <Link key={item.id} href={`/obligations/${item.id}`} className="flex items-center justify-between gap-4 py-4 transition hover:bg-slate-50"><span><b className="block text-[15px] text-[#111c30]">{item.title}</b><span className="mt-0.5 block text-sm text-slate-500">{item.matter}</span></span><span className="shrink-0 text-right"><StatusBadge tone={tone[item.compliance_status]}>{label[item.compliance_status]}</StatusBadge><small className="mt-1 block text-[13px] text-slate-500">{item.deadline ?? "Sin fecha"}</small></span></Link>) : <p className="py-6 text-[15px] text-slate-500">{empty}</p>}</div>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([getDashboardSummary(), getCurrentUser()]).then(([loadedSummary, loadedUser]) => { setSummary(loadedSummary); setUser(loadedUser); }).catch(() => setError("No fue posible cargar el dashboard.")); }, []);

  const hasObligations = Boolean(summary && summary.total_obligations > 0);
  return <DashboardGate><div className="space-y-8"><PageHeader title="Dashboard" description="Estado general del cumplimiento ambiental de tu organización." action={user?.role === "ADMIN" && hasObligations ? <Link className="inline-flex h-12 items-center justify-center rounded-lg bg-[#111c30] px-4 text-sm font-semibold text-white transition hover:bg-[#1a2943] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20" href="/obligations/new">Crear obligación</Link> : undefined} />
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700" role="alert">{error}</p>}
    {!summary && !error && <Card className="p-8 text-[15px] text-slate-500" role="status">Cargando resumen…</Card>}
    {summary && (summary.total_obligations === 0 ? <section className="max-w-2xl"><div className="flex items-center gap-8 border-y border-slate-200 py-5"><div><p className="text-3xl font-semibold text-[#111c30]">0</p><p className="mt-1 text-sm text-slate-500">Obligaciones</p></div><div className="h-10 w-px bg-slate-200" aria-hidden="true" /><div><p className="text-3xl font-semibold text-[#111c30]">—</p><p className="mt-1 text-sm text-slate-500">Cumplimiento</p></div></div><div className="pt-8"><h2 className="text-xl font-semibold text-[#111c30]">Comienza a gestionar tu cumplimiento</h2><p className="mt-2 max-w-xl text-[15px] leading-6 text-slate-600">Registra tu primera obligación ambiental para comenzar a asignar responsables, controles y evidencias.</p>{user?.role === "ADMIN" && <Link className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-[#111c30] px-4 text-sm font-semibold text-white transition hover:bg-[#1a2943] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20" href="/obligations/new">Crear primera obligación</Link>}</div></section> : <><KpiStrip metrics={[{ label: "Total", value: summary.total_obligations }, { label: "Cumplidas", value: summary.compliant, tone: "success" }, { label: "En proceso", value: summary.in_progress, tone: "info" }, { label: "Pendientes", value: summary.pending, tone: "warning" }, { label: "Vencidas", value: summary.overdue, tone: "danger" }]} />
      <Card className="max-w-2xl p-5"><p className="text-sm font-medium text-slate-500">Cumplimiento general</p><div className="mt-2 flex items-baseline gap-3"><b className="text-4xl text-[#111c30]">{summary.compliance_percentage}%</b><span className="text-sm text-slate-500">{summary.compliant} de {summary.total_obligations} obligaciones cumplidas</span></div><div className="mt-4 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-emerald-600" style={{ width: `${summary.compliance_percentage}%` }} /></div></Card>
      <div className="grid gap-6 lg:grid-cols-2"><Card className="p-5"><h2 className="text-lg font-semibold text-[#111c30]">Requieren atención</h2><ObligationList items={summary.attention_obligations} empty="No hay obligaciones que requieran atención." /></Card><Card className="p-5"><h2 className="text-lg font-semibold text-[#111c30]">Próximos vencimientos</h2><ObligationList items={summary.upcoming_obligations} empty="No hay próximos vencimientos." /></Card></div>
    </>)}
  </div></DashboardGate>;
}
