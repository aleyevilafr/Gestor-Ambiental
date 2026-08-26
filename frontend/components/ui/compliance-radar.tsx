export type MatterComplianceDatum = { label: string; total: number; compliant: number };

function point(angle: number, radius: number, center = 50) {
  const radians = (angle - 90) * (Math.PI / 180);
  return `${(center + Math.cos(radians) * radius).toFixed(2)},${(center + Math.sin(radians) * radius).toFixed(2)}`;
}

export function MatterComplianceRadar({ data }: { data: MatterComplianceDatum[] }) {
  if (data.length < 3) return <p className="text-sm leading-6 text-slate-600">El mapa estará disponible cuando existan obligaciones en al menos tres materias.</p>;

  const axes = data.slice(0, 6);
  const angles = axes.map((_, index) => index * (360 / axes.length));
  const percentages = axes.map((item) => item.total ? item.compliant * 100 / item.total : 0);
  const polygon = percentages.map((value, index) => point(angles[index], 10 + value * 0.30)).join(" ");
  const ariaDescription = axes.map((item) => `${item.label}: ${item.compliant} de ${item.total} cumplidas`).join("; ");

  return <div className="w-full" role="img" aria-label={`Mapa de cumplimiento por materia. ${ariaDescription}`}>
    <div className="mx-auto max-w-[330px]"><svg viewBox="0 0 100 100" className="w-full overflow-visible" aria-hidden="true">{[20, 40, 60, 80, 100].map((level) => <polygon key={level} points={angles.map((angle) => point(angle, level * 0.33)).join(" ")} fill="none" stroke="#b7c8d8" strokeOpacity={level === 100 ? 0.7 : 0.35} strokeWidth="0.45" />)}{angles.map((angle) => { const [x2, y2] = point(angle, 33).split(","); return <line key={angle} x1="50" y1="50" x2={x2} y2={y2} stroke="#c5d5e4" strokeWidth="0.35" />; })}<polygon points={polygon} fill="rgba(37, 99, 235, 0.15)" stroke="#2563eb" strokeWidth="1.2" strokeLinejoin="round" />{percentages.map((value, index) => { const [cx, cy] = point(angles[index], 10 + value * 0.30).split(","); return <circle key={axes[index].label} cx={cx} cy={cy} r="1.35" fill="#2563eb" stroke="#eff6ff" strokeWidth="0.7" />; })}<circle cx="50" cy="50" r="1.5" fill="#172033" /></svg></div><dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2 xl:grid-cols-3">{axes.map((item) => <div key={item.label} className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2"><dt className="truncate pr-3 text-slate-600">{item.label}</dt><dd className="shrink-0 font-semibold text-[#172033]">{Math.round(item.compliant * 100 / item.total)}%</dd></div>)}</dl></div>;
}
