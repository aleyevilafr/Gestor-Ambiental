"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardGate } from "@/components/auth/dashboard-gate";
import { PrimaryButton } from "@/components/ui/primary-button";
import { createObligation, getCurrentUser, getUsers, type OrganizationUser } from "@/lib/api";

type Form = { title: string; description: string; matter: string; regulatory_source: string; article: string; deadline: string; frequency: string; compliance_status: "PENDING" | "IN_PROGRESS" | "COMPLIANT" | "OVERDUE"; responsible_user_id: string };
const initial: Form = { title: "", description: "", matter: "", regulatory_source: "", article: "", deadline: "", frequency: "", compliance_status: "PENDING", responsible_user_id: "" };

export default function NewObligationPage() {
  const router = useRouter();
  const [form, setForm] = useState<Form>(initial); const [users, setUsers] = useState<OrganizationUser[]>([]); const [allowed, setAllowed] = useState(false); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  useEffect(() => { getCurrentUser().then((user) => { if (user.role !== "ADMIN") { router.replace("/obligations"); return; } setAllowed(true); return getUsers().then(setUsers); }).catch(() => router.replace("/login")); }, [router]);
  const set = (key: keyof Form, value: string) => setForm((previous) => ({ ...previous, [key]: value }));
  async function submit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setError(""); setLoading(true); try { const obligation = await createObligation({ ...form, description: form.description || null, article: form.article || null, deadline: form.deadline || null, frequency: form.frequency || null, responsible_user_id: form.responsible_user_id || null }); router.push(`/obligations/${obligation.id}`); } catch (caught) { setError(caught instanceof Error ? caught.message : "No fue posible crear la obligación."); } finally { setLoading(false); } }
  if (!allowed) return <DashboardGate><main className="p-8">Verificando permisos…</main></DashboardGate>;
  return <DashboardGate><main className="min-h-screen bg-[#f7f8fa] p-6 sm:p-8"><form onSubmit={submit} className="mx-auto max-w-2xl rounded-lg border border-slate-200 bg-white p-6 sm:p-8"><h1 className="text-2xl font-semibold text-[#111c30]">Crear obligación</h1><p className="mt-2 text-sm text-slate-600">Registra la información base de la obligación ambiental.</p><div className="mt-7 grid gap-4 sm:grid-cols-2">
    {[['title','Título',true],['matter','Materia',true],['regulatory_source','Fuente normativa',true],['article','Artículo',false],['deadline','Fecha límite',false],['frequency','Periodicidad',false]].map(([key,label,required]) => <label key={key as string} className="block text-sm font-medium text-slate-800">{label}<input required={required as boolean} type={key === 'deadline' ? 'date' : 'text'} value={form[key as keyof Form] as string} onChange={(event) => set(key as keyof Form, event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-300 px-3 font-normal" /></label>)}
    <label className="block text-sm font-medium text-slate-800">Responsable<select value={form.responsible_user_id} onChange={(event) => set("responsible_user_id", event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option value="">Sin asignar</option>{users.filter((user) => user.is_active && (user.role === "ADMIN" || user.role === "RESPONSIBLE")).map((user) => <option key={user.id} value={user.id}>{user.name} · {user.role}</option>)}</select></label>
    <label className="block text-sm font-medium text-slate-800">Estado<select value={form.compliance_status} onChange={(event) => set("compliance_status", event.target.value)} className="mt-2 h-12 w-full rounded-lg border border-slate-300 bg-white px-3 font-normal"><option value="PENDING">Pendiente</option><option value="IN_PROGRESS">En proceso</option><option value="COMPLIANT">Cumplida</option><option value="OVERDUE">Vencida</option></select></label>
  </div><label className="mt-4 block text-sm font-medium text-slate-800">Descripción<textarea value={form.description} onChange={(event) => set("description", event.target.value)} className="mt-2 min-h-28 w-full rounded-lg border border-slate-300 p-3 font-normal" /></label>{error && <p className="mt-4 text-sm text-red-700" role="alert">{error}</p>}<PrimaryButton className="mt-6" isLoading={loading} loadingLabel="Creando…">Crear obligación</PrimaryButton></form></main></DashboardGate>;
}
