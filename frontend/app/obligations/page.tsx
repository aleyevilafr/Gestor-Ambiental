"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { DashboardGate } from "@/components/auth/dashboard-gate";
import { ObligationBoard } from "@/features/obligations/obligation-board";
import { ObligationDetailDrawer } from "@/features/obligations/obligation-detail-drawer";
import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui/surface";
import { getCurrentUser, getObligations, getUsers, type AuthenticatedUser, type Obligation, type OrganizationUser } from "@/lib/api";

const labels = { PENDING: "Pendiente", IN_PROGRESS: "En proceso", COMPLIANT: "Cumplida", OVERDUE: "Vencida" };
const tone = { PENDING: "warning", IN_PROGRESS: "info", COMPLIANT: "success", OVERDUE: "danger" } as const;

export default function ObligationsPage() {
  const [items, setItems] = useState<Obligation[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [responsible, setResponsible] = useState("");
  const [view, setView] = useState<"board" | "table">("board");
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Obligation | null>(null);
  const [organizationUsers, setOrganizationUsers] = useState<OrganizationUser[]>([]);
  const lastBoardTrigger = useRef<HTMLButtonElement | null>(null);

  useEffect(() => { Promise.all([getObligations(), getCurrentUser()]).then(async ([obligations, currentUser]) => { setItems(obligations); setUser(currentUser); if (currentUser.role === "ADMIN") setOrganizationUsers(await getUsers()); }).catch(() => setError("No fue posible cargar las obligaciones.")); }, []);

  const people = useMemo(() => [...new Map(items.filter((item) => item.responsible_user).map((item) => [item.responsible_user!.id, item.responsible_user!.name])).entries()], [items]);
  const filtered = items.filter((item) => (!search || item.title.toLowerCase().includes(search.toLowerCase())) && (!status || item.compliance_status === status) && (!responsible || item.responsible_user_id === responsible));
  const empty = filtered.length === 0;

  const selectForDrawer = (item: Obligation, trigger: HTMLButtonElement) => { lastBoardTrigger.current = trigger; setSelected(item); };
  const closeDrawer = () => { setSelected(null); requestAnimationFrame(() => lastBoardTrigger.current?.focus()); };
  const saveFromDrawer = (updated: Obligation) => { setItems((current) => current.map((item) => item.id === updated.id ? updated : item)); setSelected(updated); };
  const archiveFromDrawer = (id: string) => { setItems((current) => current.filter((item) => item.id !== id)); closeDrawer(); };

  return <DashboardGate><div className="space-y-5"><PageHeader title="Obligaciones" description="Organiza el trabajo y realiza seguimiento de las obligaciones ambientales." action={user?.role === "ADMIN" ? <Link href="/obligations/new" className="button-primary inline-flex rounded-[10px] px-4 py-3 text-sm font-semibold text-white">Crear obligación</Link> : undefined} /><Card className="dashboard-panel bg-[var(--surface-cool)] p-4 sm:p-5"><div className="grid items-center gap-3 md:grid-cols-3"><input className="control-field h-11 rounded-[10px] border px-3 text-[15px] outline-none transition" placeholder="Buscar por título" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="control-field h-11 rounded-[10px] border px-3 text-[15px] outline-none transition" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{Object.entries(labels).map(([value, itemLabel]) => <option key={value} value={value}>{itemLabel}</option>)}</select><select className="control-field h-11 rounded-[10px] border px-3 text-[15px] outline-none transition" value={responsible} onChange={(event) => setResponsible(event.target.value)}><option value="">Todos los responsables</option>{people.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-200/80 pt-4"><p className="text-sm text-slate-500">{filtered.length} {filtered.length === 1 ? "obligación" : "obligaciones"}</p><div className="inline-flex rounded-[11px] border border-[var(--border-strong)] bg-[var(--surface-muted)] p-1 shadow-[var(--shadow-xs)]" role="group" aria-label="Vista de obligaciones"><button type="button" aria-pressed={view === "board"} onClick={() => setView("board")} className={`rounded-[8px] px-3 py-1.5 text-sm font-medium transition duration-200 ${view === "board" ? "bg-[#172b4d] text-white shadow-[var(--shadow-xs)]" : "text-slate-600 hover:bg-white hover:text-[#172033]"}`}>Board</button><button type="button" aria-pressed={view === "table"} onClick={() => setView("table")} className={`rounded-[8px] px-3 py-1.5 text-sm font-medium transition duration-200 ${view === "table" ? "bg-[#172b4d] text-white shadow-[var(--shadow-xs)]" : "text-slate-600 hover:bg-white hover:text-[#172033]"}`}>Tabla</button></div></div></Card>{error ? <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : empty ? <EmptyState title={items.length === 0 ? "Aún no hay obligaciones" : "No hay resultados"} description={items.length === 0 ? "Registra una obligación ambiental para comenzar el seguimiento." : "Prueba ajustando los filtros de búsqueda."} /> : view === "board" ? <ObligationBoard items={filtered} onSelect={selectForDrawer} selectedId={selected?.id ?? null} /> : <Card className="overflow-hidden bg-[var(--surface)]"><div className="overflow-x-auto"><table className="min-w-[800px] w-full text-left text-sm"><thead className="border-b bg-[var(--surface-muted)] text-slate-600 [border-color:var(--border-subtle)]"><tr>{["Título", "Materia", "Fuente normativa", "Responsable", "Fecha límite", "Estado"].map((heading) => <th key={heading} className="px-5 py-4 font-semibold">{heading}</th>)}</tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-b border-slate-100 transition-colors duration-200 hover:bg-[var(--surface-cool)]"><td className="px-5 py-4 font-semibold text-[#111c30]"><Link href={`/obligations/${item.id}`} className="hover:underline">{item.title}</Link></td><td className="px-5 py-4">{item.matter}</td><td className="px-5 py-4">{item.regulatory_source}</td><td className="px-5 py-4">{item.responsible_user?.name ?? "Sin asignar"}</td><td className="px-5 py-4">{item.deadline ?? "—"}</td><td className="px-5 py-4"><StatusBadge tone={tone[item.compliance_status]}>{labels[item.compliance_status]}</StatusBadge></td></tr>)}</tbody></table></div></Card>}</div>{selected && user && <ObligationDetailDrawer item={selected} user={user} users={organizationUsers} onArchived={archiveFromDrawer} onClose={closeDrawer} onSaved={saveFromDrawer} />}</DashboardGate>;
}
