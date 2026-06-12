'use client';

import { useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import {
  Target, Star, CheckCircle2, AlertTriangle, Repeat, Bell, Clock,
  Wallet, Flag, Play, Download, Upload, Plus, HelpCircle, BellRing,
} from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import TaskCard from '@/components/tasks/TaskCard';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import ProgressBar from '@/components/ui/ProgressBar';
import { computeTodayDashboard, getGreeting, formatCurrency, goalProgressPercent, todayISO } from '@/lib/utils';
import { exportData, importData } from '@/lib/storage';
import { requestNotificationPermission } from '@/lib/notifications';
import { PriorityBadge } from '@/components/ui/Badge';
import { BTN_PRIMARY } from '@/lib/constants';

export default function TodayPage() {
  const { state, updateTask, toggleTopPriority, importState, updateSettings, addTask } = useApp();
  const { toast } = useToastContext();
  const dash = computeTodayDashboard(state);
  const name = state.settings.userName;
  const today = format(new Date(), 'EEEE, MMM d');
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const editing = editingTask ? state.tasks.find(t => t.id === editingTask) : null;

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
      toast('Notifications enabled — reminders, overdue tasks, habits');
    } else {
      toast('Permission denied — enable in browser settings', 'error');
    }
  };

  return (
    <>
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8 animate-in">
        <PageHeader
          title={`${getGreeting()}${name ? `, ${name}` : ''}`}
          subtitle={`${today} · What should you focus on right now?`}
          action={
            <div className="flex items-center gap-2 flex-wrap justify-end">
              {!state.settings.notificationsEnabled && (
                <button onClick={enableNotifications} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <BellRing size={13} /> Enable alerts
                </button>
              )}
              <button onClick={() => setShowHelp(!showHelp)} className="p-2 text-muted hover:text-secondary hover:bg-raised rounded-xl" title="How Today works">
                <HelpCircle size={15} />
              </button>
              <button onClick={() => exportData(state)} className="p-2 text-muted hover:text-secondary hover:bg-raised rounded-xl"><Download size={15} /></button>
              <label className="p-2 text-muted hover:text-secondary hover:bg-raised rounded-xl cursor-pointer">
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

        {showHelp && (
          <div className="bg-raised border border-base rounded-xl p-4 mb-6 text-xs text-secondary space-y-2">
            <p><strong className="text-primary">Focus Now</strong> — first task in your Focus → <strong>Now</strong> column (<Link href="/focus" className="text-indigo-400">add here</Link>)</p>
            <p><strong className="text-primary">Top 3 Priorities</strong> — check &ldquo;Pin as Top Priority&rdquo; when creating a task, or tap the ★ on any task</p>
            <p><strong className="text-primary">Today&apos;s Tasks</strong> — set <strong>Due date = today</strong> when adding a task</p>
            <p><strong className="text-primary">Needs Attention</strong> — overdue tasks, follow-ups (<Link href="/waiting" className="text-indigo-400">Waiting For</Link>), and reminders (<Link href="/reminders" className="text-indigo-400">Reminders</Link>)</p>
            <p><strong className="text-primary">Priority</strong> — set Low / Medium / High / Urgent in the task form; Urgent + due today surfaces first</p>
          </div>
        )}

        {/* Focus Now */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Target size={16} className="text-red-400" />
              <h2 className="text-sm font-semibold text-primary uppercase tracking-wider">Focus Now</h2>
            </div>
            <Link href="/focus" className="text-xs text-indigo-400">Manage focus queue →</Link>
          </div>
          {dash.focusNow ? (
            <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-bold text-primary mb-2">{dash.focusNow.title}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <PriorityBadge priority={dash.focusNow.priority} />
                {dash.focusNow.dueDate && <span className="text-xs text-muted">Due {dash.focusNow.dueDate}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                <button onClick={() => updateTask(dash.focusNow!.id, { status: 'completed' })} className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl">Mark Done</button>
                <Link href="/focus-session" className="px-4 py-2 text-sm font-medium text-indigo-400 bg-indigo-500/10 rounded-xl">Start Timer</Link>
                <button onClick={() => updateTask(dash.focusNow!.id, { focusQueue: 'next' })} className="px-4 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Defer</button>
              </div>
            </div>
          ) : (
            <div className="bg-surface border border-base rounded-2xl p-6 text-center">
              <p className="text-sm text-muted mb-3">Add a task to <strong>Focus → Now</strong> to see it here.</p>
              <Link href="/focus" className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white bg-indigo-600 rounded-xl">
                <Plus size={14} /> Add to Focus Now
              </Link>
            </div>
          )}
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <section className="bg-surface border border-base rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Star size={15} className="text-amber-400" />
                <h2 className="text-sm font-semibold text-primary">Top 3 Priorities</h2>
              </div>
              <button onClick={() => setShowTaskForm(true)} className="text-xs text-indigo-400">+ Add</button>
            </div>
            {dash.topPriorities.length === 0 ? (
              <p className="text-sm text-muted">Add a task and check &ldquo;Pin as Top Priority&rdquo;, or tap ★ on a task.</p>
            ) : (
              <div className="space-y-2">
                {dash.topPriorities.map((task, i) => (
                  <div key={task.id} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted w-4">{i + 1}.</span>
                    <div className="flex-1">
                      <TaskCard task={task} compact onEdit={() => setEditingTask(task.id)} onDelete={() => {}}
                        onToggleTopPriority={() => toggleTopPriority(task.id)}
                        onStatusToggle={() => updateTask(task.id, { status: task.status === 'completed' ? 'todo' : 'completed' })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="bg-surface border border-base rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Repeat size={15} className="text-indigo-400" />
                <h2 className="text-sm font-semibold text-primary">Today&apos;s Habits</h2>
              </div>
              <Link href="/habits" className="text-xs text-indigo-400">View all</Link>
            </div>
            {dash.todaysHabits.length === 0 ? (
              <p className="text-sm text-muted">No habits. <Link href="/habits" className="text-indigo-400">Add habits →</Link></p>
            ) : (
              <div className="space-y-2">
                {dash.todaysHabits.map(({ habit, completed }) => (
                  <Link key={habit.id} href="/habits" className={`flex items-center gap-3 px-3 py-2 rounded-xl border ${completed ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-base'}`}>
                    <CheckCircle2 size={16} className={completed ? 'text-emerald-500' : 'text-muted'} />
                    <span className={`text-sm ${completed ? 'line-through text-muted' : 'text-primary'}`}>{habit.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <section className="bg-surface border border-base rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-primary">Today&apos;s Tasks ({dash.todaysTasks.length})</h2>
              <button onClick={() => setShowTaskForm(true)} className="text-xs text-indigo-400">+ Add (due today)</button>
            </div>
            {dash.todaysTasks.length === 0 ? (
              <p className="text-sm text-muted">No tasks due today. Add one with due date = {todayISO()}.</p>
            ) : (
              <div className="space-y-2">
                {dash.todaysTasks.map(task => (
                  <TaskCard key={task.id} task={task} compact onEdit={() => setEditingTask(task.id)} onDelete={() => {}}
                    onToggleTopPriority={() => toggleTopPriority(task.id)}
                    onStatusToggle={() => updateTask(task.id, { status: 'completed' })}
                  />
                ))}
              </div>
            )}
            {dash.overdueTasks.length > 0 && (
              <div className="mt-4 pt-4 border-t border-subtle">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle size={14} className="text-red-400" />
                  <span className="text-xs font-semibold text-red-400">Overdue ({dash.overdueTasks.length})</span>
                </div>
                {dash.overdueTasks.slice(0, 3).map(task => (
                  <TaskCard key={task.id} task={task} compact onEdit={() => setEditingTask(task.id)} onDelete={() => {}}
                    onStatusToggle={() => updateTask(task.id, { status: 'completed' })}
                  />
                ))}
              </div>
            )}
          </section>

          <section className="bg-surface border border-base rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} className="text-amber-400" />
              <h2 className="text-sm font-semibold text-primary">Needs Attention</h2>
            </div>
            <div className="space-y-3">
              {dash.overdueTasks.slice(0, 2).map(task => (
                <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl border border-red-500/20 bg-red-500/5">
                  <AlertTriangle size={16} className="text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary truncate">{task.title}</p>
                    <p className="text-xs text-muted">Overdue · was due {task.dueDate}</p>
                  </div>
                </div>
              ))}
              {dash.waitingFollowUps.map(w => (
                <Link key={w.id} href="/waiting" className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                  <Clock size={16} className="text-amber-400" />
                  <div>
                    <p className="text-sm text-primary">{w.title}</p>
                    <p className="text-xs text-muted">{w.person} · Follow up</p>
                  </div>
                </Link>
              ))}
              {dash.upcomingReminders.slice(0, 3).map(r => (
                <Link key={r.id} href="/reminders" className="flex items-center gap-3 p-3 rounded-xl border border-base hover:border-indigo-500/20">
                  <Bell size={16} className="text-indigo-400" />
                  <div>
                    <p className="text-sm text-primary">{r.title}</p>
                    <p className="text-xs text-muted">{r.remindAt.replace('T', ' ').slice(0, 16)}</p>
                  </div>
                </Link>
              ))}
              {dash.overdueTasks.length === 0 && dash.waitingFollowUps.length === 0 && dash.upcomingReminders.length === 0 && (
                <p className="text-sm text-muted">All clear. Add reminders or waiting-for items to track follow-ups.</p>
              )}
            </div>
          </section>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="bg-surface border border-base rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet size={15} className="text-emerald-400" />
                <h2 className="text-sm font-semibold text-primary">Finance Snapshot</h2>
              </div>
              <Link href="/finance" className="text-xs text-indigo-400">Charts →</Link>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-raised rounded-xl">
                <p className="text-[10px] text-muted uppercase">Receivables</p>
                <p className="text-sm font-bold text-emerald-400">{formatCurrency(dash.financeAlerts.totalReceivables)}</p>
              </div>
              <div className="p-3 bg-raised rounded-xl">
                <p className="text-[10px] text-muted uppercase">Payables</p>
                <p className="text-sm font-bold text-red-400">{formatCurrency(dash.financeAlerts.totalPayables)}</p>
              </div>
              <div className="p-3 bg-raised rounded-xl">
                <p className="text-[10px] text-muted uppercase">This Month</p>
                <p className="text-sm font-bold text-primary">{formatCurrency(dash.financeAlerts.monthlyExpenses)}</p>
              </div>
            </div>
          </section>

          <section className="bg-surface border border-base rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Flag size={15} className="text-purple-400" />
                <h2 className="text-sm font-semibold text-primary">Goal Progress</h2>
              </div>
              <Link href="/goals" className="text-xs text-indigo-400">All goals →</Link>
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
          defaultTopPriority
          onSave={d => {
            addTask(taskFormToEntity(d));
            setShowTaskForm(false);
            toast('Task added for today');
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
