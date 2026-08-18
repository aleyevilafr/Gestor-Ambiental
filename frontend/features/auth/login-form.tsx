"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "@/components/ui/icons";
import { PrimaryButton } from "@/components/ui/primary-button";
import { TextField } from "@/components/ui/text-field";
import { ApiError, login } from "@/lib/api";

type LoginErrors = {
  email?: string;
  password?: string;
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberDevice, setRememberDevice] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const router = useRouter();

  function validate(): LoginErrors {
    const nextErrors: LoginErrors = {};
    if (!emailPattern.test(email.trim())) nextErrors.email = "Ingresa un correo electrónico válido.";
    if (!password) nextErrors.password = "Ingresa tu contraseña.";
    return nextErrors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validate();
    setErrors(nextErrors);
    setNotice("");

    if (Object.keys(nextErrors).length > 0) return;

    setIsSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      router.replace("/dashboard");
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "No fue posible iniciar sesión. Inténtalo nuevamente.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-9" noValidate onSubmit={handleSubmit}>
      <div className="space-y-5">
        <TextField id="email" label="Correo electrónico" type="email" autoComplete="email" placeholder="nombre@empresa.cl" value={email} onChange={(event) => setEmail(event.target.value)} error={errors.email} icon={<MailIcon className="h-5 w-5" />} />
        <TextField
          id="password"
          label="Contraseña"
          type={showPassword ? "text" : "password"}
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          icon={<LockIcon className="h-5 w-5" />}
          trailing={
            <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="rounded p-1.5 text-slate-500 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30" aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}>
              {showPassword ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
            </button>
          }
        />
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-slate-700">
          <input type="checkbox" checked={rememberDevice} onChange={(event) => setRememberDevice(event.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#111c30] focus:ring-[#111c30]" />
          Recordar este dispositivo
        </label>
        <a href="#" className="text-sm font-medium text-slate-800 underline-offset-4 hover:underline focus-visible:rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900/30">¿Olvidaste tu contraseña?</a>
      </div>

      <div className="mt-7">
        <PrimaryButton type="submit" isLoading={isSubmitting} loadingLabel="Ingresando...">Ingresar</PrimaryButton>
        {notice && <p className="mt-3 text-center text-sm text-slate-600" role="status">{notice}</p>}
      </div>
      <p className="mt-7 text-center text-sm text-slate-600">¿Necesitas acceso? Contacta al administrador.</p>
    </form>
  );
}
