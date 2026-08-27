import Link from "next/link";
import { Card } from "@/components/ui/surface";

const actions = [
  { label: "Crear obligación", href: "/obligations/new", primary: true },
  { label: "Ver vencidas", href: "/obligations" },
  { label: "Ver sin responsable", href: "/obligations" },
  { label: "Ir a obligaciones", href: "/obligations" },
  { label: "Generar reporte", href: "/reports/compliance" },
];

export function QuickActions({ canCreate }: { canCreate: boolean }) {
  const visibleActions = actions.filter((action) => canCreate || !action.primary);
  return <Card className="dashboard-panel bg-[var(--surface-warm)] p-4 sm:p-5"><div><h2 className="text-lg font-semibold text-[#111c30]">Acciones rápidas</h2><p className="mt-0.5 text-sm text-slate-600">Accesos directos para continuar el trabajo.</p></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{visibleActions.map((action) => <Link key={action.label} href={action.href} className={action.primary ? "button-primary inline-flex min-h-10 items-center justify-center rounded-[10px] px-3 text-sm font-semibold text-white" : "button-secondary inline-flex min-h-10 items-center justify-center rounded-[10px] px-3 text-sm font-medium text-[#172033]"}>{action.label}</Link>)}</div></Card>;
}
