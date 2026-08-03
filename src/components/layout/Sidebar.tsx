'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Sun, Moon, ChevronLeft, Brain, LayoutGrid, Flag, FileText, Wallet, BookOpen,
  CalendarCheck, Telescope, Timer, Search, Plus, ListTodo, TrendingUp, FolderKanban, LogOut,
  Cloud, CloudOff, RefreshCw,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import { useToastContext } from '@/context/ToastContext';

const MAIN_NAV = [
  { href: '/', label: 'Today', icon: LayoutGrid },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/trading', label: 'Trading', icon: TrendingUp },
  { href: '/goals', label: 'Goals', icon: Flag },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/books', label: 'Books', icon: BookOpen },
  { href: '/finance', label: 'Finance', icon: Wallet },
  { href: '/review', label: 'Performance', icon: CalendarCheck },
  { href: '/vision', label: 'Life Vision', icon: Telescope },
  { href: '/focus-session', label: 'Timer', icon: Timer },
  { href: '/search', label: 'Search', icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { addTask, syncStatus, isOnline, forceSync } = useApp();
  const { toast } = useToastContext();
  const [collapsed, setCollapsed] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  const syncLabel =
    !isOnline || syncStatus === 'offline' ? 'offline' :
    syncStatus === 'saving' ? 'saving' :
    syncStatus === 'saved' ? 'saved' :
    syncStatus === 'error' ? 'sync issue' : '';

  return (
    <>
      <aside className={`hidden md:flex flex-col h-full min-h-0 bg-surface/90 backdrop-blur-sm border-r border-base transition-all duration-300 shrink-0 ${collapsed ? 'w-14' : 'w-60'}`}>
        <div className="flex items-center justify-between px-3 py-3.5 border-b border-base">
          {collapsed ? (
            <button onClick={() => setCollapsed(false)} className="mx-auto">
              <div className="w-7 h-7 bg-[var(--accent)] rounded-md flex items-center justify-center">
                <Brain size={14} className="text-[var(--bg-base)]" />
              </div>
            </button>
          ) : (
            <>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[var(--accent)] rounded-md flex items-center justify-center">
                  <Brain size={14} className="text-[var(--bg-base)]" />
                </div>
                <span className="font-display font-bold text-primary text-sm tracking-tight">Life OS</span>
              </Link>
              <button onClick={() => setCollapsed(true)} className="p-1.5 text-muted hover:text-secondary hover:bg-raised rounded-lg">
                <ChevronLeft size={14} />
              </button>
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto os-scroll-sidebar py-2 px-2">
          {!collapsed && (
            <button onClick={() => setShowTaskForm(true)} className="w-full flex items-center gap-2 px-2.5 py-2 mb-2 text-sm font-medium bg-[var(--accent)] text-[var(--bg-base)] hover:opacity-90 rounded-lg">
              <Plus size={15} />Add Task
            </button>
          )}

          {MAIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
              isActive(href) ? 'bg-raised text-primary border border-base' : 'text-secondary hover:bg-raised hover:text-primary border border-transparent'
              }`}>
              <Icon size={16} className="shrink-0" />
              {!collapsed && label}
            </Link>
          ))}
        </div>

        <div className="px-2 py-2 border-t border-base space-y-1">
          {!collapsed && session?.user?.email && (
            <div className="px-2.5 py-2 text-[10px] text-muted truncate flex items-center gap-1.5">
              {!isOnline || syncStatus === 'offline' ? (
                <CloudOff size={11} className="text-amber-400 shrink-0" />
              ) : (
                <Cloud size={11} className="text-accent shrink-0" />
              )}
              <span className="truncate">{session.user.email}</span>
              {syncLabel && (
                <span className={
                  syncStatus === 'error' || syncStatus === 'offline' ? 'text-amber-400' :
                  syncStatus === 'saved' ? 'text-emerald-400' : 'text-muted'
                }>· {syncLabel}</span>
              )}
              {(syncStatus === 'error' || syncStatus === 'offline') && (
                <button onClick={forceSync} className="p-0.5 text-muted hover:text-accent" title="Retry sync">
                  <RefreshCw size={10} />
                </button>
              )}
            </div>
          )}
          <button onClick={toggleTheme} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-secondary hover:bg-raised">
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            {!collapsed && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
          </button>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-secondary hover:bg-raised hover:text-red-400"
          >
            <LogOut size={15} />
            {!collapsed && 'Sign out'}
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur-md border-t border-base z-40 px-1 py-1">
        <div className="flex items-center justify-around">
          {[
            { href: '/', icon: LayoutGrid, label: 'Today' },
            { href: '/tasks', icon: ListTodo, label: 'Tasks' },
            { href: '/trading', icon: TrendingUp, label: 'Trading' },
            { href: '/finance', icon: Wallet, label: 'Finance' },
            { href: '/notes', icon: FileText, label: 'Notes' },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 px-2 py-1.5 ${isActive(href) ? 'text-accent' : 'text-muted'}`}>
              <Icon size={18} /><span className="text-[9px] font-medium">{label}</span>
            </Link>
          ))}
          <button onClick={() => setShowTaskForm(true)} className="flex flex-col items-center gap-0.5 px-2 py-1.5">
            <div className="w-8 h-8 bg-[var(--accent)] rounded-lg flex items-center justify-center">
              <Plus size={16} className="text-[var(--bg-base)]" />
            </div>
            <span className="text-[9px] font-medium text-muted">Add</span>
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
