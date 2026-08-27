'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Plus, MoreHorizontal, X, Sun, Moon, LogOut, Cloud, CloudOff, RefreshCw, LayoutGrid,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import { useToastContext } from '@/context/ToastContext';
import { MAIN_NAV } from './nav';

const DOCK_LEFT = MAIN_NAV.filter((item) => item.href === '/' || item.href === '/tasks');
const DOCK_RIGHT = MAIN_NAV.filter((item) => item.href === '/finance');

export default function MobileDock({
  menuOpen,
  onMenuOpenChange,
}: {
  menuOpen: boolean;
  onMenuOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { addTask, syncStatus, isOnline, forceSync } = useApp();
  const { toast } = useToastContext();
  const [showTaskForm, setShowTaskForm] = useState(false);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);
  const moreActive = MAIN_NAV.some((item) => {
    if (item.href === '/' || item.href === '/tasks' || item.href === '/finance') return false;
    return isActive(item.href);
  });

  const syncLabel =
    !isOnline || syncStatus === 'offline' ? 'offline' :
    syncStatus === 'saving' ? 'saving' :
    syncStatus === 'saved' ? 'saved' :
    syncStatus === 'error' ? 'sync issue' : 'online';

  const dockBtn = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 min-w-0 flex-1 py-1 touch-manipulation ${active ? 'text-accent' : 'text-muted'}`;

  return (
    <>
      {menuOpen && (
        <div className="lg:hidden fixed inset-0 z-[200] flex flex-col bg-base">
          <div className="shrink-0 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 border-b border-base">
            <div className="flex items-center gap-2">
              <LayoutGrid size={16} className="text-muted" />
              <p className="text-sm font-display font-semibold text-primary">All features</p>
            </div>
            <button
              type="button"
              onClick={() => onMenuOpenChange(false)}
              className="p-2 text-muted hover:text-primary hover:bg-raised rounded-xl touch-manipulation"
              aria-label="Close menu"
            >
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto os-scroll px-3 py-3">
            <div className="grid grid-cols-3 gap-2">
              {MAIN_NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => onMenuOpenChange(false)}
                  className={`flex flex-col items-center justify-center gap-2 min-h-[5.5rem] px-2 py-3 rounded-2xl border touch-manipulation ${
                    isActive(href)
                      ? 'bg-raised text-primary border-base'
                      : 'text-secondary border-transparent bg-surface'
                  }`}
                >
                  <Icon size={24} />
                  <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="shrink-0 px-4 py-3 border-t border-base space-y-1 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            {session?.user?.email && (
              <div className="px-2.5 py-2 text-[11px] text-muted truncate flex items-center gap-1.5">
                {!isOnline || syncStatus === 'offline' ? (
                  <CloudOff size={12} className="text-amber-400 shrink-0" />
                ) : (
                  <Cloud size={12} className="text-accent shrink-0" />
                )}
                <span className="truncate">{session.user.email}</span>
                <span className={
                  syncStatus === 'error' || syncStatus === 'offline' || !isOnline
                    ? 'text-amber-400'
                    : syncStatus === 'saved' ? 'text-emerald-400' : 'text-muted'
                }>· {syncLabel}</span>
                {(syncStatus === 'error' || syncStatus === 'offline' || !isOnline) && (
                  <button type="button" onClick={forceSync} className="p-0.5 text-muted hover:text-accent" title="Retry sync">
                    <RefreshCw size={12} />
                  </button>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={toggleTheme}
              className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm text-secondary hover:bg-raised touch-manipulation"
            >
              {theme === 'dark' ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-xl text-sm text-secondary hover:bg-raised hover:text-red-400 touch-manipulation"
            >
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-base pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around px-1 pt-1 pb-1.5">
          {DOCK_LEFT.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={dockBtn(isActive(href))}>
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => { onMenuOpenChange(false); setShowTaskForm(true); }}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 touch-manipulation"
            aria-label="Add task"
          >
            <div className="w-11 h-11 rounded-xl bg-[var(--accent)] flex items-center justify-center">
              <Plus size={22} className="text-[var(--bg-base)]" />
            </div>
            <span className="text-[10px] font-medium text-muted">Add</span>
          </button>
          {DOCK_RIGHT.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={dockBtn(isActive(href))}>
              <Icon size={22} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          ))}
          <button
            type="button"
            onClick={() => onMenuOpenChange(true)}
            className={dockBtn(moreActive || menuOpen)}
            aria-label="All features"
          >
            <MoreHorizontal size={22} />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {showTaskForm && (
        <TaskForm
          defaultDueDate={new Date().toISOString().split('T')[0]}
          onSave={d => { addTask(taskFormToEntity(d)); setShowTaskForm(false); toast('Task added'); }}
          onClose={() => setShowTaskForm(false)}
        />
      )}
    </>
  );
}
