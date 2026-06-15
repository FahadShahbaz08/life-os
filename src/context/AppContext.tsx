'use client';

import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  AppState, FilterState, Area, Project, Task, InboxItem, Goal, Habit,
  HabitCompletion, Note, Reminder, WaitingFor, FinanceReceivable, FinancePayable,
  FinanceExpense, VisionItem, WeeklyReview, FocusSession, AppSettings, Trade, FinanceIncome,
} from '@/types';
import { loadState, saveState, createActivity, createEmptyState } from '@/lib/storage';
import { generateId, nowISO } from '@/lib/utils';

type Action =
  | { type: 'HYDRATE'; payload: AppState }
  | { type: 'IMPORT'; payload: AppState }
  | { type: 'UPDATE_SETTINGS'; data: Partial<AppSettings> }
  | { type: 'ADD_AREA'; payload: Area }
  | { type: 'UPDATE_AREA'; id: string; data: Partial<Area> }
  | { type: 'DELETE_AREA'; id: string }
  | { type: 'ADD_PROJECT'; payload: Project }
  | { type: 'UPDATE_PROJECT'; id: string; data: Partial<Project> }
  | { type: 'DELETE_PROJECT'; id: string }
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; id: string; data: Partial<Task> }
  | { type: 'DELETE_TASK'; id: string }
  | { type: 'ADD_INBOX'; payload: InboxItem }
  | { type: 'UPDATE_INBOX'; id: string; data: Partial<InboxItem> }
  | { type: 'DELETE_INBOX'; id: string }
  | { type: 'ADD_GOAL'; payload: Goal }
  | { type: 'UPDATE_GOAL'; id: string; data: Partial<Goal> }
  | { type: 'DELETE_GOAL'; id: string }
  | { type: 'ADD_HABIT'; payload: Habit }
  | { type: 'UPDATE_HABIT'; id: string; data: Partial<Habit> }
  | { type: 'DELETE_HABIT'; id: string }
  | { type: 'ADD_HABIT_COMPLETION'; payload: HabitCompletion }
  | { type: 'REMOVE_HABIT_COMPLETION'; id: string }
  | { type: 'ADD_NOTE'; payload: Note }
  | { type: 'UPDATE_NOTE'; id: string; data: Partial<Note> }
  | { type: 'DELETE_NOTE'; id: string }
  | { type: 'ADD_REMINDER'; payload: Reminder }
  | { type: 'UPDATE_REMINDER'; id: string; data: Partial<Reminder> }
  | { type: 'DELETE_REMINDER'; id: string }
  | { type: 'ADD_WAITING'; payload: WaitingFor }
  | { type: 'UPDATE_WAITING'; id: string; data: Partial<WaitingFor> }
  | { type: 'DELETE_WAITING'; id: string }
  | { type: 'ADD_RECEIVABLE'; payload: FinanceReceivable }
  | { type: 'UPDATE_RECEIVABLE'; id: string; data: Partial<FinanceReceivable> }
  | { type: 'DELETE_RECEIVABLE'; id: string }
  | { type: 'ADD_PAYABLE'; payload: FinancePayable }
  | { type: 'UPDATE_PAYABLE'; id: string; data: Partial<FinancePayable> }
  | { type: 'DELETE_PAYABLE'; id: string }
  | { type: 'ADD_EXPENSE'; payload: FinanceExpense }
  | { type: 'DELETE_EXPENSE'; id: string }
  | { type: 'ADD_INCOME'; payload: import('@/types').FinanceIncome }
  | { type: 'DELETE_INCOME'; id: string }
  | { type: 'ADD_VISION'; payload: VisionItem }
  | { type: 'UPDATE_VISION'; id: string; data: Partial<VisionItem> }
  | { type: 'DELETE_VISION'; id: string }
  | { type: 'ADD_REVIEW'; payload: WeeklyReview }
  | { type: 'UPDATE_REVIEW'; id: string; data: Partial<WeeklyReview> }
  | { type: 'ADD_FOCUS_SESSION'; payload: FocusSession }
  | { type: 'ADD_TRADE'; payload: Trade }
  | { type: 'UPDATE_TRADE'; id: string; data: Partial<Trade> }
  | { type: 'DELETE_TRADE'; id: string }
  | { type: 'TOGGLE_HABIT_COMPLETION'; habitId: string; date: string };

function pushActivity(state: AppState, entry: ReturnType<typeof createActivity>): AppState {
  return { ...state, activity: [entry, ...state.activity].slice(0, 2000) };
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'HYDRATE':
    case 'IMPORT':
      return action.payload;

    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.data } };

    case 'ADD_AREA':
      return pushActivity({ ...state, areas: [...state.areas, action.payload] },
        createActivity('area_created', `Area "${action.payload.name}" created`, 'area', action.payload.id));
    case 'UPDATE_AREA':
      return { ...state, areas: state.areas.map(a => a.id === action.id ? { ...a, ...action.data, updatedAt: nowISO() } : a) };
    case 'DELETE_AREA':
      return { ...state, areas: state.areas.filter(a => a.id !== action.id) };

    case 'ADD_PROJECT':
      return pushActivity({ ...state, projects: [...state.projects, action.payload] },
        createActivity('project_created', `Project "${action.payload.name}" created`, 'project', action.payload.id));
    case 'UPDATE_PROJECT':
      return pushActivity({
        ...state,
        projects: state.projects.map(p => p.id === action.id ? { ...p, ...action.data, updatedAt: nowISO() } : p),
      }, createActivity('project_updated', `Project updated`, 'project', action.id));
    case 'DELETE_PROJECT':
      return {
        ...state,
        projects: state.projects.filter(p => p.id !== action.id),
        tasks: state.tasks.filter(t => t.projectId !== action.id),
      };

    case 'ADD_TASK':
      return pushActivity({ ...state, tasks: [...state.tasks, action.payload] },
        createActivity('task_created', `Task "${action.payload.title}" created`, 'task', action.payload.id));
    case 'UPDATE_TASK': {
      const task = state.tasks.find(t => t.id === action.id);
      const completed = action.data.status === 'completed' && task?.status !== 'completed';
      return pushActivity({
        ...state,
        tasks: state.tasks.map(t => t.id === action.id ? {
          ...t, ...action.data, updatedAt: nowISO(),
          completedAt: action.data.status === 'completed' ? nowISO() : action.data.status ? t.completedAt : t.completedAt,
        } : t),
      }, createActivity(completed ? 'task_completed' : 'task_updated', completed ? `Task "${task?.title}" completed` : `Task updated`, 'task', action.id));
    }
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) };

    case 'ADD_INBOX':
      return { ...state, inboxItems: [action.payload, ...state.inboxItems] };
    case 'UPDATE_INBOX':
      return { ...state, inboxItems: state.inboxItems.map(i => i.id === action.id ? { ...i, ...action.data } : i) };
    case 'DELETE_INBOX':
      return { ...state, inboxItems: state.inboxItems.filter(i => i.id !== action.id) };

    case 'ADD_GOAL':
      return pushActivity({ ...state, goals: [...state.goals, action.payload] },
        createActivity('goal_created', `Goal "${action.payload.title}" created`, 'goal', action.payload.id));
    case 'UPDATE_GOAL':
      return { ...state, goals: state.goals.map(g => g.id === action.id ? { ...g, ...action.data, updatedAt: nowISO() } : g) };
    case 'DELETE_GOAL':
      return { ...state, goals: state.goals.filter(g => g.id !== action.id) };

    case 'ADD_HABIT':
      return { ...state, habits: [...state.habits, action.payload] };
    case 'UPDATE_HABIT':
      return { ...state, habits: state.habits.map(h => h.id === action.id ? { ...h, ...action.data, updatedAt: nowISO() } : h) };
    case 'DELETE_HABIT':
      return {
        ...state,
        habits: state.habits.filter(h => h.id !== action.id),
        habitCompletions: state.habitCompletions.filter(c => c.habitId !== action.id),
      };
    case 'ADD_HABIT_COMPLETION':
      return { ...state, habitCompletions: [...state.habitCompletions, action.payload] };
    case 'REMOVE_HABIT_COMPLETION':
      return { ...state, habitCompletions: state.habitCompletions.filter(c => c.id !== action.id) };

    case 'ADD_NOTE':
      return pushActivity({ ...state, notes: [action.payload, ...state.notes] },
        createActivity('note_created', `Note "${action.payload.title}" created`, 'note', action.payload.id));
    case 'UPDATE_NOTE':
      return { ...state, notes: state.notes.map(n => n.id === action.id ? { ...n, ...action.data, updatedAt: nowISO() } : n) };
    case 'DELETE_NOTE':
      return { ...state, notes: state.notes.filter(n => n.id !== action.id) };

    case 'ADD_REMINDER':
      return { ...state, reminders: [...state.reminders, action.payload] };
    case 'UPDATE_REMINDER':
      return { ...state, reminders: state.reminders.map(r => r.id === action.id ? { ...r, ...action.data } : r) };
    case 'DELETE_REMINDER':
      return { ...state, reminders: state.reminders.filter(r => r.id !== action.id) };

    case 'ADD_WAITING':
      return { ...state, waitingFor: [...state.waitingFor, action.payload] };
    case 'UPDATE_WAITING':
      return { ...state, waitingFor: state.waitingFor.map(w => w.id === action.id ? { ...w, ...action.data, updatedAt: nowISO() } : w) };
    case 'DELETE_WAITING':
      return { ...state, waitingFor: state.waitingFor.filter(w => w.id !== action.id) };

    case 'ADD_RECEIVABLE':
      return { ...state, receivables: [...state.receivables, action.payload] };
    case 'UPDATE_RECEIVABLE':
      return { ...state, receivables: state.receivables.map(r => r.id === action.id ? { ...r, ...action.data, updatedAt: nowISO() } : r) };
    case 'DELETE_RECEIVABLE':
      return { ...state, receivables: state.receivables.filter(r => r.id !== action.id) };

    case 'ADD_PAYABLE':
      return { ...state, payables: [...state.payables, action.payload] };
    case 'UPDATE_PAYABLE':
      return { ...state, payables: state.payables.map(p => p.id === action.id ? { ...p, ...action.data, updatedAt: nowISO() } : p) };
    case 'DELETE_PAYABLE':
      return { ...state, payables: state.payables.filter(p => p.id !== action.id) };

    case 'ADD_EXPENSE':
      return { ...state, expenses: [action.payload, ...state.expenses] };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.id) };

    case 'ADD_INCOME':
      return { ...state, incomes: [action.payload, ...state.incomes] };
    case 'DELETE_INCOME':
      return { ...state, incomes: state.incomes.filter(i => i.id !== action.id) };

    case 'ADD_VISION':
      return { ...state, visionItems: [...state.visionItems, action.payload] };
    case 'UPDATE_VISION':
      return { ...state, visionItems: state.visionItems.map(v => v.id === action.id ? { ...v, ...action.data, updatedAt: nowISO() } : v) };
    case 'DELETE_VISION':
      return { ...state, visionItems: state.visionItems.filter(v => v.id !== action.id) };

    case 'ADD_REVIEW':
      return { ...state, weeklyReviews: [action.payload, ...state.weeklyReviews] };
    case 'UPDATE_REVIEW':
      return { ...state, weeklyReviews: state.weeklyReviews.map(r => r.id === action.id ? { ...r, ...action.data } : r) };

    case 'ADD_FOCUS_SESSION':
      return { ...state, focusSessions: [action.payload, ...state.focusSessions] };

    case 'ADD_TRADE':
      return { ...state, trades: [action.payload, ...state.trades] };
    case 'UPDATE_TRADE':
      return { ...state, trades: state.trades.map(t => t.id === action.id ? { ...t, ...action.data, updatedAt: nowISO() } : t) };
    case 'DELETE_TRADE':
      return { ...state, trades: state.trades.filter(t => t.id !== action.id) };

    case 'TOGGLE_HABIT_COMPLETION': {
      const habit = state.habits.find(h => h.id === action.habitId);
      const existing = state.habitCompletions.find(
        c => c.habitId === action.habitId && c.completedAt.startsWith(action.date)
      );
      if (existing) {
        return { ...state, habitCompletions: state.habitCompletions.filter(c => c.id !== existing.id) };
      }
      const completedAt = action.date.includes('T') ? action.date : new Date().toISOString();
      return pushActivity({
        ...state,
        habitCompletions: [...state.habitCompletions, {
          id: generateId(), habitId: action.habitId, completedAt, value: 1, notes: '',
        }],
      }, createActivity('habit_completed', `Habit "${habit?.name ?? 'Habit'}" logged`, 'habit', action.habitId));
    }

    default:
      return state;
  }
}

const DEFAULT_FILTERS: FilterState = {
  search: '', status: 'all', priority: 'all', dueDateFilter: 'all',
  sortBy: 'deadline', sortOrder: 'asc', areaId: null,
};

export interface AppContextValue {
  state: AppState;
  filters: FilterState;
  hydrated: boolean;
  setFilters: (f: Partial<FilterState>) => void;
  resetFilters: () => void;
  importState: (s: AppState) => void;
  updateSettings: (data: Partial<AppSettings>) => void;
  addArea: (data: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateArea: (id: string, data: Partial<Area>) => void;
  deleteArea: (id: string) => void;
  addProject: (data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, data: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  addInboxItem: (data: Omit<InboxItem, 'id' | 'createdAt' | 'processed' | 'convertedToType' | 'convertedToId'>) => void;
  updateInboxItem: (id: string, data: Partial<InboxItem>) => void;
  deleteInboxItem: (id: string) => void;
  processInboxToTask: (inboxId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => void;
  processInboxToNote: (inboxId: string, noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addGoal: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateGoal: (id: string, data: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addHabit: (data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateHabit: (id: string, data: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitCompletion: (habitId: string, date?: string) => void;
  addNote: (data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, data: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  addReminder: (data: Omit<Reminder, 'id' | 'createdAt' | 'status'>) => void;
  updateReminder: (id: string, data: Partial<Reminder>) => void;
  deleteReminder: (id: string) => void;
  addWaitingFor: (data: Omit<WaitingFor, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => void;
  updateWaitingFor: (id: string, data: Partial<WaitingFor>) => void;
  deleteWaitingFor: (id: string) => void;
  addReceivable: (data: Omit<FinanceReceivable, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateReceivable: (id: string, data: Partial<FinanceReceivable>) => void;
  deleteReceivable: (id: string) => void;
  addPayable: (data: Omit<FinancePayable, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updatePayable: (id: string, data: Partial<FinancePayable>) => void;
  deletePayable: (id: string) => void;
  addExpense: (data: Omit<FinanceExpense, 'id' | 'createdAt'>) => void;
  deleteExpense: (id: string) => void;
  addIncome: (data: Omit<FinanceIncome, 'id' | 'createdAt'>) => void;
  deleteIncome: (id: string) => void;
  addVisionItem: (data: Omit<VisionItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateVisionItem: (id: string, data: Partial<VisionItem>) => void;
  deleteVisionItem: (id: string) => void;
  addWeeklyReview: (data: Omit<WeeklyReview, 'id' | 'createdAt'>) => void;
  updateWeeklyReview: (id: string, data: Partial<WeeklyReview>) => void;
  addFocusSession: (data: Omit<FocusSession, 'id'>) => void;
  addTrade: (data: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTrade: (id: string, data: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  setTopPriorities: (taskIds: string[]) => void;
  toggleTopPriority: (taskId: string) => void;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error';
}

const AppContext = createContext<AppContextValue | null>(null);

function makeEntity<T extends { id: string; createdAt: string; updatedAt: string }>(
  data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>
): T {
  const now = nowISO();
  return { ...data, id: generateId(), createdAt: now, updatedAt: now } as T;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [state, dispatch] = useReducer(reducer, createEmptyState());
  const [filters, setFiltersState] = React.useState<FilterState>(DEFAULT_FILTERS);
  const [hydrated, setHydrated] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const skipNextSave = useRef(true);

  // Load data from cloud when authenticated
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      setHydrated(true);
      return;
    }

    let cancelled = false;
    fetch('/api/sync')
      .then(res => {
        if (!res.ok) throw new Error('Failed to load');
        return res.json() as Promise<AppState>;
      })
      .then(data => {
        if (!cancelled) {
          dispatch({ type: 'HYDRATE', payload: data });
          skipNextSave.current = true;
        }
      })
      .catch(() => {
        if (!cancelled) dispatch({ type: 'HYDRATE', payload: loadState() });
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => { cancelled = true; };
  }, [status]);

  // Auto-save to cloud (debounced)
  useEffect(() => {
    if (!hydrated || status !== 'authenticated') return;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    setSyncStatus('saving');
    const timer = setTimeout(() => {
      fetch('/api/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
      })
        .then(res => {
          if (!res.ok) throw new Error('save failed');
          setSyncStatus('saved');
        })
        .catch(() => setSyncStatus('error'));
    }, 900);

    return () => clearTimeout(timer);
  }, [state, hydrated, status]);

  const setFilters = useCallback((f: Partial<FilterState>) => setFiltersState(prev => ({ ...prev, ...f })), []);
  const resetFilters = useCallback(() => setFiltersState(DEFAULT_FILTERS), []);
  const importState = useCallback((s: AppState) => dispatch({ type: 'IMPORT', payload: s }), []);
  const updateSettings = useCallback((data: Partial<AppSettings>) => dispatch({ type: 'UPDATE_SETTINGS', data }), []);

  const addArea = useCallback((data: Omit<Area, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_AREA', payload: makeEntity<Area>(data) });
  }, []);
  const updateArea = useCallback((id: string, data: Partial<Area>) => dispatch({ type: 'UPDATE_AREA', id, data }), []);
  const deleteArea = useCallback((id: string) => dispatch({ type: 'DELETE_AREA', id }), []);

  const addProject = useCallback((data: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_PROJECT', payload: makeEntity<Project>(data) });
  }, []);
  const updateProject = useCallback((id: string, data: Partial<Project>) => dispatch({ type: 'UPDATE_PROJECT', id, data }), []);
  const deleteProject = useCallback((id: string) => dispatch({ type: 'DELETE_PROJECT', id }), []);

  const addTask = useCallback((data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => {
    const now = nowISO();
    dispatch({ type: 'ADD_TASK', payload: { ...data, id: generateId(), createdAt: now, updatedAt: now, completedAt: null } });
  }, []);
  const updateTask = useCallback((id: string, data: Partial<Task>) => dispatch({ type: 'UPDATE_TASK', id, data }), []);
  const deleteTask = useCallback((id: string) => dispatch({ type: 'DELETE_TASK', id }), []);

  const addInboxItem = useCallback((data: Omit<InboxItem, 'id' | 'createdAt' | 'processed' | 'convertedToType' | 'convertedToId'>) => {
    dispatch({ type: 'ADD_INBOX', payload: { ...data, id: generateId(), processed: false, convertedToType: null, convertedToId: null, createdAt: nowISO() } });
  }, []);
  const updateInboxItem = useCallback((id: string, data: Partial<InboxItem>) => dispatch({ type: 'UPDATE_INBOX', id, data }), []);
  const deleteInboxItem = useCallback((id: string) => dispatch({ type: 'DELETE_INBOX', id }), []);

  const processInboxToTask = useCallback((inboxId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => {
    const now = nowISO();
    const task: Task = { ...taskData, id: generateId(), createdAt: now, updatedAt: now, completedAt: null };
    dispatch({ type: 'ADD_TASK', payload: task });
    dispatch({ type: 'UPDATE_INBOX', id: inboxId, data: { processed: true, convertedToType: 'task', convertedToId: task.id } });
  }, []);

  const processInboxToNote = useCallback((inboxId: string, noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    const note = makeEntity<Note>(noteData);
    dispatch({ type: 'ADD_NOTE', payload: note });
    dispatch({ type: 'UPDATE_INBOX', id: inboxId, data: { processed: true, convertedToType: 'note', convertedToId: note.id } });
  }, []);

  const addGoal = useCallback((data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_GOAL', payload: makeEntity<Goal>(data) });
  }, []);
  const updateGoal = useCallback((id: string, data: Partial<Goal>) => dispatch({ type: 'UPDATE_GOAL', id, data }), []);
  const deleteGoal = useCallback((id: string) => dispatch({ type: 'DELETE_GOAL', id }), []);

  const addHabit = useCallback((data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_HABIT', payload: makeEntity<Habit>(data) });
  }, []);
  const updateHabit = useCallback((id: string, data: Partial<Habit>) => dispatch({ type: 'UPDATE_HABIT', id, data }), []);
  const deleteHabit = useCallback((id: string) => dispatch({ type: 'DELETE_HABIT', id }), []);

  const toggleHabitCompletion = useCallback((habitId: string, date?: string) => {
    dispatch({ type: 'TOGGLE_HABIT_COMPLETION', habitId, date: date ?? todayISO() });
  }, []);

  const addNote = useCallback((data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_NOTE', payload: makeEntity<Note>(data) });
  }, []);
  const updateNote = useCallback((id: string, data: Partial<Note>) => dispatch({ type: 'UPDATE_NOTE', id, data }), []);
  const deleteNote = useCallback((id: string) => dispatch({ type: 'DELETE_NOTE', id }), []);

  const addReminder = useCallback((data: Omit<Reminder, 'id' | 'createdAt' | 'status'>) => {
    dispatch({ type: 'ADD_REMINDER', payload: { ...data, id: generateId(), status: 'pending', createdAt: nowISO() } });
  }, []);
  const updateReminder = useCallback((id: string, data: Partial<Reminder>) => dispatch({ type: 'UPDATE_REMINDER', id, data }), []);
  const deleteReminder = useCallback((id: string) => dispatch({ type: 'DELETE_REMINDER', id }), []);

  const addWaitingFor = useCallback((data: Omit<WaitingFor, 'id' | 'createdAt' | 'updatedAt' | 'completedAt'>) => {
    const now = nowISO();
    dispatch({ type: 'ADD_WAITING', payload: { ...data, id: generateId(), createdAt: now, updatedAt: now, completedAt: null } });
  }, []);
  const updateWaitingFor = useCallback((id: string, data: Partial<WaitingFor>) => dispatch({ type: 'UPDATE_WAITING', id, data }), []);
  const deleteWaitingFor = useCallback((id: string) => dispatch({ type: 'DELETE_WAITING', id }), []);

  const addReceivable = useCallback((data: Omit<FinanceReceivable, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_RECEIVABLE', payload: makeEntity<FinanceReceivable>(data) });
  }, []);
  const updateReceivable = useCallback((id: string, data: Partial<FinanceReceivable>) => dispatch({ type: 'UPDATE_RECEIVABLE', id, data }), []);
  const deleteReceivable = useCallback((id: string) => dispatch({ type: 'DELETE_RECEIVABLE', id }), []);

  const addPayable = useCallback((data: Omit<FinancePayable, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_PAYABLE', payload: makeEntity<FinancePayable>(data) });
  }, []);
  const updatePayable = useCallback((id: string, data: Partial<FinancePayable>) => dispatch({ type: 'UPDATE_PAYABLE', id, data }), []);
  const deletePayable = useCallback((id: string) => dispatch({ type: 'DELETE_PAYABLE', id }), []);

  const addExpense = useCallback((data: Omit<FinanceExpense, 'id' | 'createdAt'>) => {
    dispatch({ type: 'ADD_EXPENSE', payload: { ...data, id: generateId(), createdAt: nowISO() } });
  }, []);
  const deleteExpense = useCallback((id: string) => dispatch({ type: 'DELETE_EXPENSE', id }), []);
  const addIncome = useCallback((data: Omit<FinanceIncome, 'id' | 'createdAt'>) => {
    dispatch({ type: 'ADD_INCOME', payload: { ...data, id: generateId(), createdAt: nowISO() } });
  }, []);
  const deleteIncome = useCallback((id: string) => dispatch({ type: 'DELETE_INCOME', id }), []);

  const addVisionItem = useCallback((data: Omit<VisionItem, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_VISION', payload: makeEntity<VisionItem>(data) });
  }, []);
  const updateVisionItem = useCallback((id: string, data: Partial<VisionItem>) => dispatch({ type: 'UPDATE_VISION', id, data }), []);
  const deleteVisionItem = useCallback((id: string) => dispatch({ type: 'DELETE_VISION', id }), []);

  const addWeeklyReview = useCallback((data: Omit<WeeklyReview, 'id' | 'createdAt'>) => {
    dispatch({ type: 'ADD_REVIEW', payload: { ...data, id: generateId(), createdAt: nowISO() } });
  }, []);
  const updateWeeklyReview = useCallback((id: string, data: Partial<WeeklyReview>) => dispatch({ type: 'UPDATE_REVIEW', id, data }), []);

  const addFocusSession = useCallback((data: Omit<FocusSession, 'id'>) => {
    dispatch({ type: 'ADD_FOCUS_SESSION', payload: { ...data, id: generateId() } });
  }, []);

  const addTrade = useCallback((data: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = nowISO();
    dispatch({ type: 'ADD_TRADE', payload: { ...data, id: generateId(), createdAt: now, updatedAt: now } });
  }, []);
  const updateTrade = useCallback((id: string, data: Partial<Trade>) => dispatch({ type: 'UPDATE_TRADE', id, data }), []);
  const deleteTrade = useCallback((id: string) => dispatch({ type: 'DELETE_TRADE', id }), []);

  const setTopPriorities = useCallback((taskIds: string[]) => {
    dispatch({ type: 'UPDATE_SETTINGS', data: { topPriorityTaskIds: taskIds.slice(0, 3) } });
  }, []);

  const toggleTopPriority = useCallback((taskId: string) => {
    const current = state.settings.topPriorityTaskIds;
    const next = current.includes(taskId)
      ? current.filter(id => id !== taskId)
      : [...current, taskId].slice(0, 3);
    dispatch({ type: 'UPDATE_SETTINGS', data: { topPriorityTaskIds: next } });
    updateTask(taskId, { isTopPriority: !current.includes(taskId) });
  }, [state.settings.topPriorityTaskIds, updateTask]);

  return (
    <AppContext.Provider value={{
      state, filters, hydrated, syncStatus, setFilters, resetFilters, importState, updateSettings,
      addArea, updateArea, deleteArea,
      addProject, updateProject, deleteProject,
      addTask, updateTask, deleteTask,
      addInboxItem, updateInboxItem, deleteInboxItem, processInboxToTask, processInboxToNote,
      addGoal, updateGoal, deleteGoal,
      addHabit, updateHabit, deleteHabit, toggleHabitCompletion,
      addNote, updateNote, deleteNote,
      addReminder, updateReminder, deleteReminder,
      addWaitingFor, updateWaitingFor, deleteWaitingFor,
      addReceivable, updateReceivable, deleteReceivable,
      addPayable, updatePayable, deletePayable,
      addExpense, deleteExpense, addIncome, deleteIncome,
      addVisionItem, updateVisionItem, deleteVisionItem,
      addWeeklyReview, updateWeeklyReview,
      addFocusSession, addTrade, updateTrade, deleteTrade,
      setTopPriorities, toggleTopPriority,
    }}>
      {children}
    </AppContext.Provider>
  );
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
