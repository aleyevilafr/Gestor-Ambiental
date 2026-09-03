"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { DashboardGate } from "@/components/auth/dashboard-gate";
import { Card, EmptyState, PageHeader } from "@/components/ui/surface";
import { ObligationBoard } from "@/features/obligations/board/obligation-board";
import { ObligationDetailModal } from "@/features/obligations/detail/obligation-detail-modal";
import { ObligationAnalysisModal } from "@/features/ai/obligation-analysis/obligation-analysis-modal";
import { ObligationsViewSwitcher, type ObligationViewMode } from "@/features/obligations/obligations-view-switcher";
import { ObligationTable } from "@/features/obligations/table/obligation-table";
import { requiresAttention, statusLabels } from "@/features/obligations/table/obligation-table.utils";
import {
  getCurrentUser,
  getObligations,
  getUsers,
  type AuthenticatedUser,
  type Obligation,
  type OrganizationUser,
} from "@/lib/api";

export default function ObligationsPage() {
  const [items, setItems] = useState<Obligation[]>([]);
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [users, setUsers] = useState<OrganizationUser[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [matter, setMatter] = useState("");
  const [responsible, setResponsible] = useState("");
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ObligationViewMode>("table");
  const [error, setError] = useState("");
  const [selectedObligation, setSelectedObligation] = useState<Obligation | null>(null);
  const [analysisOpen, setAnalysisOpen] = useState(false);

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
      (!responsible || item.responsible_user_id === responsible) &&
      (!attentionOnly || requiresAttention(item)) &&
      (!unassignedOnly || !item.responsible_user_id),
  );
  const empty = filtered.length === 0;
  const hasFilters = Boolean(search || status || matter || responsible || attentionOnly || unassignedOnly);
  const clearFilters = () => {
    setSearch("");
    setStatus("");
    setMatter("");
    setResponsible("");
    setAttentionOnly(false);
    setUnassignedOnly(false);
  };
  const handleUpdated = (updated: Obligation) => {
    setItems((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    setSelectedObligation((current) => (current?.id === updated.id ? updated : current));
  };
  const handleOpenDetail = (obligation: Obligation) => setSelectedObligation(obligation);
  const handleCloseDetail = () => setSelectedObligation(null);
  const handleAiCreated = (created: Obligation[]) => setItems((current) => [...created, ...current]);

  return (
    <DashboardGate>
      <div className="space-y-5">
        <PageHeader
          action={
            <div className="flex flex-wrap items-center justify-end gap-3">
              <ObligationsViewSwitcher onChange={setViewMode} value={viewMode} />
              {user?.role === "ADMIN" ? (
                <button className="rounded-[10px] border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-[#254d78] transition hover:border-sky-200 hover:bg-sky-50 hover:text-[#111c30]" onClick={() => setAnalysisOpen(true)} type="button">Analizar documento con IA</button>
              ) : null}
              {user?.role === "ADMIN" ? (
                <Link
                  className="button-primary inline-flex rounded-[10px] px-4 py-3 text-sm font-semibold text-white"
                  href="/obligations/new"
                >
                  Nueva obligación
                </Link>
              ) : null}
            </div>
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
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4">
            <button
              aria-pressed={attentionOnly}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${attentionOnly ? "border-amber-200 bg-amber-50 text-amber-900" : "border-slate-200 bg-white text-slate-600 hover:border-amber-200 hover:bg-amber-50"}`}
              onClick={() => setAttentionOnly((current) => !current)}
              type="button"
            >
              Requieren atención
            </button>
            <button
              aria-pressed={unassignedOnly}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${unassignedOnly ? "border-violet-200 bg-violet-50 text-violet-900" : "border-slate-200 bg-white text-slate-600 hover:border-violet-200 hover:bg-violet-50"}`}
              onClick={() => setUnassignedOnly((current) => !current)}
              type="button"
            >
              Sin responsable
            </button>
            {hasFilters ? (
              <button className="ml-1 text-sm font-semibold text-[#254d78] hover:text-[#111c30] hover:underline" onClick={clearFilters} type="button">
                Limpiar filtros
              </button>
            ) : null}
          </div>
          {hasFilters ? (
            <div className="mt-3 flex flex-wrap gap-2" aria-label="Filtros activos">
              {search ? <FilterChip label={`Título: ${search}`} onRemove={() => setSearch("")} /> : null}
              {status ? <FilterChip label={statusLabels[status as keyof typeof statusLabels]} onRemove={() => setStatus("")} /> : null}
              {matter ? <FilterChip label={matter} onRemove={() => setMatter("")} /> : null}
              {responsible ? <FilterChip label={people.find(([id]) => id === responsible)?.[1] ?? "Responsable"} onRemove={() => setResponsible("")} /> : null}
              {attentionOnly ? <FilterChip label="Requieren atención" onRemove={() => setAttentionOnly(false)} /> : null}
              {unassignedOnly ? <FilterChip label="Sin responsable" onRemove={() => setUnassignedOnly(false)} /> : null}
            </div>
          ) : null}
          <p className="mt-4 text-sm text-slate-500">
            {hasFilters ? `${filtered.length} de ${items.length}` : filtered.length} {items.length === 1 ? "obligación" : "obligaciones"}
          </p>
        </Card>

        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : empty && viewMode === "table" ? (
          <EmptyState
            description={
              items.length === 0
                ? "Registra una obligación ambiental para comenzar el seguimiento."
                : "Prueba ajustando los filtros de búsqueda."
            }
            title={items.length === 0 ? "Aún no hay obligaciones" : "No hay resultados"}
          />
        ) : viewMode === "table" ? (
          <Card className="overflow-hidden bg-[var(--surface)]">
            <ObligationTable
              items={filtered}
              onOpenDetail={handleOpenDetail}
              onUpdated={handleUpdated}
              user={user}
              users={users}
            />
          </Card>
        ) : (
          <ObligationBoard obligations={filtered} onOpenObligation={handleOpenDetail} />
        )}
      </div>
      {selectedObligation ? (
        <ObligationDetailModal
          obligation={selectedObligation}
          onClose={handleCloseDetail}
          onUpdated={handleUpdated}
          user={user}
          users={users}
        />
      ) : null}
      {analysisOpen ? <ObligationAnalysisModal existingTitles={items.filter((item) => item.is_active).map((item) => item.title)} onClose={() => setAnalysisOpen(false)} onCreated={handleAiCreated} /> : null}
    </DashboardGate>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700">
      {label}
      <button aria-label={`Quitar filtro ${label}`} className="rounded-full px-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" onClick={onRemove} type="button">×</button>
    </span>
  );
}
