'use client';

import { useMemo, useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle2, Repeat } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import {
  buildMonthCalendarGrid, getContributionLevel, getEventsForDay, getEventsForMonth,
  shiftMonth,
} from '@/lib/activity-data';
import { getMonthBounds } from '@/lib/utils';
import { format } from 'date-fns';

const LEVEL_CLASS = [
  'bg-overlay border border-base',
  'bg-emerald-500/20 border border-emerald-500/25',
  'bg-emerald-500/40 border border-emerald-500/35',
  'bg-emerald-500/60 border border-emerald-500/45',
  'bg-emerald-500/90 border border-emerald-400/60',
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function ContributionCalendar({ monthDate: controlledMonth, onMonthChange }: {
  monthDate?: Date;
  onMonthChange?: (d: Date) => void;
} = {}) {
  const { state } = useApp();
  const [internalMonth, setInternalMonth] = useState(() => new Date());
  const monthDate = controlledMonth ?? internalMonth;
  const setMonthDate = onMonthChange ?? setInternalMonth;
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { key: monthKey, label: monthLabel } = getMonthBounds(monthDate);

  useEffect(() => {
    setSelectedDate(null);
  }, [monthKey]);
  const monthEvents = useMemo(() => getEventsForMonth(state, monthKey), [state, monthKey]);
  const selectedEvents = selectedDate ? getEventsForDay(state, selectedDate) : [];
  const totalThisMonth = monthEvents.length;
  const activeDays = new Set(monthEvents.map(e => e.timestamp.slice(0, 10))).size;
  const grid = useMemo(() => buildMonthCalendarGrid(state, monthDate), [state, monthDate]);

  return (
    <div className="space-y-6">
      <section className="bg-surface border border-base rounded-2xl p-5">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <div>
            <h2 className="text-sm font-semibold text-primary">Activity History</h2>
            <p className="text-xs text-muted mt-0.5">
              {totalThisMonth} completions across {activeDays} active days in {monthLabel}
            </p>
          </div>
          {!onMonthChange && (
            <div className="flex items-center gap-1">
              <button onClick={() => { setMonthDate(shiftMonth(monthDate, -1)); setSelectedDate(null); }}
                className="p-2 text-muted hover:text-primary hover:bg-raised rounded-lg">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm font-medium text-primary min-w-[120px] text-center">{monthLabel}</span>
              <button onClick={() => { setMonthDate(shiftMonth(monthDate, 1)); setSelectedDate(null); }}
                className="p-2 text-muted hover:text-primary hover:bg-raised rounded-lg">
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map(d => (
            <div key={d} className="text-[10px] text-muted text-center py-1">{d}</div>
          ))}
        </div>

        <div className="space-y-1">
          {grid.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-1">
              {week.map((cell, ci) => {
                if (!cell.date) return <div key={ci} className="aspect-square" />;
                const level = getContributionLevel(cell.count);
                const isSelected = selectedDate === cell.date;
                return (
                  <button
                    key={cell.date}
                    type="button"
                    title={`${cell.date}: ${cell.count} completion${cell.count === 1 ? '' : 's'}`}
                    onClick={() => setSelectedDate(cell.date === selectedDate ? null : cell.date)}
                    className={`aspect-square rounded-md transition-all ${LEVEL_CLASS[level]} ${isSelected ? 'ring-2 ring-indigo-400 ring-offset-1 ring-offset-surface' : 'hover:ring-1 hover:ring-indigo-500/40'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end gap-1.5 mt-3 text-[10px] text-muted">
          <span>Less</span>
          {LEVEL_CLASS.map((cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
          <span>More</span>
        </div>
      </section>

      <section className="bg-surface border border-base rounded-2xl p-5">
        <h3 className="text-sm font-semibold text-primary mb-1">
          {selectedDate ? format(new Date(selectedDate + 'T12:00:00'), 'EEEE, MMMM d') : 'Select a day'}
        </h3>
        <p className="text-xs text-muted mb-4">
          {selectedDate
            ? `${selectedEvents.length} item${selectedEvents.length === 1 ? '' : 's'} completed`
            : 'Click a square on the calendar to see what you completed that day'}
        </p>

        {!selectedDate ? (
          <p className="text-sm text-muted py-6 text-center">No day selected.</p>
        ) : selectedEvents.length === 0 ? (
          <p className="text-sm text-muted py-6 text-center">Nothing completed on this day.</p>
        ) : (
          <div className="space-y-2 border-l-2 border-base pl-4 ml-1">
            {selectedEvents.map(event => (
              <div key={event.id} className="flex items-start gap-3 py-1">
                <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${event.type === 'task' ? 'bg-emerald-500/10' : 'bg-indigo-500/10'}`}>
                  {event.type === 'task'
                    ? <CheckCircle2 size={14} className="text-emerald-400" />
                    : <Repeat size={14} className="text-indigo-400" />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-primary">{event.title}</p>
                  <p className="text-xs text-muted">{event.subtitle}</p>
                </div>
                <span className="text-[10px] text-muted shrink-0">
                  {event.timestamp.includes('T') ? event.timestamp.slice(11, 16) : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
