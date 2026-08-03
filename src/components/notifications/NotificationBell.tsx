'use client';

import { useEffect, useRef, useState } from 'react';
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
  const ref = useRef<HTMLDivElement>(null);

  const unread = state.notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const iconFor = (type: string) => {
    if (type === 'finance') return <Wallet size={14} className="text-emerald-400" />;
    if (type === 'task') return <ListTodo size={14} className="text-accent" />;
    return <Info size={14} className="text-muted" />;
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="relative p-2 rounded-xl text-secondary hover:text-primary hover:bg-raised transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-surface border border-base rounded-2xl shadow-2xl z-50 panel-in overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-base">
            <h3 className="font-display text-sm font-semibold text-primary">Notifications</h3>
            <div className="flex items-center gap-1">
              {unread > 0 && (
                <button
                  onClick={() => markAllNotificationsRead()}
                  className="p-1.5 text-muted hover:text-accent rounded-lg"
                  title="Mark all read"
                >
                  <CheckCheck size={14} />
                </button>
              )}
              {state.notifications.length > 0 && (
                <button
                  onClick={() => clearNotifications()}
                  className="p-1.5 text-muted hover:text-red-400 rounded-lg"
                  title="Clear all"
                >
                  <Trash2 size={14} />
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1.5 text-muted hover:text-secondary rounded-lg">
                <X size={14} />
              </button>
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto os-scroll">
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
                          onClick={e => { e.preventDefault(); e.stopPropagation(); markNotificationRead(n.id); }}
                          className="p-1 text-muted hover:text-accent"
                          title="Mark read"
                        >
                          <Check size={12} />
                        </button>
                      )}
                      <button
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
        </div>
      )}
    </div>
  );
}
