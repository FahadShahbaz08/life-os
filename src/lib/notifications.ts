import { AppState } from '@/types';

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

  state.tasks
    .filter(t => t.status !== 'completed' && t.status !== 'archived')
    .forEach(t => {
      if (t.dueDate && t.dueDate < today && !alreadyNotified.includes(`overdue-${t.id}`)) {
        items.push({ id: `overdue-${t.id}`, title: 'Overdue task', body: t.title });
      }
      if (t.dueDate === today && !alreadyNotified.includes(`today-${t.id}`)) {
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
