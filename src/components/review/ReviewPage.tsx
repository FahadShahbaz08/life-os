'use client';

import { useMemo, useState } from 'react';
import { Lightbulb, Flag, TrendingUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import ProgressBar from '@/components/ui/ProgressBar';
import ContributionCalendar from '@/components/activity/ContributionCalendar';
import { getMonthBounds, goalProgressPercent, formatCurrency } from '@/lib/utils';
import { getEventsForMonth } from '@/lib/activity-data';
import { FORM_INPUT } from '@/lib/constants';
import { subMonths, addMonths } from 'date-fns';

export default function ReviewPage() {
  const { state, addWeeklyReview, updateWeeklyReview } = useApp();
  const { toast } = useToastContext();
  const [monthDate, setMonthDate] = useState(() => new Date());
  const { start, end, key, label } = getMonthBounds(monthDate);

  const existing = state.weeklyReviews.find(r => r.weekStart === start);

  const monthEvents = useMemo(() => getEventsForMonth(state, key), [state, key]);
  const monthIncome = (state.incomes ?? []).filter(i => i.date.startsWith(key)).reduce((s, i) => s + i.amount, 0);
  const monthExpenses = state.expenses.filter(e => e.date.startsWith(key)).reduce((s, e) => s + e.amount, 0);
  const activeGoals = state.goals.filter(g => g.status === 'active');
  const completedCount = monthEvents.filter(e => e.type === 'task').length;

  const saveReview = (field: 'lessonsLearned' | 'nextWeekPriorities', value: string | string[]) => {
    if (existing) {
      updateWeeklyReview(existing.id, { [field]: value });
    } else {
      addWeeklyReview({
        weekStart: start, weekEnd: end,
        completedItems: monthEvents.filter(e => e.type === 'task').map(e => e.title),
        notCompletedItems: [],
        lessonsLearned: field === 'lessonsLearned' ? (value as string) : '',
        nextWeekPriorities: field === 'nextWeekPriorities' ? (value as string[]) : [],
        goalProgressNotes: activeGoals.map(g => `${g.title}: ${goalProgressPercent(g)}%`).join('\n'),
      });
    }
    toast('Saved');
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-8">
      <PageHeader title="Performance Review" subtitle="Monthly progress, activity history, and reflection" />

      <div className="flex items-center justify-between mb-6 bg-surface border border-base rounded-xl p-3">
        <button onClick={() => setMonthDate(d => subMonths(d, 1))} className="p-2 text-muted hover:text-primary hover:bg-raised rounded-lg">
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-primary">{label}</span>
        <button onClick={() => setMonthDate(d => addMonths(d, 1))} className="p-2 text-muted hover:text-primary hover:bg-raised rounded-lg">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <Stat label="Completions" value={String(monthEvents.length)} />
        <Stat label="Tasks done" value={String(completedCount)} />
        <Stat label="Income" value={formatCurrency(monthIncome)} color="text-emerald-400" />
        <Stat label="Expenses" value={formatCurrency(monthExpenses)} color="text-red-400" />
      </div>

      <ContributionCalendar monthDate={monthDate} onMonthChange={setMonthDate} />

      <section className="bg-surface border border-base rounded-2xl p-5 my-6">
        <div className="flex items-center gap-2 mb-4"><Flag size={15} className="text-purple-400" /><h2 className="text-sm font-semibold text-primary">Goal Progress</h2></div>
        <div className="space-y-3">
          {activeGoals.map(g => (
            <div key={g.id}>
              <div className="flex justify-between text-sm mb-1"><span className="text-primary">{g.title}</span><span className="text-muted">{goalProgressPercent(g)}%</span></div>
              <ProgressBar value={goalProgressPercent(g)} size="sm" />
            </div>
          ))}
          {activeGoals.length === 0 && <p className="text-sm text-muted">No active goals</p>}
        </div>
      </section>

      <section className="bg-surface border border-base rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3"><TrendingUp size={15} className="text-indigo-400" /><h2 className="text-sm font-semibold text-primary">Monthly Net</h2></div>
        <p className={`text-2xl font-bold ${monthIncome - monthExpenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          {formatCurrency(monthIncome - monthExpenses)}
        </p>
        <p className="text-xs text-muted mt-1">Income minus expenses for {label}</p>
      </section>

      <section className="bg-surface border border-base rounded-2xl p-5 mb-6">
        <div className="flex items-center gap-2 mb-3"><Lightbulb size={15} className="text-amber-400" /><h2 className="text-sm font-semibold text-primary">Reflection</h2></div>
        <textarea defaultValue={existing?.lessonsLearned ?? ''} onBlur={e => saveReview('lessonsLearned', e.target.value)}
          placeholder="What went well? What would you change next month?" rows={4} className={`${FORM_INPUT} resize-none`} />
      </section>

      <section className="bg-surface border border-base rounded-2xl p-5">
        <h2 className="text-sm font-semibold text-primary mb-3">Next Month Priorities (max 5)</h2>
        <textarea defaultValue={existing?.nextWeekPriorities?.join('\n') ?? ''}
          onBlur={e => saveReview('nextWeekPriorities', e.target.value.split('\n').filter(Boolean).slice(0, 5))}
          placeholder="One priority per line…" rows={5} className={`${FORM_INPUT} resize-none`} />
      </section>
    </div>
  );
}

function Stat({ label, value, color = 'text-primary' }: { label: string; value: string; color?: string }) {
  return (
    <div className="bg-surface border border-base rounded-xl p-4 text-center">
      <p className="text-[10px] text-muted uppercase mb-1">{label}</p>
      <p className={`text-lg font-bold ${color}`}>{value}</p>
    </div>
  );
}
