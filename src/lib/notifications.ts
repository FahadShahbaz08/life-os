import { AppState, Task } from '@/types';
import { taskDueDateTimeMs } from '@/lib/utils';

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function showNotification(title: string, body: string, tag?: string) {
  if (typeof window === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, tag, icon: '/file.svg' });
  } catch {
    // Some browsers block without service worker
  }
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
}

function collectTaskNotifications(task: Task, nowMs: number, alreadyNotified: string[]): NotificationItem[] {
  if (task.status === 'completed' || task.status === 'archived') return [];

  const dueMs = taskDueDateTimeMs(task);
  if (dueMs === null) return [];

  const items: NotificationItem[] = [];
  const dueKey = `task-due-${task.id}`;

  if (nowMs >= dueMs && nowMs < dueMs + 90_000 && !alreadyNotified.includes(dueKey)) {
    const timeLabel = task.dueTime ? ` (${task.dueTime})` : '';
    items.push({
      id: dueKey,
      title: 'Task due now',
      body: `${task.title}${timeLabel}`,
    });
  }

  if (task.followUpIntervalMinutes && nowMs > dueMs) {
    const intervalMs = task.followUpIntervalMinutes * 60_000;
    const intervalsPassed = Math.floor((nowMs - dueMs) / intervalMs);
    if (intervalsPassed >= 1) {
      const followUpKey = `task-followup-${task.id}-${intervalsPassed}`;
      if (!alreadyNotified.includes(followUpKey)) {
        items.push({
          id: followUpKey,
          title: 'Task still pending',
          body: `${task.title} — mark done when complete`,
        });
      }
    }
  }

  return items;
}

export function collectDueNotifications(state: AppState, alreadyNotified: string[]): NotificationItem[] {
  const items: NotificationItem[] = [];
  const now = new Date();
  const nowMs = now.getTime();
  const today = now.toISOString().split('T')[0];

  state.reminders
    .filter(r => r.status === 'pending')
    .forEach(r => {
      const due = new Date(r.remindAt).getTime();
      if (due <= nowMs + 60000 && !alreadyNotified.includes(`reminder-${r.id}`)) {
        items.push({ id: `reminder-${r.id}`, title: 'Reminder', body: r.title });
      }
    });

  state.tasks.forEach(t => {
    items.push(...collectTaskNotifications(t, nowMs, alreadyNotified));

    if (t.status === 'completed' || t.status === 'archived') return;

    if (t.dueDate && t.dueDate < today && !alreadyNotified.includes(`overdue-${t.id}`)) {
      items.push({ id: `overdue-${t.id}`, title: 'Overdue task', body: t.title });
    }
    if (t.dueDate === today && !t.dueTime && !alreadyNotified.includes(`today-${t.id}`)) {
      const hour = now.getHours();
      if (hour >= 8 && hour <= 9) {
        items.push({ id: `today-${t.id}`, title: 'Due today', body: t.title });
      }
    }
  });

  state.habits
    .filter(h => h.isActive && h.frequency === 'daily')
    .forEach(h => {
      const done = state.habitCompletions.some(c => c.habitId === h.id && c.completedAt.startsWith(today));
      const hour = now.getHours();
      if (!done && hour >= 18 && hour <= 19 && !alreadyNotified.includes(`habit-${h.id}-${today}`)) {
        items.push({ id: `habit-${h.id}-${today}`, title: 'Habit reminder', body: `Don't forget: ${h.name}` });
      }
    });

  return items;
}
