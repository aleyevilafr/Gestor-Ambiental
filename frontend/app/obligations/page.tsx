"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { DashboardGate } from "@/components/auth/dashboard-gate";
import { getCurrentUser, getObligations, type AuthenticatedUser, type Obligation } from "@/lib/api";

const statusLabels = { PENDING: "Pendiente", IN_PROGRESS: "En proceso", COMPLIANT: "Cumplida", OVERDUE: "Vencida" };

export default function ObligationsPage() {
  const [items, setItems] = useState<Obligation[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [responsible, setResponsible] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([getObligations(), getCurrentUser()])
      .then(([obligations, currentUser]) => { setItems(obligations); setUser(currentUser); })
      .catch(() => setError("No fue posible cargar las obligaciones."));
  }, []);

  const responsibleUsers = useMemo(() => {
    const people = new Map<string, string>();
    items.forEach((item) => item.responsible_user && people.set(item.responsible_user.id, item.responsible_user.name));
    return [...people.entries()];
  }, [items]);
  const filtered = items.filter((item) => (!search || item.title.toLowerCase().includes(search.toLowerCase())) && (!status || item.compliance_status === status) && (!responsible || item.responsible_user_id === responsible));

  return <DashboardGate><main className="min-h-screen bg-[#f7f8fa] p-6 sm:p-8"><div className="mx-auto max-w-6xl">
    <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold text-[#111c30]">Obligaciones</h1><p className="mt-2 text-slate-600">Gestiona las obligaciones ambientales de tu organización.</p></div>{user?.role === "ADMIN" && <Link className="rounded-lg bg-[#111c30] px-4 py-3 text-sm font-semibold text-white hover:bg-[#1a2943]" href="/obligations/new">Crear obligación</Link>}</div>
    <div className="mt-8 grid gap-3 md:grid-cols-3"><input className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm" placeholder="Buscar por título" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm" value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><select className="h-12 rounded-lg border border-slate-300 bg-white px-3 text-sm" value={responsible} onChange={(event) => setResponsible(event.target.value)}><option value="">Todos los responsables</option>{responsibleUsers.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></div>
    {error && <p className="mt-5 text-sm text-red-700" role="alert">{error}</p>}
    <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-slate-500"><tr><th className="p-4 font-medium">Título</th><th className="p-4 font-medium">Materia</th><th className="p-4 font-medium">Fuente normativa</th><th className="p-4 font-medium">Responsable</th><th className="p-4 font-medium">Fecha límite</th><th className="p-4 font-medium">Estado</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50"><td className="p-4 font-medium text-[#111c30]"><Link href={`/obligations/${item.id}`}>{item.title}</Link></td><td className="p-4">{item.matter}</td><td className="p-4">{item.regulatory_source}</td><td className="p-4">{item.responsible_user?.name ?? "Sin asignar"}</td><td className="p-4">{item.deadline ?? "—"}</td><td className="p-4">{statusLabels[item.compliance_status]}</td></tr>)}</tbody></table>{!error && filtered.length === 0 && <p className="p-6 text-center text-sm text-slate-500">No hay obligaciones que coincidan con los filtros.</p>}</div>
  </div></main></DashboardGate>;
}
