'use client';

interface LineChartProps {
  data: { label: string; value: number }[];
  height?: number;
  valuePrefix?: string;
  positiveColor?: string;
  negativeColor?: string;
}

export function LineChart({ data, height = 200, valuePrefix = '', positiveColor = '#34d399', negativeColor = '#f87171' }: LineChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>No data yet</div>;
  }

  const values = data.map(d => d.value);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 0);
  const range = max - min || 1;
  const w = 100;
  const h = 100;
  const pad = 4;

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
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height }}>
        <line x1={pad} y1={zeroY} x2={w - pad} y2={zeroY} stroke="var(--border)" strokeWidth="0.3" strokeDasharray="2,2" />
        <polyline fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" points={points} />
        {data.map((d, i) => {
          const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
          const y = h - pad - ((d.value - min) / range) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r="1.2" fill={d.value >= 0 ? positiveColor : negativeColor} />;
        })}
      </svg>
      <div className="flex justify-between mt-2 text-[10px] text-muted">
        <span>{data[0]?.label}</span>
        <span className="font-semibold" style={{ color }}>{valuePrefix}{lastVal.toFixed(2)}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  height?: number;
}

export function BarChart({ data, height = 180 }: BarChartProps) {
  if (data.length === 0) {
    return <div className="flex items-center justify-center text-sm text-muted" style={{ height }}>No data</div>;
  }

  const max = Math.max(...data.map(d => d.value), 1);
  const colors = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#a78bfa', '#fb923c', '#94a3b8'];

  return (
    <div style={{ height }} className="flex items-end gap-2 pt-4">
      {data.map((d, i) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <span className="text-[10px] text-muted tabular-nums">{d.value > 0 ? d.value.toFixed(0) : ''}</span>
          <div
            className="w-full rounded-t-lg transition-all"
            style={{
              height: `${Math.max((d.value / max) * 100, d.value > 0 ? 4 : 0)}%`,
              backgroundColor: d.color ?? colors[i % colors.length],
              opacity: 0.85,
            }}
          />
          <span className="text-[9px] text-muted truncate w-full text-center">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

interface DonutSegment {
  label: string;
  value: number;
  color?: string;
}

export function DonutChart({ segments, size = 140 }: { segments: DonutSegment[]; size?: number }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) {
    return <div className="text-sm text-muted text-center py-8">No expenses logged</div>;
  }

  const colors = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#22d3ee', '#a78bfa', '#fb923c', '#94a3b8'];
  let cumulative = 0;
  const r = 40;
  const cx = 50;
  const cy = 50;

  const arcs = segments.filter(s => s.value > 0).map((seg, i) => {
    const start = cumulative / total;
    cumulative += seg.value;
    const end = cumulative / total;
    const startAngle = start * 2 * Math.PI - Math.PI / 2;
    const endAngle = end * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const large = end - start > 0.5 ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    return { d, color: seg.color ?? colors[i % colors.length], label: seg.label, value: seg.value };
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <svg viewBox="0 0 100 100" width={size} height={size}>
        {arcs.map(a => <path key={a.label} d={a.d} fill={a.color} opacity={0.9} />)}
        <circle cx={cx} cy={cy} r={22} fill="var(--bg-surface)" />
      </svg>
      <div className="flex-1 space-y-1.5 min-w-0">
        {arcs.map(a => (
          <div key={a.label} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
            <span className="text-secondary truncate flex-1">{a.label}</span>
            <span className="text-muted tabular-nums">{Math.round((a.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
