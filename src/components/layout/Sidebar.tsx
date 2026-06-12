'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sun, Moon, ChevronLeft, Brain, Focus, LayoutGrid, Flag, Repeat, FileText, Bell, Clock, Wallet,
  CalendarCheck, Telescope, Timer, Search, Plus, ListTodo, TrendingUp,
} from 'lucide-react';
import { useTheme } from '@/context/ThemeContext';
import { useApp } from '@/context/AppContext';
import { getAreaIcon } from '@/lib/area-icons';
import TaskForm, { taskFormToEntity } from '@/components/tasks/TaskForm';
import { useToastContext } from '@/context/ToastContext';

const MAIN_NAV = [
  { href: '/', label: 'Today', icon: LayoutGrid },
  { href: '/focus', label: 'Focus', icon: Focus },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/trading', label: 'Trading', icon: TrendingUp },
  { href: '/goals', label: 'Goals', icon: Flag },
  { href: '/habits', label: 'Habits', icon: Repeat },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/waiting', label: 'Waiting For', icon: Clock },
  { href: '/finance', label: 'Finance', icon: Wallet },
  { href: '/review', label: 'Weekly Review', icon: CalendarCheck },
  { href: '/vision', label: 'Life Vision', icon: Telescope },
  { href: '/focus-session', label: 'Focus Session', icon: Timer },
  { href: '/search', label: 'Search', icon: Search },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme } = useTheme();
  const { state, addTask } = useApp();
  const { toast } = useToastContext();
  const [collapsed, setCollapsed] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const areas = state.areas.filter(a => !a.isArchived).sort((a, b) => a.sortOrder - b.sortOrder);
  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <>
      <aside className={`hidden md:flex flex-col h-full min-h-0 bg-surface border-r border-base transition-all duration-300 shrink-0 ${collapsed ? 'w-14' : 'w-60'}`}>
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
                isActive(href) ? 'bg-indigo-500/10 text-indigo-400' : 'text-secondary hover:bg-raised hover:text-primary'
              }`}>
              <Icon size={16} className="shrink-0" />
              {!collapsed && label}
            </Link>
          ))}

          {!collapsed && (
            <div className="mt-4">
              <div className="px-2.5 mb-1.5"><span className="text-[10px] font-semibold text-muted uppercase tracking-widest">Areas</span></div>
              {areas.map(area => {
                const Icon = getAreaIcon(area.icon);
                return (
                  <Link key={area.id} href={`/areas/${area.id}`}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm mb-0.5 ${
                      pathname === `/areas/${area.id}` ? 'bg-indigo-500/10 text-indigo-400' : 'text-secondary hover:bg-raised'
                    }`}>
                    <Icon size={14} style={{ color: area.color }} className="shrink-0" />
                    <span className="truncate">{area.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-2 py-2 border-t border-base">
          <button onClick={toggleTheme} className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-sm text-secondary hover:bg-raised">
            {theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            {!collapsed && (theme === 'dark' ? 'Light mode' : 'Dark mode')}
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
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 px-2 py-1.5 ${isActive(href) ? 'text-indigo-400' : 'text-muted'}`}>
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
