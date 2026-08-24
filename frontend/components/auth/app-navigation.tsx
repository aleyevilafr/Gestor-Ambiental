"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { AuthenticatedUser } from "@/lib/api";
import { DashboardIcon, ObligationIcon, UsersIcon, ClipboardIcon } from "@/components/ui/icons";

const items = [
  ["/dashboard", "Dashboard", DashboardIcon, "before:bg-[radial-gradient(circle_at_50%_100%,rgba(56,189,248,.22),transparent_65%)]", "group-hover:text-sky-200"],
  ["/obligations", "Obligaciones", ObligationIcon, "before:bg-[radial-gradient(circle_at_50%_100%,rgba(251,191,36,.20),transparent_65%)]", "group-hover:text-amber-200"],
  ["/users", "Usuarios", UsersIcon, "before:bg-[radial-gradient(circle_at_50%_100%,rgba(167,139,250,.20),transparent_65%)]", "group-hover:text-violet-200"],
  ["/reports", "Reportes", ClipboardIcon, "before:bg-[radial-gradient(circle_at_50%_100%,rgba(56,189,248,.18),transparent_65%)]", "group-hover:text-sky-200"],
] as const;

export function AppNavigation({ user }: { user: AuthenticatedUser }) {
  const path = usePathname();
  const links = items.filter(([href]) => href !== "/users" || user.role === "ADMIN");
  return <nav aria-label="Navegación principal" className="flex max-w-full overflow-x-auto rounded-lg border border-white/10 bg-white/[0.035] p-1 shadow-[inset_0_1px_0_rgba(255,255,255,.05)]"><div className="flex min-w-max gap-1 sm:gap-2 lg:gap-3">{links.map(([href, label, Icon, glow, iconHover]) => { const active = path === href || path.startsWith(`${href}/`); return <Link key={href} href={href} className={`group relative isolate flex items-center gap-2 overflow-hidden rounded-md border px-3 py-2 text-[15px] font-medium transition duration-200 ease-out before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:content-[''] before:transition-opacity before:duration-200 motion-safe:hover:-translate-y-px motion-safe:hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${glow} ${active ? "border-white/10 bg-slate-700 text-white shadow-[inset_0_1px_0_rgba(255,255,255,.08),0_1px_2px_rgba(0,0,0,.16)] before:opacity-70" : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.08] hover:text-white before:opacity-0 hover:before:opacity-100"}`}><Icon className={`h-4 w-4 shrink-0 text-slate-400 transition-colors duration-200 ${active ? "text-white" : iconHover}`} />{label}</Link>; })}</div></nav>;
}
