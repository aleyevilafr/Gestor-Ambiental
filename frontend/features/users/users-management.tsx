"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";

import { BrandMark } from "@/components/branding/brand-mark";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { ApiError, createUser, getUsers, type OrganizationUser, updateUser, updateUserStatus } from "@/lib/api";

type UserFormState = {
  name: string;
  email: string;
  password: string;
  role: OrganizationUser["role"];
};

const emptyForm: UserFormState = { name: "", email: "", password: "", role: "RESPONSIBLE" };

const roleLabels: Record<OrganizationUser["role"], string> = {
  ADMIN: "Administrador",
  RESPONSIBLE: "Responsable",
  READER: "Lector",
};

export function UsersManagement() {
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [editingUser, setEditingUser] = useState<OrganizationUser | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function loadUsers() {
    setIsLoading(true);
    setError("");
    try {
      setUsers(await getUsers());
    } catch (requestError) {
      setError(requestError instanceof ApiError && requestError.status === 403 ? "No tienes permisos para gestionar usuarios." : "No fue posible cargar los usuarios.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => { void loadUsers(); }, []);

  async function submitCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);
    try {
      const createdUser = await createUser(form);
      setUsers((current) => [createdUser, ...current]);
      setForm(emptyForm);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "No fue posible crear el usuario.");
    } finally {
      setIsSaving(false);
    }
  }

  async function submitEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editingUser === null) return;
    setError("");
    setIsSaving(true);
    try {
      const updatedUser = await updateUser(editingUser.id, { name: form.name, email: form.email, role: form.role });
      setUsers((current) => current.map((user) => user.id === updatedUser.id ? updatedUser : user));
      setEditingUser(null);
      setForm(emptyForm);
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "No fue posible actualizar el usuario.");
    } finally {
      setIsSaving(false);
    }
  }

  async function toggleStatus(user: OrganizationUser) {
    setError("");
    try {
      const updatedUser = await updateUserStatus(user.id, !user.is_active);
      setUsers((current) => current.map((currentUser) => currentUser.id === updatedUser.id ? updatedUser : currentUser));
    } catch (requestError) {
      setError(requestError instanceof ApiError ? requestError.message : "No fue posible actualizar el estado.");
    }
  }

  function startEdit(user: OrganizationUser) {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, password: "", role: user.role });
    setError("");
  }

  return (
    <main className="min-h-screen bg-[#f7f8fa] px-5 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-wrap items-center justify-between gap-5 border-b border-slate-200 pb-7">
          <BrandMark tone="light" compact />
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10">Volver al dashboard</Link>
        </header>
        <div className="py-9">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Administración</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Usuarios y roles</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-6 text-slate-600">Gestiona los usuarios que pueden acceder a tu organización.</p>
        </div>

        {error && <p className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800" role="alert">{error}</p>}

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="overflow-hidden border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-6 py-5"><h2 className="font-semibold text-slate-950">Usuarios de la organización</h2></div>
            {isLoading ? <p className="px-6 py-12 text-sm text-slate-600">Cargando usuarios…</p> : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-6 py-3 font-medium">Nombre</th><th className="px-6 py-3 font-medium">Correo</th><th className="px-6 py-3 font-medium">Rol</th><th className="px-6 py-3 font-medium">Estado</th><th className="px-6 py-3 font-medium">Creado</th><th className="px-6 py-3" /></tr></thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.map((user) => <tr key={user.id} className="text-slate-700"><td className="px-6 py-4 font-medium text-slate-950">{user.name}</td><td className="px-6 py-4">{user.email}</td><td className="px-6 py-4">{roleLabels[user.role]}</td><td className="px-6 py-4"><span className={user.is_active ? "text-emerald-700" : "text-slate-500"}>{user.is_active ? "Activo" : "Inactivo"}</span></td><td className="px-6 py-4 text-slate-500">{new Intl.DateTimeFormat("es-CL", { dateStyle: "medium" }).format(new Date(user.created_at))}</td><td className="px-6 py-4 text-right whitespace-nowrap"><button type="button" onClick={() => startEdit(user)} className="mr-3 font-medium text-slate-700 hover:text-slate-950">Editar</button><button type="button" onClick={() => void toggleStatus(user)} className="font-medium text-slate-700 hover:text-slate-950">{user.is_active ? "Desactivar" : "Activar"}</button></td></tr>)}
                    {users.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-600">Aún no hay usuarios registrados.</td></tr>}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <UserForm form={form} setForm={setForm} isSaving={isSaving} isEditing={editingUser !== null} onSubmit={editingUser ? submitEdit : submitCreate} onCancel={editingUser ? () => { setEditingUser(null); setForm(emptyForm); } : undefined} />
        </section>
      </div>
    </main>
  );
}

function UserForm({ form, setForm, isSaving, isEditing, onSubmit, onCancel }: { form: UserFormState; setForm: (value: UserFormState) => void; isSaving: boolean; isEditing: boolean; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel?: () => void }) {
  const updateField = <Key extends keyof UserFormState>(key: Key, value: UserFormState[Key]) => setForm({ ...form, [key]: value });
  return (
    <section className="h-fit border border-slate-200 bg-white p-6"><h2 className="font-semibold text-slate-950">{isEditing ? "Editar usuario" : "Nuevo usuario"}</h2><form className="mt-6 space-y-5" noValidate onSubmit={onSubmit}>
      <TextField id="user-name" label="Nombre" required value={form.name} onChange={(event) => updateField("name", event.target.value)} />
      <TextField id="user-email" label="Correo electrónico" type="email" required value={form.email} onChange={(event) => updateField("email", event.target.value)} />
      {!isEditing && <TextField id="user-password" label="Contraseña" type="password" required minLength={12} autoComplete="new-password" value={form.password} onChange={(event) => updateField("password", event.target.value)} />}
      <div><label htmlFor="user-role" className="mb-2 block text-sm font-medium text-slate-800">Rol</label><select id="user-role" value={form.role} onChange={(event) => updateField("role", event.target.value as UserFormState["role"])} className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-[15px] text-slate-950 outline-none focus-visible:border-slate-900 focus-visible:ring-4 focus-visible:ring-slate-900/10"><option value="ADMIN">Administrador</option><option value="RESPONSIBLE">Responsable</option><option value="READER">Lector</option></select></div>
      <PrimaryButton type="submit" isLoading={isSaving} loadingLabel={isEditing ? "Guardando..." : "Creando..."}>{isEditing ? "Guardar cambios" : "Crear usuario"}</PrimaryButton>
      {onCancel && <button type="button" onClick={onCancel} className="w-full py-2 text-sm font-medium text-slate-600 hover:text-slate-950">Cancelar</button>}
    </form></section>
  );
}
