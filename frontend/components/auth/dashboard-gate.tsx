"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "@/lib/api";
import type { AuthenticatedUser } from "@/lib/api";
import { AppNavigation } from "@/components/auth/app-navigation";

export function DashboardGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthenticatedUser | null>(null);

  useEffect(() => {
    getCurrentUser().then(setUser).catch(() => router.replace("/login"));
  }, [router]);

  if (!user) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 text-sm text-slate-600">Verificando sesión…</main>;
  }
  return <><AppNavigation user={user} />{children}</>;
}
