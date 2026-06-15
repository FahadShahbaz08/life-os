import {
  eachDayOfInterval, endOfMonth, format, getDay, parseISO, startOfMonth, subMonths, addMonths,
} from 'date-fns';
import { AppState, CompletionEvent } from '@/types';

export function getCompletionEvents(state: AppState): CompletionEvent[] {
  const events: CompletionEvent[] = [];

  state.tasks
    .filter(t => t.status === 'completed' && t.completedAt)
    .forEach(t => {
      events.push({
        id: `task-${t.id}`,
        type: 'task',
        title: t.title,
        timestamp: t.completedAt!,
        subtitle: 'Task completed',
      });
    });

  state.habitCompletions.forEach(c => {
    const habit = state.habits.find(h => h.id === c.habitId);
    if (!habit) return;
    events.push({
      id: `habit-${c.id}`,
      type: 'habit',
      title: habit.name,
      timestamp: c.completedAt.includes('T') ? c.completedAt : `${c.completedAt}T12:00:00`,
      subtitle: 'Habit logged',
    });
  });

  return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function getEventsForDay(state: AppState, dateISO: string): CompletionEvent[] {
  return getCompletionEvents(state).filter(e => e.timestamp.startsWith(dateISO));
}

export function getEventsForMonth(state: AppState, monthKey: string): CompletionEvent[] {
  return getCompletionEvents(state).filter(e => e.timestamp.slice(0, 7) === monthKey);
}

export function getDailyCountsForMonth(state: AppState, monthDate: Date): { date: string; count: number }[] {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start, end });
  const events = getCompletionEvents(state);

  return days.map(day => {
    const date = format(day, 'yyyy-MM-dd');
    const count = events.filter(e => e.timestamp.startsWith(date)).length;
    return { date, count };
  });
}

export interface MonthCalendarCell {
  date: string | null;
  count: number;
  dayOfMonth: number | null;
}

export function buildMonthCalendarGrid(state: AppState, monthDate: Date): MonthCalendarCell[][] {
  const start = startOfMonth(monthDate);
  const end = endOfMonth(monthDate);
  const days = eachDayOfInterval({ start, end });
  const counts = Object.fromEntries(getDailyCountsForMonth(state, monthDate).map(d => [d.date, d.count]));

  const cells: MonthCalendarCell[] = [];
  const padStart = (getDay(start) + 6) % 7;
  for (let i = 0; i < padStart; i++) cells.push({ date: null, count: 0, dayOfMonth: null });
  days.forEach(day => {
    const date = format(day, 'yyyy-MM-dd');
    cells.push({ date, count: counts[date] ?? 0, dayOfMonth: day.getDate() });
  });
  while (cells.length % 7 !== 0) cells.push({ date: null, count: 0, dayOfMonth: null });

  const weeks: MonthCalendarCell[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export function getContributionLevel(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count <= 3) return 2;
  if (count <= 5) return 3;
  return 4;
}

export function getMonthOptions(count = 12): { key: string; label: string; date: Date }[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const date = subMonths(now, i);
    return { key: format(date, 'yyyy-MM'), label: format(date, 'MMMM yyyy'), date };
  });
}

export function shiftMonth(monthDate: Date, delta: number): Date {
  return delta < 0 ? subMonths(monthDate, Math.abs(delta)) : addMonths(monthDate, delta);
}

export function groupEventsByDay(events: CompletionEvent[]): { date: string; label: string; events: CompletionEvent[] }[] {
  const map = new Map<string, CompletionEvent[]>();
  events.forEach(e => {
    const date = e.timestamp.slice(0, 10);
    if (!map.has(date)) map.set(date, []);
    map.get(date)!.push(e);
  });
  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, dayEvents]) => ({
      date,
      label: format(parseISO(date), 'EEEE, MMM d'),
      events: dayEvents,
    }));
}
