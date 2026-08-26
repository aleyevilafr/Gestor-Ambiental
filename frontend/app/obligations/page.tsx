"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardGate } from "@/components/auth/dashboard-gate";
import { MatterComplianceRadar } from "@/components/ui/compliance-radar";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui/surface";
import { getCurrentUser, getObligations, type AuthenticatedUser, type Obligation } from "@/lib/api";

const labels = { PENDING: "Pendiente", IN_PROGRESS: "En proceso", COMPLIANT: "Cumplida", OVERDUE: "Vencida" };
const tone = { PENDING: "warning", IN_PROGRESS: "info", COMPLIANT: "success", OVERDUE: "danger" } as const;

export default function ObligationsPage() {
  const [items, setItems] = useState<Obligation[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [responsible, setResponsible] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { Promise.all([getObligations(), getCurrentUser()]).then(([obligations, currentUser]) => { setItems(obligations); setUser(currentUser); }).catch(() => setError("No fue posible cargar las obligaciones.")); }, []);

  const people = useMemo(() => [...new Map(items.filter((item) => item.responsible_user).map((item) => [item.responsible_user!.id, item.responsible_user!.name])).entries()], [items]);
  const matterData = useMemo(() => Array.from(items.reduce((map, item) => { const current = map.get(item.matter) ?? { label: item.matter, total: 0, compliant: 0 }; current.total += 1; current.compliant += item.compliance_status === "COMPLIANT" ? 1 : 0; map.set(item.matter, current); return map; }, new Map<string, { label: string; total: number; compliant: number }>()).values()).sort((a, b) => b.total - a.total || a.label.localeCompare(b.label)).slice(0, 6), [items]);
  const filtered = items.filter((item) => (!search || item.title.toLowerCase().includes(search.toLowerCase())) && (!status || item.compliance_status === status) && (!responsible || item.responsible_user_id === responsible));

  return <DashboardGate><div className="space-y-6"><PageHeader title="Obligaciones" description="Gestiona las obligaciones ambientales de tu organización." action={user?.role === "ADMIN" ? <Link href="/obligations/new" className="button-primary inline-flex rounded-[10px] px-4 py-3 text-sm font-semibold text-white">Crear obligación</Link> : undefined} /><Card className="bg-[var(--surface-cool)] p-4"><div className="grid gap-3 md:grid-cols-3"><input className="control-field h-11 rounded-[10px] border px-3 text-[15px] outline-none transition" placeholder="Buscar por título" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="control-field h-11 rounded-[10px] border px-3 text-[15px] outline-none transition" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{Object.entries(labels).map(([value, itemLabel]) => <option key={value} value={value}>{itemLabel}</option>)}</select><select className="control-field h-11 rounded-[10px] border px-3 text-[15px] outline-none transition" value={responsible} onChange={(event) => setResponsible(event.target.value)}><option value="">Todos los responsables</option>{people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div></Card>{items.length > 0 && <Card className="dashboard-panel bg-[var(--surface-muted)] p-5 sm:p-6"><div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-lg font-semibold text-[#111c30]">Mapa de cumplimiento por materia</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">Proporción de obligaciones cumplidas por materia, calculada con las obligaciones activas visibles para tu rol.</p></div><span className="rounded-full bg-white/75 px-3 py-1 text-xs font-medium text-slate-600">Hasta 6 materias</span></div><div className="mt-5"><MatterComplianceRadar data={matterData} /></div></Card>}{error ? <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : filtered.length === 0 ? <EmptyState title={items.length === 0 ? "Aún no hay obligaciones" : "No hay resultados"} description={items.length === 0 ? "Registra una obligación ambiental para comenzar el seguimiento." : "Prueba ajustando los filtros de búsqueda."} /> : <Card className="overflow-x-auto"><table className="min-w-[800px] w-full text-left text-sm"><thead className="border-b bg-[var(--surface-muted)] text-slate-600 [border-color:var(--border-subtle)]"><tr>{["Título", "Materia", "Fuente normativa", "Responsable", "Fecha límite", "Estado"].map((heading) => <th key={heading} className="px-5 py-4 font-semibold">{heading}</th>)}</tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-b border-slate-100 transition-colors duration-200 hover:bg-[var(--surface-cool)]"><td className="px-5 py-4 font-medium text-[#111c30]"><Link href={`/obligations/${item.id}`} className="hover:underline">{item.title}</Link></td><td className="px-5 py-4">{item.matter}</td><td className="px-5 py-4">{item.regulatory_source}</td><td className="px-5 py-4">{item.responsible_user?.name ?? "Sin asignar"}</td><td className="px-5 py-4">{item.deadline ?? "—"}</td><td className="px-5 py-4"><StatusBadge tone={tone[item.compliance_status]}>{labels[item.compliance_status]}</StatusBadge></td></tr>)}</tbody></table></Card>}</div></DashboardGate>;
}
