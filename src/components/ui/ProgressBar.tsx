interface Props { value: number; size?: 'sm' | 'md'; showLabel?: boolean; }

export default function ProgressBar({ value, size = 'md', showLabel = false }: Props) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  const color = value === 100 ? 'bg-[var(--chart-pos)]' : value >= 60 ? 'bg-[var(--chart-1)]' : value >= 30 ? 'bg-[var(--chart-2)]' : 'bg-[var(--chart-3)]';
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-raised rounded-full overflow-hidden ${h} border border-subtle`}>
        <div className={`${h} rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
      {showLabel && <span className="text-[10px] text-muted tabular-nums w-7 text-right">{value}%</span>}
    </div>
  );
}
