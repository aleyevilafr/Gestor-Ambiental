import Link from "next/link";

export function AICommandBar({ visible, compact = false }: { visible: boolean; compact?: boolean }) {
  if (!visible) return null;
  return <div className="border-b [border-color:var(--border-subtle)] bg-[var(--surface-muted)]"><div className="mx-auto w-full max-w-[1600px] px-4 py-3 md:px-6 lg:px-8 xl:px-10"><Link href="/organization/document-analysis" className={`app-card group mx-auto flex h-10 items-center gap-3 border px-3 text-left transition duration-200 hover:-translate-y-px hover:border-[var(--blue-accent)] hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10 ${compact ? "max-w-[1080px]" : "max-w-[1280px]"}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] bg-[#111c30] text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,.14)]" aria-hidden="true">✦</span><span className="min-w-0 flex-1 text-[15px] text-slate-500">Pregunta sobre tus obligaciones o inicia una acción...</span><span className="icon-button grid h-7 w-7 shrink-0 place-items-center rounded-[9px] text-lg text-slate-500 group-hover:text-[#111c30]" aria-hidden="true">→</span></Link></div></div>;
}
