'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  ListTodo, Wallet, Flag, Play, Download, Upload, Plus, BellRing, Eye, EyeOff,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import ProgressBar from '@/components/ui/ProgressBar';
import { computeTodayDashboard, getGreeting, formatCurrency, goalProgressPercent, todayISO, dayQueueReasonLabel } from '@/lib/utils';
import { exportData, importData } from '@/lib/storage';
import { requestNotificationPermission } from '@/lib/notifications';
import { BTN_PRIMARY } from '@/lib/constants';
import { DayQueueItem, Task } from '@/types';

const REASON_STYLE: Record<string, string> = {
  overdue: 'text-red-400 bg-red-500/10 border-red-500/20',
  today: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  focus: 'text-accent bg-accent-subtle border-accent',
  priority: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  reminder: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
};

export default function TodayPage() {
  const { state, updateTask, toggleTopPriority, importState, updateSettings, addTask } = useApp();
  const { toast } = useToastContext();
  const dash = computeTodayDashboard(state);
  const name = state.settings.userName;
  const today = format(new Date(), 'EEEE, MMM d');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [showFinanceAmounts, setShowFinanceAmounts] = useState(false);
  const [showGoalProgress, setShowGoalProgress] = useState(false);
  const [pendingComplete, setPendingComplete] = useState<Task | null>(null);
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
      toast('Browser alerts enabled');
    } else {
      toast('Permission denied — enable in browser settings', 'error');
    }
  };

  const requestComplete = (task: Task) => {
    if (task.status === 'completed') {
      updateTask(task.id, { status: 'todo' });
      toast('Reopened');
      return;
    }
    setPendingComplete(task);
  };

  const confirmComplete = () => {
    if (!pendingComplete) return;
    updateTask(pendingComplete.id, { status: 'completed' });
    toast('Done!');
    setPendingComplete(null);
  };

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8 animate-in">
        <PageHeader
          title={`${getGreeting()}${name ? `, ${name}` : ''}`}
          subtitle={`${today} · Your action list for today`}
          action={
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!state.settings.notificationsEnabled && (
                <button onClick={enableNotifications} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <BellRing size={13} /> Browser alerts
                </button>
              )}
              <button onClick={() => exportData(state)} className="p-2 text-muted hover:text-secondary hover:bg-raised rounded-xl" title="Export"><Download size={15} /></button>
              <label className="p-2 text-muted hover:text-secondary hover:bg-raised rounded-xl cursor-pointer" title="Import">
                <Upload size={15} /><input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
              <button onClick={() => setShowTaskForm(true)} className={BTN_PRIMARY}>
                <Plus size={14} />Add Task
              </button>
              <Link href="/focus-session" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[var(--accent)] hover:bg-[var(--accent-hover)] rounded-xl">
                <Play size={14} />Timer
              </Link>
            </div>
          }
        />

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListTodo size={16} className="text-accent" />
              <h2 className="text-sm font-semibold font-display text-primary">Your Day</h2>
              <span className="text-xs text-muted">({dash.dayQueue.length})</span>
            </div>
            <Link href="/tasks" className="text-xs text-accent hover:underline">All tasks →</Link>
          </div>

          {hero ? (
            <div className="card bg-gradient-to-br from-teal-500/10 to-cyan-500/5 border-accent p-6 mb-4">
              <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-md border mb-2 ${REASON_STYLE[taskItems[0].reason]}`}>
                {dayQueueReasonLabel(taskItems[0].reason)}
              </span>
              <h3 className="text-lg font-bold font-display text-primary mb-3">{hero.title}</h3>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => requestComplete(hero)} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl">Mark Done</button>
                <Link href="/focus-session" className="px-4 py-2 text-sm font-medium text-accent bg-accent-subtle rounded-xl">Start Timer</Link>
                <button onClick={() => setEditingTask(hero.id)} className="px-4 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Edit</button>
              </div>
            </div>
          ) : (
            <div className="card p-6 text-center mb-4">
              <p className="text-sm text-muted mb-3">Nothing queued for today. Add a task or set a due date.</p>
              <button onClick={() => setShowTaskForm(true)} className={BTN_PRIMARY}>
                <Plus size={14} /> Add task
              </button>
            </div>
          )}

          {rest.length > 0 && (
            <div className="card p-4 space-y-2">
              {rest.map(item => (
                <DayQueueRow key={item.id} item={item}
                  onComplete={task => requestComplete(task)}
                  onEdit={id => setEditingTask(id)}
                  onTogglePriority={toggleTopPriority}
                />
              ))}
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-emerald-400" />
                <h2 className="text-sm font-semibold font-display text-primary">This Month</h2>
                <button
                  type="button"
                  onClick={() => setShowFinanceAmounts(v => !v)}
                  className="p-1 text-muted hover:text-secondary rounded-lg transition-colors"
                  title={showFinanceAmounts ? 'Hide amounts' : 'Show amounts'}
                >
                  {showFinanceAmounts ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <Link href="/finance" className="text-xs text-accent hover:underline">Finance →</Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Income', value: dash.financeAlerts.monthlyIncome, color: 'text-emerald-400' },
                { label: 'Expenses', value: dash.financeAlerts.monthlyExpenses, color: 'text-red-400' },
                { label: 'Payables', value: dash.financeAlerts.totalPayables, color: 'text-amber-400' },
                { label: 'Receivables', value: dash.financeAlerts.totalReceivables, color: 'text-cyan-400' },
              ].map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setShowFinanceAmounts(v => !v)}
                  className="p-3 bg-overlay rounded-xl text-left hover:bg-raised transition-colors"
                >
                  <p className="text-[10px] text-muted uppercase">{item.label}</p>
                  <p className={`text-sm font-bold ${item.color}`}>
                    {showFinanceAmounts ? formatCurrency(item.value) : '***'}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag size={15} className="text-accent" />
                <h2 className="text-sm font-semibold font-display text-primary">Goals</h2>
                {dash.goalProgress.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowGoalProgress(v => !v)}
                    className="p-1 text-muted hover:text-secondary rounded-lg transition-colors"
                  >
                    {showGoalProgress ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </div>
              <Link href="/goals" className="text-xs text-accent hover:underline">Goals →</Link>
            </div>
            {dash.goalProgress.length === 0 ? (
              <p className="text-sm text-muted"><Link href="/goals" className="text-accent hover:underline">Set goals →</Link></p>
            ) : (
              <div className="space-y-3">
                {dash.goalProgress.map(goal => {
                  const pct = goalProgressPercent(goal);
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => setShowGoalProgress(v => !v)}
                      className="w-full text-left rounded-lg hover:bg-raised/50 transition-colors -mx-1 px-1 py-0.5"
                    >
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-primary">{goal.title}</span>
                        <span className="text-xs text-muted">{showGoalProgress ? `${pct}%` : '***'}</span>
                      </div>
                      {showGoalProgress ? (
                        <ProgressBar value={pct} size="sm" />
                      ) : (
                        <div className="h-1.5 bg-overlay rounded-full" />
                      )}
                    </button>
                  );
                })}
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
      {pendingComplete && (
        <ConfirmDialog
          title="Mark task complete?"
          message={`Confirm you finished “${pendingComplete.title}”. This helps avoid accidental completions.`}
          confirmLabel="Yes, complete"
          cancelLabel="Not yet"
          variant="success"
          onConfirm={confirmComplete}
          onCancel={() => setPendingComplete(null)}
        />
      )}
    </>
  );
}

function DayQueueRow({ item, onComplete, onEdit, onTogglePriority }: {
  item: DayQueueItem;
  onComplete: (task: Task) => void;
  onEdit: (id: string) => void;
  onTogglePriority: (id: string) => void;
}) {
  if (!item.task) return null;
  return (
    <div className="flex items-center gap-2">
      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border shrink-0 ${REASON_STYLE[item.reason]}`}>
        {dayQueueReasonLabel(item.reason)}
      </span>
      <div className="flex-1 min-w-0">
        <TaskCard task={item.task} compact onEdit={() => onEdit(item.task!.id)} onDelete={() => {}}
          onToggleTopPriority={() => onTogglePriority(item.task!.id)}
          onStatusToggle={() => onComplete(item.task!)}
        />
      </div>
    </div>
  );
}
