"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppNavigation } from "@/components/auth/app-navigation";
import { BrandMark } from "@/components/branding/brand-mark";
import { AICommandBar } from "@/components/ui/ai-command-bar";
import { BuildingIcon, ChevronDownIcon } from "@/components/ui/icons";
import type { AuthenticatedUser } from "@/lib/api";

export function AuthenticatedHeader({ user }: { user: AuthenticatedUser }) {
  return <header className="no-print sticky top-0 z-20 border-b border-white/10 bg-[#111c30] text-white"><div className="mx-auto flex min-h-14 w-full max-w-[1600px] items-center gap-5 px-4 py-2 md:px-6 lg:gap-8 lg:px-8 xl:px-10"><div className="shrink-0"><BrandMark tone="dark" compact title="Cumplimiento Ambiental" /></div><div className="min-w-0 flex-1 lg:flex lg:justify-center"><AppNavigation user={user} /></div><div className="hidden min-w-0 items-center gap-2 rounded-[10px] border border-white/10 bg-white/5 px-3 py-2 text-right text-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,.08)] transition duration-200 hover:border-white/20 hover:bg-white/10 sm:flex"><BuildingIcon className="h-4 w-4 shrink-0 text-slate-300" /><div className="min-w-0"><p className="truncate font-medium">{user.organization.name}</p><p className="truncate text-[13px] text-slate-300">{user.name} · {user.role === "ADMIN" ? "Administrador" : user.role === "RESPONSIBLE" ? "Responsable" : "Lector"}</p></div><ChevronDownIcon className="h-4 w-4 shrink-0 text-slate-400 transition duration-200 group-hover:text-white" /></div></div></header>;
}

export function AppShell({ user, children }: { user: AuthenticatedUser; children: ReactNode }) {
  const pathname = usePathname();
  const showCommandBar = user.role === "ADMIN" && (pathname === "/dashboard" || pathname === "/organization/document-analysis");
  return <div className="app-workspace min-h-screen"><AuthenticatedHeader user={user} /><AICommandBar visible={showCommandBar} compact={pathname === "/dashboard"} /><main className="authenticated-workspace mx-auto w-full max-w-[1600px] px-4 py-8 md:px-6 md:py-10 lg:px-8 xl:px-10">{children}</main></div>;
}
