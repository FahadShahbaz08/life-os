'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ListTodo, CheckCircle2, Repeat, Bell, Wallet, Flag, Play, Download, Upload, Plus, BellRing,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import ProgressBar from '@/components/ui/ProgressBar';
import { computeTodayDashboard, getGreeting, formatCurrency, goalProgressPercent, todayISO, dayQueueReasonLabel } from '@/lib/utils';
import { exportData, importData } from '@/lib/storage';
import { requestNotificationPermission } from '@/lib/notifications';
import { BTN_PRIMARY } from '@/lib/constants';
import { DayQueueItem } from '@/types';

const REASON_STYLE: Record<string, string> = {
  overdue: 'text-red-400 bg-red-500/10 border-red-500/20',
  today: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  focus: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  priority: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  reminder: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
};

export default function TodayPage() {
  const { state, updateTask, toggleTopPriority, toggleHabitCompletion, importState, updateSettings, addTask } = useApp();
  const { toast } = useToastContext();
  const dash = computeTodayDashboard(state);
  const name = state.settings.userName;
  const today = format(new Date(), 'EEEE, MMM d');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const editing = editingTask ? state.tasks.find(t => t.id === editingTask) : null;

  const taskItems = dash.dayQueue.filter(i => i.kind === 'task');
  const hero = taskItems[0]?.task ?? null;
  const rest = dash.dayQueue.slice(hero ? 1 : 0);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      importState(await importData(file));
      toast('Data imported');
    } catch {
      toast('Import failed', 'error');
    }
    e.target.value = '';
  };

  const enableNotifications = async () => {
    const ok = await requestNotificationPermission();
    if (ok) {
      updateSettings({ notificationsEnabled: true, notifiedReminderIds: [] });
      toast('Notifications enabled');
    } else {
      toast('Permission denied — enable in browser settings', 'error');
    }
  };

  const completeTask = (id: string) => {
    updateTask(id, { status: 'completed' });
    toast('Done!');
  };

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8 animate-in">
        <PageHeader
          title={`${getGreeting()}${name ? `, ${name}` : ''}`}
          subtitle={`${today} · Your unified action list`}
          action={
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!state.settings.notificationsEnabled && (
                <button onClick={enableNotifications} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <BellRing size={13} /> Alerts
                </button>
              )}
              <button onClick={() => exportData(state)} className="p-2 text-muted hover:text-secondary hover:bg-raised rounded-xl" title="Export"><Download size={15} /></button>
              <label className="p-2 text-muted hover:text-secondary hover:bg-raised rounded-xl cursor-pointer" title="Import">
                <Upload size={15} /><input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={() => setShowTaskForm(true)} className={BTN_PRIMARY}>
                <Plus size={14} />Add Task
              </button>
              <Link href="/focus-session" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl">
                <Play size={14} />Focus
              </Link>
            </div>
          }
        />

        {/* Unified Your Day */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListTodo size={16} className="text-indigo-400" />
              <h2 className="text-sm font-semibold text-primary">Your Day</h2>
              <span className="text-xs text-muted">({dash.dayQueue.length})</span>
            </div>
            <Link href="/focus" className="text-xs text-indigo-400">Manage focus →</Link>
          </div>

          {hero ? (
            <div className="card bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/15 dark:to-purple-500/10 border-accent p-6 mb-4">
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border mb-2 ${REASON_STYLE[taskItems[0].reason]}`}>
                {dayQueueReasonLabel(taskItems[0].reason)}
              </span>
              <h3 className="text-lg font-bold text-primary mb-3">{hero.title}</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => completeTask(hero.id)} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl">Mark Done</button>
                <Link href="/focus-session" className="px-4 py-2 text-sm font-medium text-indigo-400 bg-indigo-500/10 rounded-xl">Start Timer</Link>
                <button onClick={() => setEditingTask(hero.id)} className="px-4 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Edit</button>
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center mb-4">
              <p className="text-sm text-muted mb-3">Nothing queued for today. Add a task or set a due date.</p>
              <button onClick={() => setShowTaskForm(true)} className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 rounded-xl">
                <Plus size={14} /> Add task
              </button>
            </div>
          )}

          {rest.length > 0 && (
            <div className="card p-4 space-y-2">
              {rest.map(item => (
                <DayQueueRow key={item.id} item={item}
                  onComplete={id => completeTask(id)}
                  onEdit={id => setEditingTask(id)}
                  onTogglePriority={toggleTopPriority}
                />
              ))}
            </div>
          )}
        </section>

        {/* Habits — compact row */}
        {dash.todaysHabits.length > 0 && (
          <section className="card p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Repeat size={15} className="text-indigo-400" />
                <h2 className="text-sm font-semibold text-primary">Habits</h2>
              </div>
              <Link href="/habits" className="text-xs text-indigo-400">All →</Link>
            </div>
            <div className="flex flex-wrap gap-2">
              {dash.todaysHabits.map(({ habit, completed }) => (
                <button key={habit.id}
                  onClick={() => { toggleHabitCompletion(habit.id); toast(completed ? 'Unchecked' : 'Logged!'); }}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-colors ${completed ? 'border-emerald-500/30 bg-emerald-500/5 text-muted line-through' : 'border-base text-primary hover:border-indigo-500/30'}`}>
                  <CheckCircle2 size={14} className={completed ? 'text-emerald-500' : 'text-muted'} />
                  {habit.name}
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-primary">This Month</h2>
              </div>
              <Link href="/finance" className="text-xs text-indigo-400">Finance →</Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-overlay rounded-xl">
                <p className="text-[10px] text-muted uppercase">Income</p>
                <p className="text-sm font-bold text-emerald-400">{formatCurrency(dash.financeAlerts.monthlyIncome)}</p>
              </div>
              <div className="p-3 bg-overlay rounded-xl">
                <p className="text-[10px] text-muted uppercase">Expenses</p>
                <p className="text-sm font-bold text-red-400">{formatCurrency(dash.financeAlerts.monthlyExpenses)}</p>
              </div>
              <div className="p-3 bg-overlay rounded-xl">
                <p className="text-[10px] text-muted uppercase">Payables</p>
                <p className="text-sm font-bold text-amber-400">{formatCurrency(dash.financeAlerts.totalPayables)}</p>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag size={15} className="text-purple-400" />
                <h2 className="text-sm font-semibold text-primary">Goals</h2>
              </div>
              <Link href="/review" className="text-xs text-indigo-400">Performance →</Link>
            </div>
            {dash.goalProgress.length === 0 ? (
              <p className="text-sm text-muted"><Link href="/goals" className="text-indigo-400">Set goals →</Link></p>
            ) : (
              <div className="space-y-3">
                {dash.goalProgress.map(goal => (
                  <div key={goal.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-primary">{goal.title}</span>
                      <span className="text-xs text-muted">{goalProgressPercent(goal)}%</span>
                    </div>
                    <ProgressBar value={goalProgressPercent(goal)} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {showTaskForm && (
        <TaskForm
          defaultDueDate={todayISO()}
          onSave={d => {
            addTask(taskFormToEntity(d));
            setShowTaskForm(false);
            toast('Task added');
          }}
          onClose={() => setShowTaskForm(false)}
        />
      )}
      {editing && (
        <TaskForm task={editing} onSave={d => { updateTask(editing.id, taskFormToEntity(d)); setEditingTask(null); toast('Updated'); }} onClose={() => setEditingTask(null)} />
      )}
    </>
  );
}

function DayQueueRow({ item, onComplete, onEdit, onTogglePriority }: {
  item: DayQueueItem;
  onComplete: (id: string) => void;
  onEdit: (id: string) => void;
  onTogglePriority: (id: string) => void;
}) {
  if (item.kind === 'reminder' && item.reminder) {
    return (
      <Link href="/reminders" className="flex items-center gap-3 p-3 rounded-xl border border-base hover:border-indigo-500/20">
        <Bell size={16} className="text-sky-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm text-primary truncate">{item.reminder.title}</p>
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${REASON_STYLE.reminder}`}>Reminder</span>
        </div>
      </Link>
    );
  }

  if (!item.task) return null;
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${REASON_STYLE[item.reason]}`}>
        {dayQueueReasonLabel(item.reason)}
      </span>
      <div className="flex-1 min-w-0">
        <TaskCard task={item.task} compact onEdit={() => onEdit(item.task!.id)} onDelete={() => {}}
          onToggleTopPriority={() => onTogglePriority(item.task!.id)}
          onStatusToggle={() => onComplete(item.task!.id)}
        />
      </div>
    </div>
  );
}
