type BrandMarkProps = {
  tone: "dark" | "light";
  compact?: boolean;
};

export function BrandMark({ tone, compact = false }: BrandMarkProps) {
  const isDark = tone === "dark";

  return (
    <div className="flex items-center gap-3">
      <span className={`grid h-9 w-9 place-items-center rounded-lg border ${isDark ? "border-slate-500 bg-slate-800 text-white" : "border-slate-300 bg-white text-slate-950"}`} aria-hidden="true">
        <span className="grid h-4 w-4 grid-cols-2 gap-[2px]">
          <span className="rounded-[2px] bg-current" />
          <span className="rounded-[2px] bg-current opacity-50" />
          <span className="rounded-[2px] bg-current opacity-50" />
          <span className="rounded-[2px] bg-current" />
        </span>
      </span>
      <span className={`text-sm font-semibold leading-tight ${isDark ? "text-white" : "text-slate-950"}`}>
        <span className="block">Plataforma de Gestión</span>
        {!compact && <span className={`block font-normal ${isDark ? "text-slate-400" : "text-slate-500"}`}>de Cumplimiento Ambiental</span>}
      </span>
    </div>
  );
}
