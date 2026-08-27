import { Card } from "@/components/ui/surface";

type MonthlyComplianceSnapshot = {
  month: string;
  monthName: string;
  compliant: number;
  inProgress: number;
  pending: number;
  overdue: number;
};

// Temporal: reemplazar por datos históricos reales cuando exista un endpoint de evolución mensual.
const temporaryMonthlyComplianceData: MonthlyComplianceSnapshot[] = [
  { month: "Mar", monthName: "Marzo", compliant: 2, inProgress: 1, pending: 1, overdue: 0 },
  { month: "Abr", monthName: "Abril", compliant: 3, inProgress: 1, pending: 1, overdue: 0 },
  { month: "May", monthName: "Mayo", compliant: 4, inProgress: 1, pending: 1, overdue: 1 },
  { month: "Jun", monthName: "Junio", compliant: 3, inProgress: 2, pending: 1, overdue: 1 },
  { month: "Jul", monthName: "Julio", compliant: 5, inProgress: 1, pending: 0, overdue: 1 },
  { month: "Ago", monthName: "Agosto", compliant: 4, inProgress: 2, pending: 1, overdue: 2 },
];

const statusSegments = [
  { key: "overdue", label: "Vencidas", color: "#cf7468" },
  { key: "pending", label: "Pendientes", color: "#d59a35" },
  { key: "inProgress", label: "En proceso", color: "#4d8cc4" },
  { key: "compliant", label: "Cumplidas", color: "#4f9a70" },
] as const;

const chart = { width: 600, height: 292, left: 42, right: 18, top: 24, baseline: 232, barWidth: 52, scaleMax: 10 };
const axisLabels = [10, 8, 6, 4, 2, 0];
const plotHeight = chart.baseline - chart.top;
const plotWidth = chart.width - chart.left - chart.right;
const barStep = plotWidth / temporaryMonthlyComplianceData.length;
const totalForMonth = (item: MonthlyComplianceSnapshot) => item.compliant + item.inProgress + item.pending + item.overdue;

export function MonthlyComplianceChart() {
  const mostOverdueMonth = temporaryMonthlyComplianceData.reduce((current, item) => item.overdue > current.overdue ? item : current);
  const bestComplianceMonth = temporaryMonthlyComplianceData.reduce((current, item) => item.compliant / totalForMonth(item) > current.compliant / totalForMonth(current) ? item : current);
  const chartDescription = temporaryMonthlyComplianceData.map((item) => `${item.monthName}: ${totalForMonth(item)} obligaciones; ${item.compliant} cumplidas, ${item.inProgress} en proceso, ${item.pending} pendientes y ${item.overdue} vencidas`).join(". ");

  return (
    <Card className="dashboard-panel bg-[var(--surface)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-[#111c30]">Cumplimiento por mes</h2>
          <p className="mt-0.5 text-sm text-slate-500">Distribución mensual de obligaciones por estado.</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5 text-xs">
          <span className="rounded-full border border-red-100 bg-red-50 px-2.5 py-1 font-medium text-[#a85f58]">Más vencidas: {mostOverdueMonth.month} · {mostOverdueMonth.overdue}</span>
          <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 font-medium text-[#4d7d65]">Mejor mes: {bestComplianceMonth.month}</span>
          <span className="rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 font-medium text-slate-500">Temporal</span>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
        {statusSegments.slice().reverse().map((status) => <span className="inline-flex items-center gap-1.5 font-medium" key={status.key}><span aria-hidden="true" className="size-2.5 rounded-full ring-1 ring-black/5" style={{ backgroundColor: status.color }} />{status.label}</span>)}
      </div>

      <svg aria-label={`Gráfico temporal de composición mensual por estado. ${chartDescription}`} className="mt-3 block h-auto w-full" preserveAspectRatio="xMidYMid meet" role="img" viewBox={`0 0 ${chart.width} ${chart.height}`}>
        {axisLabels.map((label) => {
          const y = chart.baseline - (label / chart.scaleMax) * plotHeight;
          return <g key={label}>
            <line stroke="#e2e8f0" strokeWidth="1" x1={chart.left} x2={chart.width - chart.right} y1={y} y2={y} />
            <text fill="#64748b" fontSize="11" fontWeight="500" textAnchor="end" x={chart.left - 9} y={y + 4}>{label}</text>
          </g>;
        })}

        {temporaryMonthlyComplianceData.map((item, index) => {
          const total = totalForMonth(item);
          const x = chart.left + index * barStep + (barStep - chart.barWidth) / 2;
          const totalHeight = (total / chart.scaleMax) * plotHeight;
          const top = chart.baseline - totalHeight;
          let segmentBottom = chart.baseline;
          const tooltip = `${item.monthName}\nTotal: ${total}\nCumplidas: ${item.compliant}\nEn proceso: ${item.inProgress}\nPendientes: ${item.pending}\nVencidas: ${item.overdue}`;

          return <g aria-label={tooltip.replaceAll("\n", ", ")} className="group" key={item.month} role="graphics-symbol" tabIndex={0}>
            <title>{tooltip}</title>
            <defs><clipPath id={`monthly-column-${item.month}`}><rect height={totalHeight} rx="6" ry="6" width={chart.barWidth} x={x} y={top} /></clipPath></defs>
            <text fill="#172033" fontSize="12" fontWeight="600" textAnchor="middle" x={x + chart.barWidth / 2} y={top - 9}>{total}</text>
            <g clipPath={`url(#monthly-column-${item.month})`} className="transition-[opacity,filter] duration-200 motion-reduce:transition-none group-hover:brightness-95 group-focus:brightness-95">
              {statusSegments.map((status) => {
                const value = item[status.key];
                const height = (value / chart.scaleMax) * plotHeight;
                const y = segmentBottom - height;
                segmentBottom = y;
                return <rect fill={status.color} height={height} key={status.key} width={chart.barWidth} x={x} y={y} />;
              })}
            </g>
            <rect className="transition-[stroke] duration-200 motion-reduce:transition-none group-hover:stroke-slate-400 group-focus:stroke-slate-400" fill="none" height={totalHeight} rx="6" ry="6" stroke="transparent" strokeWidth="1" width={chart.barWidth} x={x} y={top} />
            <text fill="#475569" fontSize="12" fontWeight="600" textAnchor="middle" x={x + chart.barWidth / 2} y={chart.baseline + 27}>{item.month}</text>
          </g>;
        })}
      </svg>

      <p className="mt-5 text-xs leading-5 text-slate-500">Datos de demostración temporal. Se reemplazarán por histórico real cuando esté disponible.</p>
    </Card>
  );
}
