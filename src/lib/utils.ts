import {
  format, isToday, isPast, isThisWeek, parseISO, startOfWeek, endOfWeek,
  startOfMonth, endOfMonth, isWithinInterval,
} from 'date-fns';
import {
  Priority, ProjectStatus, TaskStatus, Project, Task, DashboardStats,
  AppState, TodayDashboard, FocusQueueData, SearchResult, Goal, Habit,
  DayQueueItem, DayQueueReason, Reminder,
} from '@/types';
import { DEFAULT_CURRENCY } from './constants';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return '—';
  }
}

export function formatDateTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy · h:mm a');
  } catch {
    return '—';
  }
}

export function formatTime(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return '—';
  }
}

export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    const date = parseISO(dateStr);
    return isPast(date) && !isToday(date);
  } catch {
    return false;
  }
}

export function isDueToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    return isToday(parseISO(dateStr));
  } catch {
    return false;
  }
}

export function isDueThisWeek(dateStr: string | null): boolean {
  if (!dateStr) return false;
  try {
    return isThisWeek(parseISO(dateStr));
  } catch {
    return false;
  }
}

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function nowISO(): string {
  return new Date().toISOString();
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  low: 'Low', medium: 'Medium', high: 'High', urgent: 'Urgent',
};

export const PRIORITY_ORDER: Record<Priority, number> = {
  urgent: 4, high: 3, medium: 2, low: 1,
};

export const PRIORITY_DOT: Record<Priority, string> = {
  low: 'bg-slate-400',
  medium: 'bg-blue-500',
  high: 'bg-amber-500',
  urgent: 'bg-red-500',
};

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  not_started: 'Not Started', in_progress: 'In Progress',
  waiting: 'Waiting', completed: 'Completed', archived: 'Archived',
};

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To Do', in_progress: 'In Progress', waiting: 'Waiting',
  completed: 'Completed', archived: 'Archived',
};

export const FOCUS_QUEUE_LABELS = {
  now: 'Now', next: 'Next', later: 'Later',
};

export function isActiveTask(t: Task): boolean {
  return t.status !== 'completed' && t.status !== 'archived';
}

export function sortTasksByPriority(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const p = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    if (p !== 0) return p;
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function computeStats(projects: Project[], tasks: Task[]): DashboardStats {
  const activeTasks = tasks.filter(isActiveTask);
  const now = todayISO();
  return {
    totalProjects: projects.filter(p => p.status !== 'archived').length,
    completedProjects: projects.filter(p => p.status === 'completed').length,
    inProgressProjects: projects.filter(p => p.status === 'in_progress').length,
    pendingTasks: activeTasks.length,
    overdueTasks: activeTasks.filter(t => t.dueDate && t.dueDate < now).length,
    todaysTasks: activeTasks.filter(t => t.dueDate === now).length,
  };
}

export function sortProjects(projects: Project[], sortBy: string, order: 'asc' | 'desc'): Project[] {
  return [...projects].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'deadline') {
      cmp = (a.deadline || '9999').localeCompare(b.deadline || '9999');
    } else if (sortBy === 'priority') {
      cmp = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
    } else if (sortBy === 'name') {
      cmp = a.name.localeCompare(b.name);
    } else if (sortBy === 'created') {
      cmp = a.createdAt.localeCompare(b.createdAt);
    }
    return order === 'asc' ? cmp : -cmp;
  });
}

export function projectProgress(project: Project, tasks: Task[]): number {
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  if (projectTasks.length === 0) return project.progressPercent;
  const done = projectTasks.filter(t => t.status === 'completed').length;
  return Math.round((done / projectTasks.length) * 100);
}

export function getProjectTasks(tasks: Task[], projectId: string): Task[] {
  return tasks.filter(t => t.projectId === projectId);
}

export function getAreaProjects(projects: Project[], areaId: string): Project[] {
  return projects.filter(p => p.areaId === areaId && p.status !== 'archived');
}

export function computeFocusQueue(tasks: Task[]): FocusQueueData {
  const active = tasks.filter(isActiveTask);
  return {
    now: sortTasksByPriority(active.filter(t => t.focusQueue === 'now')),
    next: sortTasksByPriority(active.filter(t => t.focusQueue === 'next')),
    later: sortTasksByPriority(active.filter(t => t.focusQueue === 'later')),
  };
}

export function suggestFocusNow(tasks: Task[]): Task | null {
  const active = tasks.filter(isActiveTask);
  const nowTasks = sortTasksByPriority(active.filter(t => t.focusQueue === 'now'));
  if (nowTasks.length > 0) return nowTasks[0];
  const overdue = sortTasksByPriority(active.filter(t => isOverdue(t.dueDate)));
  if (overdue.length > 0) return overdue[0];
  const topPriority = sortTasksByPriority(active.filter(t => t.isTopPriority));
  if (topPriority.length > 0) return topPriority[0];
  const nextTasks = sortTasksByPriority(active.filter(t => t.focusQueue === 'next'));
  if (nextTasks.length > 0) return nextTasks[0];
  const dueToday = sortTasksByPriority(active.filter(t => isDueToday(t.dueDate)));
  if (dueToday.length > 0) return dueToday[0];
  return sortTasksByPriority(active)[0] ?? null;
}

export function getWeekBounds(date = new Date()): { start: string; end: string } {
  const start = startOfWeek(date, { weekStartsOn: 1 });
  const end = endOfWeek(date, { weekStartsOn: 1 });
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
  };
}

export function getMonthBounds(date = new Date()): { start: string; end: string; key: string; label: string } {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  return {
    start: format(start, 'yyyy-MM-dd'),
    end: format(end, 'yyyy-MM-dd'),
    key: format(start, 'yyyy-MM'),
    label: format(start, 'MMMM yyyy'),
  };
}

const DAY_QUEUE_LABELS: Record<DayQueueReason, string> = {
  overdue: 'Overdue',
  today: 'Due today',
  focus: 'Focus now',
  priority: 'Priority',
  reminder: 'Reminder',
};

export function dayQueueReasonLabel(reason: DayQueueReason): string {
  return DAY_QUEUE_LABELS[reason];
}

export function computeDayQueue(state: AppState): DayQueueItem[] {
  const active = state.tasks.filter(isActiveTask);
  const now = todayISO();
  const seen = new Set<string>();
  const items: DayQueueItem[] = [];

  const addTask = (task: Task, reason: DayQueueReason) => {
    if (seen.has(task.id)) return;
    seen.add(task.id);
    items.push({ id: `task-${task.id}`, kind: 'task', reason, task });
  };

  sortTasksByPriority(active.filter(t => isOverdue(t.dueDate))).forEach(t => addTask(t, 'overdue'));
  sortTasksByPriority(active.filter(t => t.focusQueue === 'now')).forEach(t => addTask(t, 'focus'));
  sortTasksByPriority(active.filter(t => t.dueDate === now)).forEach(t => addTask(t, 'today'));
  sortTasksByPriority(active.filter(t => t.isTopPriority)).forEach(t => addTask(t, 'priority'));

  state.reminders
    .filter(r => r.status === 'pending' && r.remindAt.slice(0, 10) <= now)
    .sort((a, b) => a.remindAt.localeCompare(b.remindAt))
    .slice(0, 5)
    .forEach(r => {
      items.push({ id: `reminder-${r.id}`, kind: 'reminder', reason: 'reminder', reminder: r });
    });

  return items;
}

export function computeTodayDashboard(state: AppState): TodayDashboard {
  const now = todayISO();
  const monthKey = now.slice(0, 7);

  const todaysHabits = state.habits
    .filter(h => h.isActive && (h.frequency === 'daily' || h.frequency === 'weekly'))
    .map(habit => ({
      habit,
      completed: state.habitCompletions.some(
        c => c.habitId === habit.id && c.completedAt.startsWith(now)
      ),
    }));

  const monthlyExpenses = state.expenses
    .filter(e => e.date.startsWith(monthKey))
    .reduce((sum, e) => sum + e.amount, 0);

  const monthlyIncome = (state.incomes ?? [])
    .filter(i => i.date.startsWith(monthKey))
    .reduce((sum, i) => sum + i.amount, 0);

  const totalPayables = state.payables
    .filter(p => p.status === 'pending' || p.status === 'partial')
    .reduce((sum, p) => sum + p.amount, 0);

  const upcomingPayables = state.payables
    .filter(p => (p.status === 'pending' || p.status === 'partial') && p.dueDate)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 3);

  return {
    dayQueue: computeDayQueue(state),
    todaysHabits,
    financeAlerts: { monthlyIncome, totalPayables, monthlyExpenses, upcomingPayables },
    goalProgress: state.goals.filter(g => g.status === 'active').slice(0, 4),
  };
}

export function computeHabitStreak(habitId: string, completions: AppState['habitCompletions']): number {
  const dates = new Set(
    completions.filter(c => c.habitId === habitId).map(c => c.completedAt.split('T')[0])
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    if (dates.has(key)) streak++;
    else if (i > 0) break;
  }
  return streak;
}

export function computeHabitCompletionRate(
  habitId: string,
  completions: AppState['habitCompletions'],
  days = 30
): number {
  const dates = completions
    .filter(c => c.habitId === habitId)
    .map(c => c.completedAt.split('T')[0]);
  const unique = new Set(dates);
  return Math.round((unique.size / days) * 100);
}

export function goalProgressPercent(goal: Goal): number {
  if (goal.targetValue && goal.targetValue > 0) {
    return Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
  }
  return goal.status === 'completed' ? 100 : 0;
}

export function globalSearch(state: AppState, query: string): SearchResult[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  const results: SearchResult[] = [];

  state.tasks.filter(isActiveTask).forEach(t => {
    if (t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)) {
      results.push({ type: 'task', id: t.id, title: t.title, subtitle: TASK_STATUS_LABELS[t.status] });
    }
  });
  state.notes.forEach(n => {
    if (n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some(t => t.includes(q))) {
      results.push({ type: 'note', id: n.id, title: n.title, subtitle: n.category });
    }
  });
  state.projects.filter(p => p.status !== 'archived').forEach(p => {
    if (p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)) {
      results.push({ type: 'project', id: p.id, title: p.name, subtitle: PROJECT_STATUS_LABELS[p.status] });
    }
  });
  state.goals.forEach(g => {
    if (g.title.toLowerCase().includes(q)) {
      results.push({ type: 'goal', id: g.id, title: g.title, subtitle: g.horizon.replace('_', ' ') });
    }
  });
  state.habits.filter(h => h.isActive).forEach(h => {
    if (h.name.toLowerCase().includes(q)) {
      results.push({ type: 'habit', id: h.id, title: h.name, subtitle: h.frequency });
    }
  });
  state.areas.filter(a => !a.isArchived).forEach(a => {
    if (a.name.toLowerCase().includes(q)) {
      results.push({ type: 'area', id: a.id, title: a.name, subtitle: 'Area' });
    }
  });

  return results.slice(0, 30);
}

export function normalizeTags(tags: string[]): string[] {
  return [...new Set(tags.map(t => t.trim().toLowerCase().replace(/\s+/g, '-')).filter(Boolean))];
}

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

const CURRENCY_LOCALE: Record<string, string> = {
  PKR: 'en-PK',
  USD: 'en-US',
};

export function formatCurrency(amount: number, currency = DEFAULT_CURRENCY): string {
  const locale = CURRENCY_LOCALE[currency] ?? 'en-PK';
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(amount);
}
