"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardGate } from "@/components/auth/dashboard-gate";
import { Card, MetricCard, PageHeader, StatusBadge } from "@/components/ui/surface";
import { getCurrentUser, getDashboardSummary, type AuthenticatedUser, type DashboardObligation, type DashboardSummary } from "@/lib/api";

const label = { COMPLIANT: "Cumplida", IN_PROGRESS: "En proceso", PENDING: "Pendiente", OVERDUE: "Vencida" };
const tone = { COMPLIANT: "success", IN_PROGRESS: "info", PENDING: "warning", OVERDUE: "danger" } as const;

function ObligationList({ items, empty }: { items: DashboardObligation[]; empty: string }) {
  return <div className="divide-y divide-slate-100">{items.length ? items.map((item) => <Link key={item.id} href={`/obligations/${item.id}`} className="flex items-center justify-between gap-4 py-4 transition hover:bg-slate-50"><span><b className="block text-[15px] text-[#111c30]">{item.title}</b><span className="text-sm text-slate-500">{item.matter}</span></span><span className="text-right"><StatusBadge tone={tone[item.compliance_status]}>{label[item.compliance_status]}</StatusBadge><small className="mt-1 block text-[13px] text-slate-500">{item.deadline ?? "Sin fecha"}</small></span></Link>) : <p className="py-6 text-[15px] text-slate-500">{empty}</p>}</div>;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { Promise.all([getDashboardSummary(), getCurrentUser()]).then(([loadedSummary, loadedUser]) => { setSummary(loadedSummary); setUser(loadedUser); }).catch(() => setError("No fue posible cargar el dashboard.")); }, []);

  const hasObligations = Boolean(summary && summary.total_obligations > 0);
  return <DashboardGate><div className="space-y-8">
    <PageHeader title="Dashboard" description="Estado general de las obligaciones de tu organización." action={user?.role === "ADMIN" && hasObligations ? <Link className="inline-flex h-12 items-center justify-center rounded-lg bg-[#111c30] px-4 text-sm font-semibold text-white transition hover:bg-[#1a2943] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20" href="/obligations/new">Crear obligación</Link> : undefined} />
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700" role="alert">{error}</p>}
    {!summary && !error && <Card className="p-8 text-[15px] text-slate-500" role="status">Cargando resumen…</Card>}
    {summary && (summary.total_obligations === 0 ? <Card className="p-8 text-center sm:p-10"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-slate-100 text-xl text-[#111c30]" aria-hidden="true">✓</span><h2 className="mt-5 text-lg font-semibold text-[#111c30]">Aún no hay obligaciones registradas</h2><p className="mx-auto mt-2 max-w-xl text-[15px] leading-6 text-slate-600">Registra tu primera obligación ambiental para comenzar a hacer seguimiento de responsables, controles, evidencias y estado de cumplimiento.</p>{user?.role === "ADMIN" && <Link className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-[#111c30] px-4 text-sm font-semibold text-white transition hover:bg-[#1a2943] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20" href="/obligations/new">Crear primera obligación</Link>}</Card> : <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5"><MetricCard label="Total" value={summary.total_obligations} /><MetricCard label="Cumplidas" value={summary.compliant} tone="success" /><MetricCard label="En proceso" value={summary.in_progress} tone="info" /><MetricCard label="Pendientes" value={summary.pending} tone="warning" /><MetricCard label="Vencidas" value={summary.overdue} tone="danger" /></div>
      <Card className="p-6"><p className="text-[15px] font-medium text-slate-500">Cumplimiento general</p><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><b className="text-4xl text-[#111c30]">{summary.compliance_percentage}%</b><span className="text-[15px] text-slate-500">Obligaciones cumplidas sobre total activo</span></div><div className="mt-4 h-2 rounded bg-slate-100"><div className="h-2 rounded bg-emerald-600" style={{ width: `${summary.compliance_percentage}%` }} /></div></Card>
      <div className="grid gap-6 lg:grid-cols-2"><Card className="p-6"><h2 className="text-lg font-semibold text-[#111c30]">Requieren atención</h2><ObligationList items={summary.attention_obligations} empty="No hay obligaciones que requieran atención." /></Card><Card className="p-6"><h2 className="text-lg font-semibold text-[#111c30]">Próximos vencimientos</h2><ObligationList items={summary.upcoming_obligations} empty="No hay próximos vencimientos." /></Card></div>
    </>)}
  </div></DashboardGate>;
}
