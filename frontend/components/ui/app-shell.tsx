"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AppNavigation } from "@/components/auth/app-navigation";
import { BrandMark } from "@/components/branding/brand-mark";
import { AICommandBar } from "@/components/ui/ai-command-bar";
import type { AuthenticatedUser } from "@/lib/api";

export function AuthenticatedHeader({ user }: { user: AuthenticatedUser }) {
  return <header className="no-print sticky top-0 z-20"><div className="bg-[#111c30] text-white"><div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-10"><BrandMark tone="dark" compact title="Cumplimiento Ambiental" /><div className="min-w-0 text-right text-[15px]"><p className="truncate font-medium">{user.organization.name}</p><p className="truncate text-[13px] text-slate-300">{user.name} · {user.role === "ADMIN" ? "Administrador" : user.role === "RESPONSIBLE" ? "Responsable" : "Lector"}</p></div></div></div><div className="border-b border-slate-200 bg-white"><div className="mx-auto max-w-[1360px] px-5 sm:px-8 lg:px-10"><AppNavigation user={user} /></div></div></header>;
}

export function AppShell({ user, children }: { user: AuthenticatedUser; children: ReactNode }) {
  const pathname = usePathname();
  const showCommandBar = user.role === "ADMIN" && (pathname === "/dashboard" || pathname === "/organization/document-analysis");
  return <div className="min-h-screen bg-slate-50"><AuthenticatedHeader user={user} /><AICommandBar visible={showCommandBar} /><main className="mx-auto max-w-[1360px] px-5 py-9 sm:px-8 sm:py-10 lg:px-10">{children}</main></div>;
}
