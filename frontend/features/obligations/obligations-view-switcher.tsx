export type ObligationViewMode = "table" | "planner";

export function ObligationsViewSwitcher({
  value,
  onChange,
}: {
  value: ObligationViewMode;
  onChange: (value: ObligationViewMode) => void;
}) {
  return (
    <div aria-label="Vista de obligaciones" className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
      {([
        ["table", "☷", "Tabla"],
        ["planner", "▦", "Planner"],
      ] as const).map(([mode, icon, label]) => (
        <button
          aria-pressed={value === mode}
          className={`inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-sm font-semibold transition ${value === mode ? "bg-[#172f57] text-white shadow-sm" : "text-slate-600 hover:bg-slate-100 hover:text-[#111c30]"}`}
          key={mode}
          onClick={() => onChange(mode)}
          type="button"
        >
          <span aria-hidden="true">{icon}</span>{label}
        </button>
      ))}
    </div>
  );
}
