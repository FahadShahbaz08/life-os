'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { Bell, Check, CheckCheck, Trash2, X, Wallet, ListTodo, Info } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { formatDistanceToNow } from 'date-fns';

export default function NotificationBell() {
  const {
    state, markNotificationRead, markAllNotificationsRead,
    dismissNotification, clearNotifications,
  } = useApp();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const unread = state.notifications.filter(n => !n.read).length;

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || panelRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const iconFor = (type: string) => {
    if (type === 'finance') return <Wallet size={14} className="text-emerald-400" />;
    if (type === 'task') return <ListTodo size={14} className="text-accent" />;
    return <Info size={14} className="text-muted" />;
  };

  const panel = open && mounted ? createPortal(
    <div
      ref={panelRef}
      className="fixed right-3 sm:right-6 top-14 z-[200] w-[calc(100vw-1.5rem)] sm:w-96 max-w-md bg-surface border border-base rounded-2xl shadow-2xl panel-in overflow-hidden"
      role="dialog"
      aria-label="Notifications"
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-base bg-surface">
        <h3 className="font-display text-sm font-semibold text-primary">Notifications</h3>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              className="p-1.5 text-muted hover:text-accent rounded-lg"
              title="Mark all read"
            >
              <CheckCheck size={14} />
            </button>
          )}
          {state.notifications.length > 0 && (
            <button
              type="button"
              onClick={() => clearNotifications()}
              className="p-1.5 text-muted hover:text-red-400 rounded-lg"
              title="Clear all"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button type="button" onClick={() => setOpen(false)} className="p-1.5 text-muted hover:text-secondary rounded-lg">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="max-h-80 overflow-y-auto os-scroll bg-surface">
        {state.notifications.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <Bell size={24} className="mx-auto text-muted mb-2 opacity-50" />
            <p className="text-sm text-muted">No notifications yet</p>
          </div>
        ) : (
          state.notifications.map(n => {
            const content = (
              <div className={`flex gap-3 px-4 py-3 border-b border-subtle last:border-0 hover:bg-raised/60 transition-colors ${!n.read ? 'bg-accent-subtle/40' : ''}`}>
                <div className="mt-0.5 shrink-0 w-7 h-7 rounded-lg bg-raised flex items-center justify-center">
                  {iconFor(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${!n.read ? 'font-semibold text-primary' : 'text-primary'}`}>{n.title}</p>
                  <p className="text-xs text-secondary line-clamp-2 mt-0.5">{n.body}</p>
                  <p className="text-[10px] text-muted mt-1">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  {!n.read && (
                    <button
                      type="button"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); markNotificationRead(n.id); }}
                      className="p-1 text-muted hover:text-accent"
                      title="Mark read"
                    >
                      <Check size={12} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={e => { e.preventDefault(); e.stopPropagation(); dismissNotification(n.id); }}
                    className="p-1 text-muted hover:text-red-400"
                    title="Dismiss"
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            );

            if (n.href) {
              return (
                <Link
                  key={n.id}
                  href={n.href}
                  onClick={() => { markNotificationRead(n.id); setOpen(false); }}
                >
                  {content}
                </Link>
              );
            }
            return <div key={n.id}>{content}</div>;
          })
        )}
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl text-secondary hover:text-primary hover:bg-raised transition-colors"
        aria-label="Notifications"
        aria-expanded={open}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
