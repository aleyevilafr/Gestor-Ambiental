import type { ButtonHTMLAttributes, ReactNode } from "react";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isLoading?: boolean;
  loadingLabel?: string;
};

export function PrimaryButton({ children, isLoading = false, loadingLabel = "Verificando...", disabled, className = "", ...props }: PrimaryButtonProps) {
  return (
    <button
      className={`button-primary inline-flex h-10 w-full items-center justify-center rounded-[10px] px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-slate-900/20 disabled:cursor-not-allowed disabled:bg-slate-400 ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" aria-hidden="true" />}
      {isLoading ? loadingLabel : children}
    </button>
  );
}
