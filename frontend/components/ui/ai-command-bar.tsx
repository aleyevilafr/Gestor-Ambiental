import Link from "next/link";

export function AICommandBar({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return <div className="border-b border-slate-200 bg-slate-50"><div className="mx-auto max-w-[1360px] px-5 py-5 sm:px-8 lg:px-10"><Link href="/organization/document-analysis" className="group flex items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3.5 text-left shadow-sm transition hover:border-slate-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#111c30] text-base text-white" aria-hidden="true">✦</span><span className="min-w-0 flex-1 text-[15px] text-slate-500">Pregunta sobre tus obligaciones o inicia una acción...</span><span className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-lg text-slate-500 transition group-hover:bg-slate-100 group-hover:text-[#111c30]" aria-hidden="true">→</span></Link></div></div>;
}
