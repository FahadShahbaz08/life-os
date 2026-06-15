'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import {
  Sun, Moon, ChevronLeft, Brain, Focus, LayoutGrid, Flag, Repeat, FileText, Bell, Wallet,
  CalendarCheck, Telescope, Timer, Search, Plus, ListTodo, TrendingUp, FolderKanban, LogOut,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import { useToastContext } from '@/context/ToastContext';

const MAIN_NAV = [
  { href: '/', label: 'Today', icon: LayoutGrid },
  { href: '/focus', label: 'Focus', icon: Focus },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/trading', label: 'Trading', icon: TrendingUp },
  { href: '/goals', label: 'Goals', icon: Flag },
  { href: '/habits', label: 'Habits', icon: Repeat },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/finance', label: 'Finance', icon: Wallet },
  { href: '/review', label: 'Performance', icon: CalendarCheck },
  { href: '/vision', label: 'Life Vision', icon: Telescope },
  { href: '/focus-session', label: 'Focus Session', icon: Timer },
  { href: '/search', label: 'Search', icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, toggleTheme } = useTheme();
  const { state, addTask, syncStatus } = useApp();
  const { toast } = useToastContext();
  const [collapsed, setCollapsed] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <aside className={`hidden md:flex flex-col h-full min-h-0 bg-surface border-r border-base dark:shadow-[4px_0_24px_-8px_rgba(0,0,0,0.5)] transition-all duration-300 shrink-0 ${collapsed ? 'w-14' : 'w-60'}`}>
        <div className="flex items-center justify-between px-3 py-3.5 border-b border-base">
          {collapsed ? (
            <button onClick={() => setCollapsed(false)} className="mx-auto">
              <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center"><Brain size={14} className="text-white" /></div>
            </button>
          ) : (
            <>
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center"><Brain size={14} className="text-white" /></div>
                <span className="font-bold text-primary text-sm">Life OS</span>
              </Link>
              <button onClick={() => setCollapsed(true)} className="p-1.5 text-muted hover:text-secondary hover:bg-raised rounded-lg"><ChevronLeft size={14} /></button>
            </>
          )}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto os-scroll-sidebar py-2 px-2">
          {!collapsed && (
            <button onClick={() => setShowTaskForm(true)} className="w-full flex items-center gap-2 px-2.5 py-2 mb-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl">
              <Plus size={15} />Add Task
            </button>
          )}

          {MAIN_NAV.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} title={collapsed ? label : undefined}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm font-medium transition-colors mb-0.5 ${
                isActive(href) ? 'bg-accent-subtle text-accent border border-accent' : 'text-secondary hover:bg-raised hover:text-primary border border-transparent'
              }`}>
              <Icon size={16} className="shrink-0" />
              {!collapsed && label}
            </Link>
          ))}

        </div>

        <div className="px-2 py-2 border-t border-base space-y-1">
          {!collapsed && session?.user?.email && (
            <div className="px-2.5 py-2 text-[10px] text-muted truncate">
              {session.user.email}
              {syncStatus === 'saving' && <span className="text-amber-400 ml-1">· saving</span>}
              {syncStatus === 'saved' && <span className="text-emerald-400 ml-1">· saved</span>}
              {syncStatus === 'error' && <span className="text-red-400 ml-1">· sync error</span>}
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

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-base z-40 px-1 py-1">
        <div className="flex items-center justify-around">
          {[
            { href: '/', icon: LayoutGrid, label: 'Today' },
            { href: '/focus', icon: Focus, label: 'Focus' },
            { href: '/tasks', icon: ListTodo, label: 'Tasks' },
            { href: '/trading', icon: TrendingUp, label: 'Trading' },
            { href: '/habits', icon: Repeat, label: 'Habits' },
          ].map(({ href, icon: Icon, label }) => (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 px-2 py-1.5 ${isActive(href) ? 'text-accent' : 'text-muted'}`}>
              <Icon size={18} /><span className="text-[9px] font-medium">{label}</span>
            </Link>
          ))}
          <button onClick={() => setShowTaskForm(true)} className="flex flex-col items-center gap-0.5 px-2 py-1.5">
            <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center"><Plus size={16} className="text-white" /></div>
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
