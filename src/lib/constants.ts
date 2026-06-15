import { Area, ExpenseCategory, IncomeSource, NoteCategory } from '@/types';
import { generateId } from './utils';

export const STORAGE_KEY = 'lifeos_data';
export const LEGACY_STORAGE_KEY = 'taskflow_data';
export const DEFAULT_CURRENCY = 'PKR';

export const DEFAULT_AREAS: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Personal', slug: 'personal', icon: 'heart', color: '#ef4444', sortOrder: 0, isArchived: false },
  { name: 'Work', slug: 'work', icon: 'briefcase', color: '#6366f1', sortOrder: 1, isArchived: false },
  { name: 'Money', slug: 'money', icon: 'wallet', color: '#22c55e', sortOrder: 2, isArchived: false },
  { name: 'Growth', slug: 'growth', icon: 'graduation-cap', color: '#a855f7', sortOrder: 3, isArchived: false },
];

export const PROJECT_TAG_SUGGESTIONS = [
  'business', 'career', 'health', 'finance', 'learning', 'personal', 'trading', 'game-dev',
];

export const INCOME_SOURCES: { value: IncomeSource; label: string }[] = [
  { value: 'salary', label: 'Salary' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'business', label: 'Business' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
];

export function createDefaultAreas(): Area[] {
  const now = new Date().toISOString();
  return DEFAULT_AREAS.map(a => ({
    ...a,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  }));
}

export const NOTE_CATEGORIES: { value: NoteCategory; label: string }[] = [
  { value: 'general', label: 'General' },
  { value: 'trading', label: 'Trading' },
  { value: 'unity', label: 'Unity' },
  { value: 'game_dev', label: 'Game Development' },
  { value: 'finance', label: 'Finance' },
  { value: 'business', label: 'Business' },
  { value: 'books', label: 'Books' },
  { value: 'ideas', label: 'Ideas' },
  { value: 'learning', label: 'Learning' },
  { value: 'journal', label: 'Journal' },
];

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'food', label: 'Food' },
  { value: 'gym', label: 'Gym' },
  { value: 'software', label: 'Software' },
  { value: 'fuel', label: 'Fuel' },
  { value: 'family', label: 'Family' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'business', label: 'Business' },
  { value: 'other', label: 'Other' },
];

export const INBOX_TYPES = [
  { value: 'idea', label: 'Idea' },
  { value: 'reminder', label: 'Reminder' },
  { value: 'thought', label: 'Thought' },
  { value: 'task', label: 'Task' },
  { value: 'business', label: 'Business Idea' },
  { value: 'learning', label: 'Learning Topic' },
  { value: 'plan', label: 'Future Plan' },
] as const;

export const FORM_INPUT = 'w-full px-3 py-2 text-sm bg-raised border border-base rounded-xl text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-accent';
export const FORM_SELECT = 'w-full px-3 py-2 text-sm bg-raised border border-base rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-accent';
export const BTN_PRIMARY = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 dark:bg-indigo-500 dark:hover:bg-indigo-400 rounded-xl transition-colors shadow-sm disabled:opacity-40';
export const BTN_SECONDARY = 'px-4 py-2 text-sm font-medium text-secondary bg-raised hover:bg-overlay border border-base rounded-xl transition-colors';
