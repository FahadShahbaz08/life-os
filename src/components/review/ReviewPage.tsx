'use client';

import { useMemo } from 'react';
import { CheckCircle2, XCircle, Lightbulb, Flag } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import ProgressBar from '@/components/ui/ProgressBar';
import { getWeekBounds, goalProgressPercent } from '@/lib/utils';
import { FORM_INPUT } from '@/lib/constants';

export default function ReviewPage() {
  const { state, addWeeklyReview, updateWeeklyReview } = useApp();
  const { toast } = useToastContext();
  const { start, end } = getWeekBounds();

  const existing = state.weeklyReviews.find(r => r.weekStart === start);

  const completedTasks = useMemo(() =>
    state.tasks.filter(t => t.status === 'completed' && t.completedAt && t.completedAt >= start && t.completedAt <= end + 'T23:59:59'),
    [state.tasks, start, end]
  );

  const notCompleted = useMemo(() =>
    state.tasks.filter(t => t.status !== 'completed' && t.dueDate && t.dueDate >= start && t.dueDate <= end),
    [state.tasks, start, end]
  );

  const activeGoals = state.goals.filter(g => g.status === 'active');

  const saveReview = (field: 'lessonsLearned' | 'nextWeekPriorities', value: string | string[]) => {
    if (existing) {
      updateWeeklyReview(existing.id, { [field]: value });
    } else {
      addWeeklyReview({
        weekStart: start, weekEnd: end,
        completedItems: completedTasks.map(t => t.title),
        notCompletedItems: notCompleted.map(t => t.title),
        lessonsLearned: field === 'lessonsLearned' ? (value as string) : '',
        nextWeekPriorities: field === 'nextWeekPriorities' ? (value as string[]) : [],
        goalProgressNotes: activeGoals.map(g => `${g.title}: ${goalProgressPercent(g)}%`).join('\n'),
      });
    }
    toast('Review saved');
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Weekly Review" subtitle={`Week of ${start} — ${end}`} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <section className="bg-surface border border-base rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4"><CheckCircle2 size={15} className="text-emerald-400" /><h2 className="text-sm font-semibold text-primary">Completed This Week ({completedTasks.length})</h2></div>
            {completedTasks.length === 0 ? <p className="text-sm text-muted">Nothing completed yet this week.</p> : (
              <ul className="space-y-1">{completedTasks.slice(0, 10).map(t => <li key={t.id} className="text-sm text-secondary flex items-center gap-2"><CheckCircle2 size={12} className="text-emerald-500 shrink-0" />{t.title}</li>)}</ul>
            )}
          </section>

          <section className="bg-surface border border-base rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4"><XCircle size={15} className="text-red-400" /><h2 className="text-sm font-semibold text-primary">Not Completed ({notCompleted.length})</h2></div>
            {notCompleted.length === 0 ? <p className="text-sm text-muted">All due tasks completed!</p> : (
              <ul className="space-y-1">{notCompleted.map(t => <li key={t.id} className="text-sm text-secondary">{t.title}</li>)}</ul>
            )}
          </section>
        </div>

        <section className="bg-surface border border-base rounded-2xl p-5 mb-6">
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
          <div className="flex items-center gap-2 mb-3"><Lightbulb size={15} className="text-amber-400" /><h2 className="text-sm font-semibold text-primary">Lessons Learned</h2></div>
          <textarea defaultValue={existing?.lessonsLearned ?? ''} onBlur={e => saveReview('lessonsLearned', e.target.value)}
            placeholder="What did you learn this week? What would you do differently?" rows={4} className={`${FORM_INPUT} resize-none`} />
        </section>

        <section className="bg-surface border border-base rounded-2xl p-5">
          <h2 className="text-sm font-semibold text-primary mb-3">Next Week Priorities (max 5)</h2>
          <textarea defaultValue={existing?.nextWeekPriorities?.join('\n') ?? ''}
            onBlur={e => saveReview('nextWeekPriorities', e.target.value.split('\n').filter(Boolean).slice(0, 5))}
            placeholder="One priority per line…" rows={5} className={`${FORM_INPUT} resize-none`} />
        </section>
    </div>
  );
}
