import type { Metadata } from "next";

import { BrandMark } from "@/components/branding/brand-mark";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = {
  title: "Iniciar sesión | Gestión de Cumplimiento Ambiental",
};

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f7f8fa] lg:grid lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-[#0b1220] px-10 py-12 text-slate-100 lg:flex lg:flex-col xl:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_8%,rgba(71,85,105,0.3),transparent_32%),radial-gradient(circle_at_90%_88%,rgba(30,41,59,0.8),transparent_33%)]" />
        <div className="relative flex h-full flex-col">
          <BrandMark tone="dark" />
          <div className="my-auto max-w-lg pb-12 pt-24">
            <p className="mb-5 text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">Gestión y seguimiento</p>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white xl:text-5xl">Cumplimiento Ambiental</h1>
            <p className="mt-6 text-xl leading-8 text-slate-200">Gestiona tus obligaciones ambientales en un solo lugar.</p>
            <p className="mt-5 max-w-md text-base leading-7 text-slate-400">
              Organiza tus obligaciones, responsables y evidencias para mantener una visión clara del estado de cumplimiento de tu organización.
            </p>
          </div>
          <ul className="flex gap-6 border-t border-slate-700/70 pt-6 text-sm text-slate-300" aria-label="Características de la plataforma">
            <li>Gestión centralizada</li>
            <li>Control de acceso por roles</li>
          </ul>
        </div>
      </aside>

      <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
        <div className="w-full max-w-[420px]">
          <div className="mb-12 lg:hidden">
            <BrandMark tone="light" compact />
          </div>
          <header>
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">Iniciar sesión</h2>
            <p className="mt-3 text-[15px] leading-6 text-slate-600">Accede a la plataforma de gestión de cumplimiento de tu organización.</p>
          </header>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
