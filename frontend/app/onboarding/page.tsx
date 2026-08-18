import type { Metadata } from "next";

import { BrandMark } from "@/components/branding/brand-mark";
import { OnboardingFlow } from "@/features/onboarding/onboarding-flow";

export const metadata: Metadata = {
  title: "Configurar organización | Gestión de Cumplimiento Ambiental",
};

export default function OnboardingPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] lg:grid lg:grid-cols-2">
      <aside className="hidden bg-[#0b1220] px-10 py-12 text-slate-100 lg:flex lg:flex-col xl:px-16">
        <BrandMark tone="dark" />
        <div className="my-auto max-w-lg pb-12 pt-24">
          <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Primeros pasos</p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">Configura tu organización</h1>
          <p className="mt-6 max-w-md text-lg leading-8 text-slate-300">Completa los datos básicos para comenzar a gestionar el cumplimiento ambiental de tu organización.</p>
        </div>
        <div className="border-t border-slate-700/70 pt-6">
          <p className="text-sm font-medium text-slate-200">Gestión centralizada</p>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">Organiza obligaciones, responsables y evidencias en un solo lugar.</p>
        </div>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[440px]">
          <div className="mb-10 lg:hidden">
            <BrandMark tone="light" compact />
          </div>
          <OnboardingFlow />
        </div>
      </section>
    </main>
  );
}
