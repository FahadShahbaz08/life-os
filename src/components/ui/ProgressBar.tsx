interface Props { value: number; size?: 'sm' | 'md'; showLabel?: boolean; }

export default function ProgressBar({ value, size = 'md', showLabel = false }: Props) {
  const h = size === 'sm' ? 'h-1.5' : 'h-2';
  const color = value === 100 ? 'bg-emerald-500' : value >= 60 ? 'bg-indigo-500' : value >= 30 ? 'bg-amber-500' : 'bg-indigo-500/40';
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 bg-raised rounded-full overflow-hidden ${h} border border-subtle`}>
        <div className={`${h} rounded-full transition-all duration-500 ${color}`} style={{ width: `${value}%` }} />
      </div>
      {showLabel && <span className="text-[10px] text-muted tabular-nums w-7 text-right">{value}%</span>}
    </div>
  );
}
