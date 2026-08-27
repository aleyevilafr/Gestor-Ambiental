"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardGate } from "@/components/auth/dashboard-gate";
import { Card, PageHeader } from "@/components/ui/surface";
import { KpiStrip } from "@/components/ui/kpi-strip";
import { AlertIcon, CheckCircleIcon, ClipboardIcon, ClockIcon, UsersIcon } from "@/components/ui/icons";
import { DashboardAmbientShader } from "@/components/ui/dashboard-ambient-shader";
import { AttentionPanel } from "@/features/dashboard/attention-panel";
import { ResponsibleCompliance } from "@/features/dashboard/compliance-breakdowns";
import { MonthlyComplianceChart } from "@/features/dashboard/monthly-compliance-chart";
import { OperationalSummary } from "@/features/dashboard/operational-summary";
import { QuickActions } from "@/features/dashboard/quick-actions";
import { UpcomingMilestones } from "@/features/dashboard/upcoming-milestones";
import { getCurrentUser, getDashboardAttention, getDashboardSummary, getDashboardUpcoming, getObligations, type AuthenticatedUser, type DashboardAttention, type DashboardObligation, type DashboardSummary, type Obligation } from "@/lib/api";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [attention, setAttention] = useState<DashboardAttention[]>([]);
  const [upcoming, setUpcoming] = useState<DashboardObligation[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [error, setError] = useState("");

  useEffect(() => { Promise.all([getDashboardSummary(), getDashboardAttention(), getDashboardUpcoming(), getObligations(), getCurrentUser()]).then(([loadedSummary, loadedAttention, loadedUpcoming, loadedObligations, loadedUser]) => { setSummary(loadedSummary); setAttention(loadedAttention); setUpcoming(loadedUpcoming); setObligations(loadedObligations); setUser(loadedUser); }).catch(() => setError("No pudimos cargar el centro de control.")); }, []);

  const hasObligations = Boolean(summary && summary.total_obligations > 0);
  return <DashboardGate><div className="relative isolate"><DashboardAmbientShader /><div className="relative z-10 space-y-5 sm:space-y-6 motion-safe:animate-[dashboard-enter_220ms_ease-out]"><PageHeader title="Dashboard" description="Estado general del cumplimiento ambiental de tu organización." action={user?.role === "ADMIN" && hasObligations ? <Link className="button-primary inline-flex h-12 items-center justify-center rounded-[10px] px-4 text-sm font-semibold text-white shadow-[var(--shadow-button)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20" href="/obligations/new">Crear obligación</Link> : undefined} />
    {error && <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[15px] text-red-700" role="alert">{error}</p>}
    {!summary && !error && <Card className="p-8 text-[15px] text-slate-500" role="status">Cargando centro de control…</Card>}
    {summary && (summary.total_obligations === 0 ? <section className="mx-auto max-w-2xl pt-2 text-center sm:pt-4"><div className="mx-auto flex max-w-sm justify-center gap-8 border-y border-slate-200/80 py-5"><div><p className="text-3xl font-semibold text-[#111c30]">0</p><p className="mt-1 text-sm text-slate-500">Obligaciones</p></div><div className="h-10 w-px bg-slate-200" aria-hidden="true" /><div><p className="text-3xl font-semibold text-[#111c30]">—</p><p className="mt-1 text-sm text-slate-500">Cumplimiento</p></div></div><div className="pt-7"><h2 className="text-xl font-semibold text-[#111c30]">Comienza a gestionar tu cumplimiento</h2><p className="mx-auto mt-2 max-w-xl text-[15px] leading-6 text-slate-600">Registra tu primera obligación ambiental para comenzar a asignar responsables, controles y evidencias.</p>{user?.role === "ADMIN" && <Link className="button-primary mt-6 inline-flex h-12 items-center justify-center rounded-[10px] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20" href="/obligations/new">Crear primera obligación</Link>}</div></section> : <><KpiStrip featuredStyle="light" uniformHeight metrics={[{ label: "Cumplimiento general", value: `${summary.compliance_percentage}%`, tone: "success", icon: CheckCircleIcon, featured: true, progress: summary.compliance_percentage, helper: `${summary.compliant} de ${summary.total_obligations} obligaciones cumplidas` }, { label: "Obligaciones vencidas", value: summary.overdue, tone: "danger", icon: AlertIcon, helper: "Requieren atención inmediata" }, { label: "Próximas a vencer", value: summary.due_soon, tone: "warning", icon: ClockIcon, helper: "Dentro de los próximos 30 días" }, { label: "Sin responsable", value: summary.unassigned, tone: "violet", icon: UsersIcon, helper: "Asignación pendiente" }, { label: "Obligaciones activas", value: summary.active, tone: "info", icon: ClipboardIcon, helper: "En seguimiento" }]} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]"><AttentionPanel summary={summary} items={attention} /><UpcomingMilestones items={upcoming} /></div>
      <div className="grid gap-6 xl:grid-cols-2"><OperationalSummary summary={summary} /><MonthlyComplianceChart /></div>
      <div className="grid gap-6 xl:grid-cols-2"><ResponsibleCompliance items={obligations} /><QuickActions canCreate={user?.role === "ADMIN"} /></div>
    </>)}</div></div></DashboardGate>;
}
