"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { getCurrentUser } from "@/lib/api";

export function DashboardGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    getCurrentUser().then(() => setIsAuthenticated(true)).catch(() => router.replace("/login"));
  }, [router]);

  if (!isAuthenticated) {
    return <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 text-sm text-slate-600">Verificando sesión…</main>;
  }
  return children;
}
