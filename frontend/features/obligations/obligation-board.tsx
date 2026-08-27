import { StatusBadge } from "@/components/ui/surface";
import { UsersIcon } from "@/components/ui/icons";
import type { Obligation } from "@/lib/api";

const columns = [
  { status: "PENDING", label: "Pendientes", surface: "bg-[var(--surface-warm)] border-amber-100/80", count: "bg-amber-50 text-amber-800 border-amber-100", badge: "warning" },
  { status: "IN_PROGRESS", label: "En proceso", surface: "bg-[var(--surface-cool)] border-sky-100/80", count: "bg-sky-50 text-sky-800 border-sky-100", badge: "info" },
  { status: "COMPLIANT", label: "Cumplidas", surface: "bg-emerald-50/55 border-emerald-100/80", count: "bg-emerald-50 text-emerald-800 border-emerald-100", badge: "success" },
  { status: "OVERDUE", label: "Vencidas", surface: "bg-red-50/55 border-red-100/80", count: "bg-red-50 text-red-800 border-red-100", badge: "danger" },
] as const;

const labels = { PENDING: "Pendiente", IN_PROGRESS: "En proceso", COMPLIANT: "Cumplida", OVERDUE: "Vencida" };

function isDueSoon(item: Obligation) {
  if (!item.deadline || item.compliance_status === "COMPLIANT") return false;
  const deadline = new Date(`${item.deadline}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threshold = new Date(today);
  threshold.setDate(threshold.getDate() + 30);
  return deadline >= today && deadline <= threshold;
}

function ObligationCard({ item, selected, onSelect }: { item: Obligation; selected: boolean; onSelect: (item: Obligation, trigger: HTMLButtonElement) => void }) {
  const isOverdue = item.compliance_status === "OVERDUE";
  const dueSoon = isDueSoon(item);
  const dateClass = isOverdue ? "text-red-700" : dueSoon ? "text-amber-800" : "text-slate-500";
  return <button type="button" onClick={(event) => onSelect(item, event.currentTarget)} aria-pressed={selected} className={`block w-full rounded-2xl border bg-[var(--surface)] p-4 text-left shadow-[var(--shadow-card)] transition duration-200 hover:-translate-y-px hover:border-[#b9cde0] hover:shadow-[var(--shadow-card-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111c30]/30 ${selected ? "border-[#4f86b7] ring-1 ring-[#4f86b7]/25" : "border-[var(--border-subtle)]"}`}><div className="flex items-start justify-between gap-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{item.matter}</span><StatusBadge tone={isOverdue ? "danger" : item.compliance_status === "COMPLIANT" ? "success" : item.compliance_status === "IN_PROGRESS" ? "info" : "warning"}>{labels[item.compliance_status]}</StatusBadge></div><h3 className="mt-3 line-clamp-2 text-[15px] font-semibold leading-5 text-[#111c30]">{item.title}</h3>{item.regulatory_source && <p className="mt-1 truncate text-xs text-slate-500">{item.regulatory_source}</p>}<div className="mt-4 space-y-1.5 text-xs"><p className={`flex items-center gap-1.5 ${item.responsible_user ? "text-slate-600" : "text-violet-700"}`}><UsersIcon className={`h-3.5 w-3.5 ${item.responsible_user ? "text-slate-400" : "text-violet-400"}`} />{item.responsible_user?.name ?? "Sin responsable"}</p><p className={`font-medium ${dateClass}`}>Fecha límite: {item.deadline ?? "Sin fecha"}{isOverdue ? " · Vencida" : dueSoon ? " · Próxima" : ""}</p></div></button>;
}

export function ObligationBoard({ items, selectedId, onSelect }: { items: Obligation[]; selectedId: string | null; onSelect: (item: Obligation, trigger: HTMLButtonElement) => void }) {
  return <section className="grid items-start gap-5 md:grid-cols-2 xl:gap-6 xl:grid-cols-4" aria-label="Tablero de obligaciones">{columns.map((column) => { const columnItems = items.filter((item) => item.compliance_status === column.status); return <section key={column.status} className={`min-h-[220px] rounded-[20px] border p-4 sm:p-5 ${column.surface}`}><div className="flex items-center justify-between gap-3"><h2 className="text-sm font-semibold text-[#172033]">{column.label}</h2><span className={`grid min-w-7 place-items-center rounded-full border px-2 py-1 text-xs font-semibold ${column.count}`}>{columnItems.length}</span></div><div className="mt-4 space-y-3.5">{columnItems.length ? columnItems.map((item) => <ObligationCard key={item.id} item={item} onSelect={onSelect} selected={selectedId === item.id} />) : <p className="rounded-xl border border-white/70 bg-white/35 px-3 py-4 text-sm text-slate-500">No hay obligaciones en este estado.</p>}</div></section>; })}</section>;
}
