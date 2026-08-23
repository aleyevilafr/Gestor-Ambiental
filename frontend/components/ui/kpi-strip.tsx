import type { ReactNode } from "react";

type KpiTone = "neutral" | "success" | "info" | "warning" | "danger";

type KpiMetric = {
  label: string;
  value: ReactNode;
  helper?: string;
  tone?: KpiTone;
};

const toneClasses: Record<KpiTone, string> = {
  neutral: "text-[#111c30]",
  success: "text-emerald-700",
  info: "text-sky-700",
  warning: "text-amber-700",
  danger: "text-red-700",
};

export function KpiStrip({ metrics }: { metrics: KpiMetric[] }) {
  const columns = metrics.length === 6 ? "lg:grid-cols-6" : "lg:grid-cols-5";
  return <section className={`grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white sm:grid-cols-3 ${columns}`} aria-label="Resumen de cumplimiento">
    {metrics.map((metric, index) => <div key={metric.label} className={`min-w-0 px-5 py-4 ${index > 0 ? "border-l border-slate-100" : ""}`}>
      <p className="text-sm font-medium text-slate-500">{metric.label}</p>
      <p className={`mt-2 text-3xl font-semibold tracking-tight ${toneClasses[metric.tone ?? "neutral"]}`}>{metric.value}</p>
      {metric.helper && <p className="mt-1 text-xs text-slate-500">{metric.helper}</p>}
    </div>)}
  </section>;
}
