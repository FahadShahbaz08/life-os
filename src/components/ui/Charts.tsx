'use client';

import { formatCurrency } from '@/lib/utils';

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  valuePrefix?: string;
  positiveColor?: string;
  negativeColor?: string;
}

export function LineChart({ data, height = 200, valuePrefix = '', positiveColor = 'var(--chart-pos)', negativeColor = 'var(--chart-neg)' }: LineChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>No data yet</div>;
  }

  const values = data.map(d => d.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 100;
  const pad = 6;

  const points = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - ((d.value - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(' ');

  const zeroY = h - pad - ((0 - min) / range) * (h - pad * 2);
  const lastVal = values[values.length - 1];
  const color = lastVal >= 0 ? positiveColor : negativeColor;

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <line x1={pad} y1={zeroY} x2={w - pad} y2={zeroY} stroke="var(--border)" strokeWidth="0.4" strokeDasharray="1.5,1.5" />
        <polyline fill="none" stroke={color} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round" points={points} />
        {data.map((d, i) => {
          const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
          const y = h - pad - ((d.value - min) / range) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r="1.4" fill={d.value >= 0 ? positiveColor : negativeColor} />;
        })}
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-muted">
        <span>{data[0]?.label}</span>
        <span className="font-medium text-primary tabular-nums">{valuePrefix}{lastVal.toFixed(2)}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

/** Simple single-series bar chart (expenses trend etc.) */
export function BarChart({ data, height = 180 }: BarChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>No data</div>;
  }

  const max = Math.max(...data.map(d => Math.abs(d.value)), 1);
  const barArea = height - 36;

  return (
    <div style={{ height }} className="flex items-end gap-2">
      {data.map((d) => {
        const h = Math.max((Math.abs(d.value) / max) * barArea, d.value !== 0 ? 3 : 0);
        const neg = d.value < 0;
        return (
          <div key={d.label} className="flex-1 flex flex-col items-center justify-end min-w-0 h-full">
            <span className="text-[10px] text-muted tabular-nums mb-1 truncate max-w-full">
              {d.value !== 0 ? compactNum(d.value) : ''}
            </span>
            <div
              className="w-full max-w-[40px] rounded-sm transition-all"
              style={{
                height: h,
                backgroundColor: d.color ?? (neg ? 'var(--chart-neg)' : 'var(--chart-1)'),
                opacity: 0.88,
              }}
            />
            <span className="text-[10px] text-muted truncate w-full text-center mt-1.5">{d.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Grouped income vs expenses cashflow — handles negatives and sparse data */
export function CashflowChart({
  data,
  height = 200,
}: {
  data: { label: string; income: number; expenses: number; net: number }[];
  height?: number;
}) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>No cashflow data yet</div>;
  }

  const max = Math.max(...data.flatMap(d => [d.income, d.expenses]), 1);
  const barArea = height - 48;

  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-[11px] text-muted">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--chart-1)]" /> Income</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[var(--chart-3)]" /> Expenses</span>
      </div>
      <div style={{ height: height - 24 }} className="flex items-end gap-3">
        {data.map(d => (
          <div key={d.label} className="flex-1 flex flex-col items-center min-w-0 h-full justify-end">
            <div className="flex items-end gap-1 w-full justify-center" style={{ height: barArea }}>
              <div
                className="w-[42%] max-w-[28px] rounded-sm"
                title={`Income: ${d.income}`}
                style={{
                  height: Math.max((d.income / max) * barArea, d.income > 0 ? 3 : 0),
                  backgroundColor: 'var(--chart-1)',
                  opacity: 0.9,
                }}
              />
              <div
                className="w-[42%] max-w-[28px] rounded-sm"
                title={`Expenses: ${d.expenses}`}
                style={{
                  height: Math.max((d.expenses / max) * barArea, d.expenses > 0 ? 3 : 0),
                  backgroundColor: 'var(--chart-3)',
                  opacity: 0.85,
                }}
              />
            </div>
            <span className="text-[10px] text-muted mt-2 truncate w-full text-center">{d.label}</span>
            <span className={`text-[10px] tabular-nums truncate w-full text-center ${d.net >= 0 ? 'text-[var(--chart-pos)]' : 'text-[var(--chart-neg)]'}`}>
              {compactNum(d.net)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Horizontal bars — cleaner for category mix */
export function CategoryBars({
  segments,
  formatValue = formatCurrency,
}: {
  segments: { label: string; value: number; color?: string }[];
  formatValue?: (n: number) => string;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return <div className="text-sm text-muted text-center py-10">No expenses in this period</div>;
  }

  const max = Math.max(...segments.map(s => s.value), 1);
  const sorted = [...segments].sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-3">
      {sorted.map((seg) => {
        const pct = Math.round((seg.value / total) * 100);
        return (
          <div key={seg.label}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-xs text-secondary truncate capitalize">{seg.label}</span>
              <span className="text-xs text-muted tabular-nums shrink-0">{formatValue(seg.value)} · {pct}%</span>
            </div>
            <div className="h-1.5 bg-raised rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--chart-1)]"
                style={{ width: `${Math.max((seg.value / max) * 100, 2)}%`, opacity: 0.55 + (seg.value / max) * 0.45 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

export function DonutChart({ segments, size = 140 }: { segments: DonutSegment[]; size?: number }) {
  return <CategoryBars segments={segments} />;
}

function compactNum(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  if (abs >= 1000) return `${sign}${(abs / 1000).toFixed(1)}k`;
  return `${sign}${Math.round(abs)}`;
}
