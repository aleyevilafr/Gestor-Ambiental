"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthenticatedUser } from "@/lib/api";

const items = [["/dashboard", "Dashboard"], ["/obligations", "Obligaciones"], ["/users", "Usuarios"], ["/reports/compliance", "Reportes"], ["/organization/document-analysis", "Asistente IA"]] as const;

export function AppNavigation({ user }: { user: AuthenticatedUser }) {
  const path = usePathname();
  const links = items.filter(([href]) => (href !== "/users" && href !== "/organization/document-analysis") || user.role === "ADMIN");
  return <nav aria-label="Navegación principal" className="flex overflow-x-auto"><div className="flex min-w-max gap-4 sm:gap-6 lg:gap-7">{links.map(([href, label]) => { const active = path === href || path.startsWith(`${href}/`); return <Link key={href} href={href} className={`border-b-2 px-1 py-3 text-[15px] font-medium transition ${active ? "border-[#111c30] text-[#111c30]" : "border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900"}`}>{label}</Link>; })}</div></nav>;
}
