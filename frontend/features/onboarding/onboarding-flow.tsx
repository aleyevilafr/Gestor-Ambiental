"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "@/components/ui/icons";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { ApiError, registerOrganization } from "@/lib/api";
import { isValidChileanRut } from "@/lib/rut";

type OnboardingStep = "organization" | "administrator" | "complete";

type OrganizationErrors = {
  organizationName?: string;
  rut?: string;
};

type AdministratorErrors = {
  administratorName?: string;
  email?: string;
  password?: string;
  passwordConfirmation?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function OnboardingFlow() {
  const [step, setStep] = useState<OnboardingStep>("organization");
  const [organizationName, setOrganizationName] = useState("");
  const [rut, setRut] = useState("");
  const [administratorName, setAdministratorName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [organizationErrors, setOrganizationErrors] = useState<OrganizationErrors>({});
  const [administratorErrors, setAdministratorErrors] = useState<AdministratorErrors>({});
  const [submissionError, setSubmissionError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateOrganization(): OrganizationErrors {
    const errors: OrganizationErrors = {};
    if (!organizationName.trim()) errors.organizationName = "Ingresa el nombre de la organización.";
    if (!rut.trim()) errors.rut = "Ingresa el RUT de la organización.";
    else if (!isValidChileanRut(rut)) errors.rut = "Ingresa un RUT válido.";
    return errors;
  }

  function validateAdministrator(): AdministratorErrors {
    const errors: AdministratorErrors = {};
    if (!administratorName.trim()) errors.administratorName = "Ingresa tu nombre.";
    if (!emailPattern.test(email.trim())) errors.email = "Ingresa un correo electrónico válido.";
    if (!password) errors.password = "Ingresa una contraseña.";
    else if (password.length < 12) errors.password = "La contraseña debe tener al menos 12 caracteres.";
    if (!passwordConfirmation) errors.passwordConfirmation = "Confirma tu contraseña.";
    else if (password !== passwordConfirmation) errors.passwordConfirmation = "Las contraseñas no coinciden.";
    return errors;
  }

  function handleOrganizationSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmissionError("");
    const errors = validateOrganization();
    setOrganizationErrors(errors);
    if (Object.keys(errors).length === 0) setStep("administrator");
  }

  async function handleAdministratorSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateAdministrator();
    setAdministratorErrors(errors);
    setSubmissionError("");
    if (Object.keys(errors).length > 0) return;

    setIsSubmitting(true);
    try {
      await registerOrganization({
        organization_name: organizationName.trim(),
        rut,
        name: administratorName.trim(),
        email: email.trim(),
        password,
      });
      setStep("complete");
    } catch (error) {
      setSubmissionError(error instanceof ApiError ? error.message : "No fue posible crear la organización. Inténtalo nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (step === "complete") {
    return (
      <section aria-labelledby="onboarding-complete-title">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-lg text-white" aria-hidden="true">✓</div>
        <h2 id="onboarding-complete-title" className="text-3xl font-semibold tracking-tight text-slate-950">Tu organización está lista</h2>
        <p className="mt-3 text-[15px] leading-6 text-slate-600">Ya puedes comenzar a gestionar tus obligaciones ambientales.</p>
        <div className="mt-9">
          <Link href="/dashboard" className="inline-flex h-12 w-full items-center justify-center rounded-lg bg-[#111c30] px-4 text-sm font-semibold text-white transition hover:bg-[#1a2943] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20">Ir al dashboard</Link>
        </div>
      </section>
    );
  }

  const isOrganizationStep = step === "organization";
  const stepNumber = isOrganizationStep ? 1 : 2;
  const stepLabel = isOrganizationStep ? "Datos de la organización" : "Cuenta de administrador";

  return (
    <section aria-labelledby="onboarding-title">
      <div className="mb-10">
        <div className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-800">Paso {stepNumber} de 2</span>
          <span className="text-slate-500">{stepLabel}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label={`Paso ${stepNumber} de 2`} aria-valuemin={1} aria-valuemax={2} aria-valuenow={stepNumber}>
          <div className="h-full rounded-full bg-[#111c30] transition-all duration-200" style={{ width: `${stepNumber * 50}%` }} />
        </div>
      </div>

      {isOrganizationStep ? (
        <form noValidate onSubmit={handleOrganizationSubmit}>
          <header>
            <h2 id="onboarding-title" className="text-3xl font-semibold tracking-tight text-slate-950">Configura tu organización</h2>
            <p className="mt-3 text-[15px] leading-6 text-slate-600">Completa los datos básicos de tu organización para comenzar a gestionar sus obligaciones ambientales.</p>
          </header>
          <div className="mt-9 space-y-5">
            <TextField id="organization-name" label="Nombre de la organización" placeholder="Ej. Empresa ABC SpA" autoComplete="organization" value={organizationName} onChange={(event) => setOrganizationName(event.target.value)} error={organizationErrors.organizationName} />
            <TextField id="rut" label="RUT" placeholder="12.345.678-9" value={rut} onChange={(event) => setRut(event.target.value)} error={organizationErrors.rut} />
          </div>
          <div className="mt-8"><PrimaryButton type="submit">Continuar</PrimaryButton></div>
        </form>
      ) : (
        <form noValidate onSubmit={handleAdministratorSubmit}>
          <header>
            <h2 id="onboarding-title" className="text-3xl font-semibold tracking-tight text-slate-950">Configura tu cuenta</h2>
            <p className="mt-3 text-[15px] leading-6 text-slate-600">Estos serán los datos del administrador principal de la organización.</p>
          </header>
          <div className="mt-9 space-y-5">
            <TextField id="administrator-name" label="Nombre" autoComplete="name" value={administratorName} onChange={(event) => setAdministratorName(event.target.value)} error={administratorErrors.administratorName} />
            <TextField id="administrator-email" label="Correo electrónico" type="email" autoComplete="email" placeholder="nombre@empresa.cl" value={email} onChange={(event) => setEmail(event.target.value)} error={administratorErrors.email} icon={<MailIcon className="h-5 w-5" />} />
            <TextField id="administrator-password" label="Contraseña" type={showPasswords ? "text" : "password"} autoComplete="new-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} error={administratorErrors.password} icon={<LockIcon className="h-5 w-5" />} trailing={<PasswordVisibilityButton showPasswords={showPasswords} setShowPasswords={setShowPasswords} />} />
            <TextField id="administrator-password-confirmation" label="Confirmar contraseña" type={showPasswords ? "text" : "password"} autoComplete="new-password" placeholder="••••••••" value={passwordConfirmation} onChange={(event) => setPasswordConfirmation(event.target.value)} error={administratorErrors.passwordConfirmation} icon={<LockIcon className="h-5 w-5" />} />
          </div>
          <div className="mt-8 space-y-3">
            <PrimaryButton type="submit" isLoading={isSubmitting} loadingLabel="Creando organización...">Crear organización</PrimaryButton>
            {submissionError && <p className="text-center text-sm text-red-700" role="alert">{submissionError}</p>}
            <button type="button" className="w-full rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/10" onClick={() => setStep("organization")}>Volver</button>
          </div>
        </form>
      )}
    </section>
  );
}

function PasswordVisibilityButton({ showPasswords, setShowPasswords }: { showPasswords: boolean; setShowPasswords: (value: boolean | ((current: boolean) => boolean)) => void }) {
  return (
    <button type="button" onClick={() => setShowPasswords((visible) => !visible)} className="rounded p-1.5 text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30" aria-label={showPasswords ? "Ocultar contraseñas" : "Mostrar contraseñas"}>
      {showPasswords ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
    </button>
  );
}
