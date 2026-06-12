'use client';

import { useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  registerServiceWorker, collectDueNotifications, showNotification,
} from '@/lib/notifications';

export default function NotificationManager() {
  const { state, hydrated, updateSettings } = useApp();

  useEffect(() => {
    registerServiceWorker();
  }, []);

  useEffect(() => {
    if (!hydrated || !state.settings.notificationsEnabled) return;

    const check = () => {
      const notified = state.settings.notifiedReminderIds ?? [];
      const items = collectDueNotifications(state, notified);
      if (items.length === 0) return;

      const newIds = [...notified];
      items.forEach(item => {
        showNotification(item.title, item.body, item.id);
        if (!newIds.includes(item.id)) newIds.push(item.id);
      });
      if (newIds.length > notified.length) {
        updateSettings({ notifiedReminderIds: newIds.slice(-200) });
      }
    };

    check();
    const interval = setInterval(check, 60_000);
    return () => clearInterval(interval);
  }, [hydrated, state, updateSettings]);

  return null;
}
