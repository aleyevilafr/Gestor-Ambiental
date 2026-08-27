import type { ComponentType, ReactNode } from "react";

type KpiTone = "neutral" | "success" | "info" | "warning" | "danger" | "violet";
type KpiMetric = { label: string; value: ReactNode; helper?: string; tone?: KpiTone; icon?: ComponentType<{ className?: string }>; featured?: boolean; progress?: number };

const color: Record<KpiTone, string> = { neutral: "text-[#111c30]", success: "text-emerald-700", info: "text-sky-700", warning: "text-amber-700", danger: "text-red-700", violet: "text-violet-700" };
const hover: Record<KpiTone, string> = { neutral: "hover:border-slate-300 hover:bg-slate-50", success: "hover:border-slate-300 hover:bg-slate-50", info: "hover:border-sky-200 hover:bg-sky-50/60", warning: "hover:border-amber-200 hover:bg-amber-50/60", danger: "hover:border-red-200 hover:bg-red-50/60", violet: "hover:border-violet-200 hover:bg-violet-50/60" };
const surface: Record<KpiTone, string> = { neutral: "bg-[var(--surface)]", success: "bg-[var(--surface)]", info: "bg-[var(--surface-cool)]", warning: "bg-[var(--surface-warm)]", danger: "bg-[#fff8f6]", violet: "bg-[#fbf9ff]" };

export function KpiStrip({ metrics, featuredStyle = "navy", uniformHeight = false }: { metrics: KpiMetric[]; featuredStyle?: "navy" | "light"; uniformHeight?: boolean }) {
  const columns = metrics.length === 5 ? "xl:grid-cols-5" : metrics.length === 6 ? "xl:grid-cols-6" : "lg:grid-cols-4";
  const isLightFeatured = featuredStyle === "light";
  return <section className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${columns}`} aria-label="Resumen de cumplimiento">{metrics.map((metric) => {
    const Icon = metric.icon;
    const tone = metric.tone ?? "neutral";
    const featuredSurface = isLightFeatured ? "border-[#d9e3ec] bg-[#f9fbfd] text-[#132544] shadow-[inset_0_1px_0_rgba(255,255,255,.72),var(--shadow-card)] hover:border-[#b9cde0] hover:bg-[#f8fafc] hover:shadow-[var(--shadow-card-hover)]" : "border-slate-700 bg-[#111c30] text-white shadow-[inset_0_1px_0_rgba(255,255,255,.10),0_4px_10px_rgba(15,23,42,.12),0_12px_28px_rgba(15,23,42,.10)] hover:border-[#28436e] hover:bg-[#172744]";
    const featuredText = isLightFeatured ? "text-[#132544]" : "text-white";
    const featuredMutedText = isLightFeatured ? "text-slate-600" : "text-slate-300";
    const featuredIcon = isLightFeatured ? "border border-[#d9e3ec] bg-[#eaf3fa] text-[#11284a] shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_1px_2px_rgba(15,23,42,.05)] group-hover:bg-[#e1eff9]" : "bg-sky-300/15 text-sky-100 shadow-[inset_0_1px_0_rgba(255,255,255,.12)] group-hover:bg-sky-300/20";
    return <article key={metric.label} className={`group rounded-2xl border ${uniformHeight ? "min-h-[136px] p-4" : "p-5"} transition duration-200 ease-out motion-safe:hover:-translate-y-px focus-within:ring-2 focus-within:ring-slate-900/10 ${metric.featured ? featuredSurface : `${surface[tone]} border-[var(--border-subtle)] shadow-[inset_0_1px_0_rgba(255,255,255,.68),var(--shadow-sm)] ${hover[tone]}`}`}><div className="flex items-start justify-between gap-3"><div><p className={`text-sm font-medium ${metric.featured ? featuredMutedText : "text-slate-500"}`}>{metric.label}</p><p className={`mt-1.5 text-3xl font-semibold tracking-tight ${metric.featured ? featuredText : color[tone]}`}>{metric.value}</p></div>{Icon && <span className={`grid h-9 w-9 place-items-center rounded-[10px] transition duration-200 ${metric.featured ? featuredIcon : `bg-white/80 ${color[tone]} shadow-[inset_0_1px_0_rgba(255,255,255,.75),0_1px_2px_rgba(15,23,42,.05)] group-hover:bg-white`}`}><Icon className="h-[18px] w-[18px]" /></span>}</div>{metric.progress !== undefined && <div className={`mt-4 h-1.5 overflow-hidden rounded-full ${metric.featured && !isLightFeatured ? "bg-white/15" : "bg-slate-200/80"}`}><div className="h-full rounded-full bg-emerald-400" style={{ width: `${metric.progress}%` }} /></div>}{metric.helper && <p className={`mt-2.5 text-xs ${metric.featured ? featuredMutedText : "text-slate-500"}`}>{metric.helper}</p>}</article>;
  })}</section>;
}
