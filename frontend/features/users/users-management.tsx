"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { Card, EmptyState, PageHeader, StatusBadge } from "@/components/ui/surface";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { ApiError, createUser, getCurrentUser, getUsers, type OrganizationUser, updateUser, updateUserStatus } from "@/lib/api";

type UserFormState = { name: string; email: string; password: string; role: OrganizationUser["role"] };
const emptyForm: UserFormState = { name: "", email: "", password: "", role: "RESPONSIBLE" };
const roleLabels: Record<OrganizationUser["role"], string> = { ADMIN: "Administrador", RESPONSIBLE: "Responsable", READER: "Lector" };

export function UsersManagement() {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [editingUser, setEditingUser] = useState<OrganizationUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  async function loadUsers() {
    setIsLoading(true); setError("");
    try { setUsers(await getUsers()); }
    catch (requestError) { setError(requestError instanceof ApiError && requestError.status === 403 ? "No tienes permisos para gestionar usuarios." : "No fue posible cargar los usuarios."); }
    finally { setIsLoading(false); }
  }

  useEffect(() => { getCurrentUser().then((user) => { const allowed = user.role === "ADMIN"; setIsAdmin(allowed); if (allowed) void loadUsers(); }).catch(() => setIsAdmin(false)); }, []);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setIsSaving(true);
    try { const createdUser = await createUser(form); setUsers((current) => [createdUser, ...current]); setForm(emptyForm); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "No fue posible crear el usuario."); }
    finally { setIsSaving(false); }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!editingUser) return;
    setError(""); setIsSaving(true);
    try { const updatedUser = await updateUser(editingUser.id, { name: form.name, email: form.email, role: form.role }); setUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user)); setEditingUser(null); setForm(emptyForm); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "No fue posible actualizar el usuario."); }
    finally { setIsSaving(false); }
  }

  async function toggleStatus(user: OrganizationUser) {
    if (user.is_active && !window.confirm(`¿Desactivar a ${user.name}? Esta persona perderá acceso a la plataforma.`)) return;
    setError("");
    try { const updatedUser = await updateUserStatus(user.id, !user.is_active); setUsers((current) => current.map((item) => item.id === updatedUser.id ? updatedUser : item)); }
    catch (requestError) { setError(requestError instanceof ApiError ? requestError.message : "No fue posible actualizar el estado."); }
  }

  function startEdit(user: OrganizationUser) { setEditingUser(user); setForm({ name: user.name, email: user.email, password: "", role: user.role }); setError(""); }

  if (isAdmin === false) return <EmptyState title="Acceso restringido" description="Solo los administradores pueden gestionar usuarios." action={<Link className="text-sm font-semibold text-[#111c30] underline" href="/dashboard">Volver al dashboard</Link>} />;

  return <div className="space-y-8">
    <PageHeader title="Usuarios y roles" description="Gestiona quién puede acceder a tu organización y qué permisos tiene." />
    {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</div>}
    <div className="user-management-layout grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(320px,0.8fr)] xl:items-start">
      <Card className="overflow-hidden bg-[var(--surface)]">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-6"><h2 className="font-semibold text-[#111c30]">Usuarios existentes</h2><p className="mt-1 text-sm text-slate-500">Personas con acceso a esta organización.</p></div>
        {isLoading ? <div className="px-6 py-12 text-sm text-slate-600" role="status">Cargando usuarios…</div> : users.length === 0 ? <div className="px-6 py-12 text-center"><h3 className="text-lg font-semibold text-[#111c30]">Aún no hay usuarios</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">Crea un usuario para asignarle responsabilidades dentro de la organización.</p></div> : <div className="overflow-x-auto"><table className="min-w-[760px] w-full text-left text-sm"><thead className="bg-[var(--surface-muted)] text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3 font-medium">Nombre</th><th className="px-6 py-3 font-medium">Correo</th><th className="px-6 py-3 font-medium">Rol</th><th className="px-6 py-3 font-medium">Estado</th><th className="px-6 py-3 font-medium">Creado</th><th className="px-6 py-3 text-right font-medium">Acciones</th></tr></thead><tbody className="divide-y divide-slate-100">{users.map((user) => <tr key={user.id} className="text-slate-700 transition-colors duration-200 hover:bg-[var(--surface-cool)]"><td className="px-6 py-4 font-medium text-slate-950">{user.name}</td><td className="px-6 py-4">{user.email}</td><td className="px-6 py-4">{roleLabels[user.role]}</td><td className="px-6 py-4"><StatusBadge tone={user.is_active ? "success" : "neutral"}>{user.is_active ? "Activo" : "Inactivo"}</StatusBadge></td><td className="px-6 py-4 text-slate-500">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(user.created_at))}</td><td className="px-6 py-4"><div className="flex justify-end gap-3 whitespace-nowrap"><button type="button" onClick={() => startEdit(user)} className="text-sm font-medium text-[#111c30] underline-offset-4 transition-colors duration-200 hover:text-slate-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900">Editar</button><button type="button" onClick={() => void toggleStatus(user)} className={user.is_active ? "text-sm font-medium text-red-700 underline-offset-4 transition-colors duration-200 hover:text-red-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-700" : "text-sm font-medium text-emerald-700 underline-offset-4 transition-colors duration-200 hover:text-emerald-900 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"}>{user.is_active ? "Desactivar" : "Activar"}</button></div></td></tr>)}</tbody></table></div>}
      </Card>
      <Card className="h-fit bg-[var(--surface-cool)] p-5 sm:p-6"><h2 className="font-semibold text-[#111c30]">{editingUser ? "Editar usuario" : "Nuevo usuario"}</h2><p className="mt-1 text-sm text-slate-500">{editingUser ? "Actualiza los datos y permisos del usuario." : "Añade una persona a la organización."}</p><UserForm form={form} setForm={setForm} isSaving={isSaving} isEditing={Boolean(editingUser)} onSubmit={editingUser ? submitEdit : submitCreate} onCancel={editingUser ? () => { setEditingUser(null); setForm(emptyForm); } : undefined} /></Card>
    </div>
  </div>;
}

function UserForm({ form, setForm, isSaving, isEditing, onSubmit, onCancel }: { form: UserFormState; setForm: (value: UserFormState) => void; isSaving: boolean; isEditing: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel?: () => void }) {
  const updateField = <Key extends keyof UserFormState>(key: Key, value: UserFormState[Key]) => setForm({ ...form, [key]: value });
  return <form className="mt-6 space-y-5" noValidate onSubmit={onSubmit}>
    <TextField id="user-name" label="Nombre" required value={form.name} onChange={(event) => updateField("name", event.target.value)} />
    <TextField id="user-email" label="Correo electrónico" type="email" required value={form.email} onChange={(event) => updateField("email", event.target.value)} />
    {!isEditing && <TextField id="user-password" label="Contraseña" type="password" required minLength={12} autoComplete="new-password" value={form.password} onChange={(event) => updateField("password", event.target.value)} />}
    <div><label htmlFor="user-role" className="mb-2 block text-sm font-medium text-slate-800">Rol</label><select id="user-role" value={form.role} onChange={(event) => updateField("role", event.target.value as UserFormState["role"])} className="control-field h-11 w-full rounded-[10px] border px-3 text-[15px] text-slate-950 outline-none transition"><option value="ADMIN">Administrador</option><option value="RESPONSIBLE">Responsable</option><option value="READER">Lector</option></select></div>
    <PrimaryButton type="submit" isLoading={isSaving} loadingLabel={isEditing ? "Guardando..." : "Creando..."}>{isEditing ? "Guardar cambios" : "Crear usuario"}</PrimaryButton>
    {onCancel && <button type="button" onClick={onCancel} className="w-full py-2 text-sm font-medium text-slate-600 underline-offset-4 hover:text-slate-950 hover:underline">Cancelar</button>}
  </form>;
}
