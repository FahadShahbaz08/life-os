import { Area, ExpenseCategory, NoteCategory } from '@/types';
import { generateId } from './utils';

export const STORAGE_KEY = 'lifeos_data';
export const LEGACY_STORAGE_KEY = 'taskflow_data';

export const DEFAULT_AREAS: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { name: 'Health', slug: 'health', icon: 'heart', color: '#ef4444', sortOrder: 0, isArchived: false },
  { name: 'Finance', slug: 'finance', icon: 'wallet', color: '#22c55e', sortOrder: 1, isArchived: false },
  { name: 'Career', slug: 'career', icon: 'briefcase', color: '#6366f1', sortOrder: 2, isArchived: false },
  { name: 'Business', slug: 'business', icon: 'building', color: '#f59e0b', sortOrder: 3, isArchived: false },
  { name: 'Game Development', slug: 'game-dev', icon: 'gamepad', color: '#a855f7', sortOrder: 4, isArchived: false },
  { name: 'Trading', slug: 'trading', icon: 'trending-up', color: '#06b6d4', sortOrder: 5, isArchived: false },
  { name: 'Learning', slug: 'learning', icon: 'graduation-cap', color: '#ec4899', sortOrder: 6, isArchived: false },
  { name: 'Relationships', slug: 'relationships', icon: 'users', color: '#f97316', sortOrder: 7, isArchived: false },
  { name: 'Personal Growth', slug: 'personal-growth', icon: 'sparkles', color: '#8b5cf6', sortOrder: 8, isArchived: false },
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

export const FORM_INPUT = 'w-full px-3 py-2 text-sm bg-raised border border-base rounded-xl text-primary placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
export const FORM_SELECT = 'w-full px-3 py-2 text-sm bg-raised border border-base rounded-xl text-primary focus:outline-none focus:ring-2 focus:ring-indigo-500';
export const BTN_PRIMARY = 'inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-sm disabled:opacity-40';
export const BTN_SECONDARY = 'px-4 py-2 text-sm font-medium text-secondary bg-raised hover:bg-base border border-base rounded-xl transition-colors';
