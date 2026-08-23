import Link from "next/link";

export function AICommandBar({ visible, compact = false }: { visible: boolean; compact?: boolean }) {
  if (!visible) return null;
  return <div className="border-b border-slate-200 bg-slate-50"><div className="mx-auto max-w-[1360px] px-4 py-2 md:px-6 lg:px-8"><Link href="/organization/document-analysis" className={`group flex h-10 items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 text-left shadow-sm transition hover:border-slate-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10 ${compact ? "max-w-[1120px]" : ""}`}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-[#111c30] text-sm text-white" aria-hidden="true">✦</span><span className="min-w-0 flex-1 text-[15px] text-slate-500">Pregunta sobre tus obligaciones o inicia una acción...</span><span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-lg text-slate-500 transition group-hover:bg-slate-100 group-hover:text-[#111c30]" aria-hidden="true">→</span></Link></div></div>;
}
