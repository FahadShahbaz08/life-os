import {
  LayoutGrid, Flag, FileText, Wallet, BookOpen, CalendarCheck, Telescope, Timer,
  Search, ListTodo, TrendingUp, FolderKanban, Sparkles, Repeat, Inbox, Bell, Clock,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const MAIN_NAV: NavItem[] = [
  { href: '/', label: 'Today', icon: LayoutGrid },
  { href: '/tasks', label: 'Tasks', icon: ListTodo },
  { href: '/reflection', label: 'Self Reflection', icon: Sparkles },
  { href: '/books', label: 'Books', icon: BookOpen },
  { href: '/finance', label: 'Finance', icon: Wallet },
  { href: '/trading', label: 'Trading', icon: TrendingUp },
  { href: '/projects', label: 'Projects', icon: FolderKanban },
  { href: '/goals', label: 'Goals', icon: Flag },
  { href: '/notes', label: 'Notes', icon: FileText },
  { href: '/review', label: 'Performance', icon: CalendarCheck },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/vision', label: 'Life Vision', icon: Telescope },
  { href: '/focus-session', label: 'Timer', icon: Timer },
  { href: '/habits', label: 'Habits', icon: Repeat },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/reminders', label: 'Reminders', icon: Bell },
  { href: '/waiting', label: 'Waiting', icon: Clock },
];

export const DOCK_HREFS = ['/', '/tasks', '/finance'] as const;

export const MORE_NAV: NavItem[] = MAIN_NAV.filter(
  (item) => !(DOCK_HREFS as readonly string[]).includes(item.href)
);
