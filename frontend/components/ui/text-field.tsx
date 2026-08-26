import type { InputHTMLAttributes, ReactNode } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
};

export function TextField({ id, label, error, icon, trailing, className = "", ...inputProps }: TextFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-medium text-slate-800">{label}</label>
      <div className="relative">
        {icon && <span className="pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center text-slate-400">{icon}</span>}
        <input
          id={id}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={`control-field h-11 w-full rounded-[10px] border text-[15px] text-slate-950 outline-none transition placeholder:text-slate-400 ${icon ? "pl-11" : "pl-3"} ${trailing ? "pr-11" : "pr-3"} ${error ? "border-red-500 focus-visible:border-red-600 focus-visible:ring-red-600/10" : ""} ${className}`}
          {...inputProps}
        />
        {trailing && <span className="absolute inset-y-0 right-0 flex w-11 items-center justify-center">{trailing}</span>}
      </div>
      {error && <p id={errorId} className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
    </div>
  );
}
