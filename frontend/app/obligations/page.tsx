"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardGate } from "@/components/auth/dashboard-gate";
import { Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { ObligationDetailModal } from "@/features/obligations/detail/obligation-detail-modal";
import { ObligationTable } from "@/features/obligations/table/obligation-table";
import {
  getCurrentUser,
  getObligations,
  getUsers,
  type AuthenticatedUser,
  type Obligation,
  type OrganizationUser,
} from "@/lib/api";

const statusLabels = {
  PENDING: "Pendiente",
  IN_PROGRESS: "En proceso",
  COMPLIANT: "Cumplida",
  OVERDUE: "Vencida",
};

export default function ObligationsPage() {
  const [items, setItems] = useState<Obligation[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [matter, setMatter] = useState("");
  const [responsible, setResponsible] = useState("");
  const [error, setError] = useState("");
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);

  useEffect(() => {
    Promise.all([getObligations(), getCurrentUser()])
      .then(([obligations, currentUser]) => {
        setItems(obligations);
        setUser(currentUser);
        if (currentUser.role === "ADMIN") {
          void getUsers().then(setUsers).catch(() => setUsers([]));
        }
      })
      .catch(() => setError("No fue posible cargar las obligaciones."));
  }, []);

  const people = useMemo(
    () =>
      [
        ...new Map(
          items
            .filter((item) => item.responsible_user)
            .map((item) => [item.responsible_user!.id, item.responsible_user!.name]),
        ).entries(),
      ],
    [items],
  );
  const matters = useMemo(
    () => [...new Set(items.map((item) => item.matter).filter(Boolean))].sort(),
    [items],
  );
  const filtered = items.filter(
    (item) =>
      (!search || item.title.toLowerCase().includes(search.toLowerCase())) &&
      (!status || item.compliance_status === status) &&
      (!matter || item.matter === matter) &&
      (!responsible || item.responsible_user_id === responsible),
  );
  const empty = filtered.length === 0;
  const handleUpdated = (updated: Obligation) => {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedObligation((current) => (current?.id === updated.id ? updated : current));
  };
  const handleOpenDetail = (obligation: Obligation) => setSelectedObligation(obligation);
  const handleCloseDetail = () => setSelectedObligation(null);

  return (
    <DashboardGate>
      <div className="space-y-5">
        <PageHeader
          action={
            user?.role === "ADMIN" ? (
              <Link
                className="button-primary inline-flex rounded-[10px] px-4 py-3 text-sm font-semibold text-white"
                href="/obligations/new"
              >
                Nueva obligación
              </Link>
            ) : undefined
          }
          description="Organiza el trabajo y realiza seguimiento de las obligaciones ambientales."
          title="Obligaciones"
        />

        <Card className="dashboard-panel bg-[var(--surface-cool)] p-4 sm:p-5">
          <div className="grid items-center gap-3 md:grid-cols-2 xl:grid-cols-4">
            <input
              className="control-field h-11 rounded-[10px] border px-3 text-[15px] outline-none transition"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por título"
              value={search}
            />
            <select
              className="control-field h-11 rounded-[10px] border px-3 text-[15px] outline-none transition"
              onChange={(event) => setStatus(event.target.value)}
              value={status}
            >
              <option value="">Todos los estados</option>
              {Object.entries(statusLabels).map(([value, itemLabel]) => (
                <option key={value} value={value}>
                  {itemLabel}
                </option>
              ))}
            </select>
            <select
              className="control-field h-11 rounded-[10px] border px-3 text-[15px] outline-none transition"
              onChange={(event) => setMatter(event.target.value)}
              value={matter}
            >
              <option value="">Todas las materias</option>
              {matters.map((itemMatter) => (
                <option key={itemMatter} value={itemMatter}>
                  {itemMatter}
                </option>
              ))}
            </select>
            <select
              className="control-field h-11 rounded-[10px] border px-3 text-[15px] outline-none transition"
              onChange={(event) => setResponsible(event.target.value)}
              value={responsible}
            >
              <option value="">Todos los responsables</option>
              {people.map(([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <p className="mt-4 border-t border-slate-200/80 pt-4 text-sm text-slate-500">
            {filtered.length} {filtered.length === 1 ? "obligación" : "obligaciones"}
          </p>
        </Card>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : empty ? (
          <EmptyState
            description={
              items.length === 0
                ? "Registra una obligación ambiental para comenzar el seguimiento."
                : "Prueba ajustando los filtros de búsqueda."
            }
            title={items.length === 0 ? "Aún no hay obligaciones" : "No hay resultados"}
          />
        ) : (
          <Card className="overflow-hidden bg-[var(--surface)]">
            <ObligationTable
              items={filtered}
              onOpenDetail={handleOpenDetail}
              onUpdated={handleUpdated}
              user={user}
              users={users}
            />
          </Card>
        )}
      </div>
      {selectedObligation ? (
        <ObligationDetailModal
          obligation={selectedObligation}
          onClose={handleCloseDetail}
          users={users}
        />
      ) : null}
    </DashboardGate>
  );
}
