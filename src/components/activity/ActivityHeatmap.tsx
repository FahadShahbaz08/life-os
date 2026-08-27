'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { useApp } from '@/context/AppContext';
import { buildHeatmapWeeks, getContributionLevel } from '@/lib/activity-data';

const LEVEL_CLASS = [
  'bg-overlay border border-base',
  'bg-emerald-500/20 border border-emerald-500/25',
  'bg-emerald-500/40 border border-emerald-500/35',
  'bg-emerald-500/60 border border-emerald-500/45',
  'bg-emerald-500/90 border border-emerald-400/60',
];

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function ActivityHeatmap() {
  const { state } = useApp();
  const weeks = useMemo(() => buildHeatmapWeeks(state, 20), [state]);
  const total = weeks.flat().reduce((s, d) => s + (d.inFuture ? 0 : d.count), 0);
  const activeDays = weeks.flat().filter(d => !d.inFuture && d.count > 0).length;

  return (
    <section className="card p-4 mb-6">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div>
          <h2 className="text-sm font-semibold font-display text-primary">Activity</h2>
          <p className="text-[11px] text-muted mt-0.5">{total} completions · {activeDays} active days</p>
        </div>
        <Link href="/review" className="text-[11px] text-secondary hover:text-primary shrink-0">Review →</Link>
      </div>
      <div className="flex gap-2 overflow-x-auto os-scroll pb-1">
        <div className="flex flex-col justify-between py-[1px] shrink-0 text-[8px] text-muted leading-none h-[88px]">
          {WEEKDAYS.map((d, i) => (
            <span key={i} className={i % 2 === 1 ? 'invisible' : ''}>{d}</span>
          ))}
        </div>
        <div className="flex gap-[3px] min-w-0">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-[3px]">
              {week.map(cell => {
                const level = cell.inFuture ? 0 : getContributionLevel(cell.count);
                return (
                  <div
                    key={cell.date}
                    title={`${format(parseISO(cell.date), 'MMM d')}: ${cell.count} completion${cell.count === 1 ? '' : 's'}`}
                    className={`w-2.5 h-2.5 rounded-[2px] ${cell.inFuture ? 'opacity-20' : ''} ${LEVEL_CLASS[level]}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-muted">
        <span>Less</span>
        {LEVEL_CLASS.map((cls, i) => (
          <div key={i} className={`w-2 h-2 rounded-[2px] ${cls}`} />
        ))}
        <span>More</span>
      </div>
    </section>
  );
}
