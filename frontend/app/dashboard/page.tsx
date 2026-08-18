import type { Metadata } from "next";

import { BrandMark } from "@/components/branding/brand-mark";
import { DashboardGate } from "@/components/auth/dashboard-gate";

export const metadata: Metadata = {
  title: "Dashboard | Gestión de Cumplimiento Ambiental",
};

export default function DashboardPlaceholderPage() {
  return (
    <DashboardGate>
      <main className="flex min-h-screen items-center justify-center bg-[#f7f8fa] px-5 py-10">
        <section className="w-full max-w-xl border border-slate-200 bg-white p-8 sm:p-10">
          <BrandMark tone="light" compact />
          <p className="mt-12 text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Espacio de trabajo</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Dashboard</h1>
          <p className="mt-4 max-w-md text-[15px] leading-7 text-slate-600">Próximamente podrás visualizar el estado de cumplimiento de tu organización.</p>
        </section>
      </main>
    </DashboardGate>
  );
}
