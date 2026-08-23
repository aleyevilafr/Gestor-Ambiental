"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardGate } from "@/components/auth/dashboard-gate";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui/surface";
import { KpiStrip } from "@/components/ui/kpi-strip";
import { getComplianceReport, type ComplianceReport } from "@/lib/api";

const label = { COMPLIANT: "Cumplida", IN_PROGRESS: "En proceso", PENDING: "Pendiente", OVERDUE: "Vencida" };
const tone = { COMPLIANT: "success", IN_PROGRESS: "warning", PENDING: "neutral", OVERDUE: "danger" } as const;

export default function ComplianceReportPage() {
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { getComplianceReport().then(setReport).catch((caught) => setError(caught instanceof Error ? caught.message : "No fue posible cargar el reporte.")); }, []);
  return <DashboardGate><div className="space-y-8 print:space-y-6">
    {report && <PageHeader title="Reporte de cumplimiento" description={`${report.organization.name} · RUT: ${report.organization.rut} · Generado: ${new Date(report.generated_at).toLocaleString("es-CL")}`} action={<button onClick={() => window.print()} className="no-print rounded-lg bg-[#111c30] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a2943] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20">Imprimir / Guardar como PDF</button>} />}
    {!report && !error && <Card className="p-8 text-sm text-slate-600" role="status">Generando reporte…</Card>}
    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>}
    {report && <><KpiStrip metrics={[{ label: "Total", value: report.summary.total_obligations }, { label: "Cumplidas", value: report.summary.compliant, tone: "success" }, { label: "En proceso", value: report.summary.in_progress, tone: "info" }, { label: "Pendientes", value: report.summary.pending, tone: "warning" }, { label: "Vencidas", value: report.summary.overdue, tone: "danger" }, { label: "Cumplimiento", value: `${report.summary.compliance_percentage}%`, tone: "neutral" }]} />
      {report.obligations.length === 0 ? <EmptyState title="No hay obligaciones activas" description="No existen obligaciones activas para incluir en este reporte." /> : <Card className="overflow-hidden"><div className="border-b border-slate-200 px-5 py-5 sm:px-6"><h2 className="font-semibold text-[#111c30]">Obligaciones incluidas</h2><p className="mt-1 text-sm text-slate-500">Resumen de obligaciones activas de la organización.</p></div><div className="overflow-x-auto"><table className="min-w-[860px] w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{["Obligación", "Materia", "Responsable", "Fecha límite", "Estado", "Controles", "Evidencias"].map((item) => <th key={item} className="px-6 py-3 font-medium">{item}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{report.obligations.map((obligation) => <tr key={obligation.id} className="text-slate-700"><td className="px-6 py-4"><Link className="font-medium text-[#111c30] underline-offset-4 hover:underline" href={`/obligations/${obligation.id}`}>{obligation.title}</Link><p className="mt-1 text-xs text-slate-500">{obligation.regulatory_source}{obligation.article ? ` · ${obligation.article}` : ""}</p></td><td className="px-6 py-4">{obligation.matter}</td><td className="px-6 py-4">{obligation.responsible ?? "Sin asignar"}</td><td className="px-6 py-4">{obligation.deadline ?? "—"}</td><td className="px-6 py-4"><StatusBadge tone={tone[obligation.compliance_status]}>{label[obligation.compliance_status]}</StatusBadge></td><td className="px-6 py-4">{obligation.controls_count}</td><td className="px-6 py-4">{obligation.evidences_count}</td></tr>)}</tbody></table></div></Card>}
    </>}
    <style jsx global>{`@media print { .no-print, nav { display: none !important; } main { max-width: none !important; padding: 0 !important; } }`}</style>
  </div></DashboardGate>;
}
