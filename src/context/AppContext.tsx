'use client';

import React, { createContext, useContext, useEffect, useReducer, useCallback, useRef } from 'react';
import { useSession } from 'next-auth/react';
import {
  AppState, FilterState, Area, Project, Task, InboxItem, Goal, Habit,
  HabitCompletion, Note, Reminder, WaitingFor, FinanceReceivable, FinancePayable,
  FinanceExpense, VisionItem, WeeklyReview, FocusSession, AppSettings, Trade, FinanceIncome,
  AppNotification, FinanceAccount, AccountTransfer, TradingExchange, ExchangeFunding,
  ReflectionField, ReflectionEntry, ReflectionFieldValue,
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
  | { type: 'REORDER_TASKS'; orderedIds: string[] }
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
  | {
      type: 'RECORD_PAYABLE_PAYMENT';
      id: string;
      amount: number;
      accountId: string;
      date: string;
      note: string;
    }
  | {
      type: 'RECORD_RECEIVABLE_PAYMENT';
      id: string;
      amount: number;
      accountId: string;
      date: string;
      note: string;
    }
  | { type: 'ADD_EXPENSE'; payload: FinanceExpense }
  | { type: 'UPDATE_EXPENSE'; id: string; data: Partial<FinanceExpense> }
  | { type: 'DELETE_EXPENSE'; id: string }
  | { type: 'ADD_INCOME'; payload: FinanceIncome }
  | { type: 'UPDATE_INCOME'; id: string; data: Partial<FinanceIncome> }
  | { type: 'DELETE_INCOME'; id: string }
  | { type: 'ADD_VISION'; payload: VisionItem }
  | { type: 'UPDATE_VISION'; id: string; data: Partial<VisionItem> }
  | { type: 'DELETE_VISION'; id: string }
  | { type: 'ADD_REVIEW'; payload: WeeklyReview }
  | { type: 'UPDATE_REVIEW'; id: string; data: Partial<WeeklyReview> }
  | { type: 'ADD_FOCUS_SESSION'; payload: FocusSession }
  | { type: 'ADD_TRADE'; payload: Trade }
  | { type: 'UPDATE_TRADE'; id: string; data: Partial<Trade>; exchangeCredit?: number }
  | { type: 'DELETE_TRADE'; id: string }
  | { type: 'ADD_ACCOUNT'; payload: FinanceAccount }
  | { type: 'UPDATE_ACCOUNT'; id: string; data: Partial<FinanceAccount> }
  | { type: 'DELETE_ACCOUNT'; id: string }
  | { type: 'ACCOUNT_MOVEMENT'; payload: {
      kind: AccountTransfer['kind'];
      fromAccountId: string | null;
      toAccountId: string | null;
      amount: number;
      currency: string;
      note: string;
      date: string;
    } }
  | { type: 'ADD_EXCHANGE'; payload: TradingExchange }
  | { type: 'UPDATE_EXCHANGE'; id: string; data: Partial<TradingExchange> }
  | { type: 'DELETE_EXCHANGE'; id: string }
  | { type: 'ADD_EXCHANGE_FUNDS'; payload: { exchangeId: string; amount: number; source: string; note: string; date: string } }
  | { type: 'TOGGLE_HABIT_COMPLETION'; habitId: string; date: string }
  | { type: 'ADD_REFLECTION_FIELD'; payload: ReflectionField }
  | { type: 'UPDATE_REFLECTION_FIELD'; id: string; data: Partial<ReflectionField> }
  | { type: 'DELETE_REFLECTION_FIELD'; id: string }
  | { type: 'REORDER_REFLECTION_FIELDS'; orderedIds: string[] }
  | { type: 'SET_REFLECTION_VALUE'; date: string; fieldId: string; value: ReflectionFieldValue }
  | { type: 'SET_REFLECTION_NOTE'; date: string; note: string }
  | { type: 'ADD_NOTIFICATION'; payload: AppNotification }
  | { type: 'MARK_NOTIFICATION_READ'; id: string }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'DISMISS_NOTIFICATION'; id: string };

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
          completedAt: action.data.status === 'completed'
            ? nowISO()
            : (action.data.status !== undefined ? null : t.completedAt),
        } : t),
      }, createActivity(completed ? 'task_completed' : 'task_updated', completed ? `Task "${task?.title}" completed` : `Task updated`, 'task', action.id));
    }
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter(t => t.id !== action.id) };
    case 'REORDER_TASKS': {
      const orderMap = new Map(action.orderedIds.map((id, i) => [id, i]));
      return {
        ...state,
        tasks: state.tasks.map(t => {
          const idx = orderMap.get(t.id);
          if (idx === undefined) return t;
          return { ...t, sortOrder: idx, updatedAt: nowISO() };
        }),
      };
    }

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
      return {
        ...state,
        receivables: [...state.receivables, {
          ...action.payload,
          amountCollected: action.payload.amountCollected ?? 0,
          settlements: action.payload.settlements ?? [],
        }],
      };
    case 'UPDATE_RECEIVABLE':
      return { ...state, receivables: state.receivables.map(r => r.id === action.id ? { ...r, ...action.data, updatedAt: nowISO() } : r) };
    case 'DELETE_RECEIVABLE': {
      // Reverse all collections into accounts
      const old = state.receivables.find(r => r.id === action.id);
      let accounts = state.accounts ?? [];
      if (old?.settlements?.length) {
        const now = nowISO();
        for (const s of old.settlements) {
          if (!s.accountId || !(s.amount > 0)) continue;
          accounts = accounts.map(a =>
            a.id === s.accountId ? { ...a, balance: a.balance - s.amount, updatedAt: now } : a,
          );
        }
      }
      return {
        ...state,
        accounts,
        receivables: state.receivables.filter(r => r.id !== action.id),
      };
    }

    case 'ADD_PAYABLE':
      return {
        ...state,
        payables: [...state.payables, {
          ...action.payload,
          amountPaid: action.payload.amountPaid ?? 0,
          settlements: action.payload.settlements ?? [],
        }],
      };
    case 'UPDATE_PAYABLE':
      return { ...state, payables: state.payables.map(p => p.id === action.id ? { ...p, ...action.data, updatedAt: nowISO() } : p) };
    case 'DELETE_PAYABLE': {
      // Reverse all payments (refund accounts)
      const old = state.payables.find(p => p.id === action.id);
      let accounts = state.accounts ?? [];
      if (old?.settlements?.length) {
        const now = nowISO();
        for (const s of old.settlements) {
          if (!s.accountId || !(s.amount > 0)) continue;
          accounts = accounts.map(a =>
            a.id === s.accountId ? { ...a, balance: a.balance + s.amount, updatedAt: now } : a,
          );
        }
      }
      return {
        ...state,
        accounts,
        payables: state.payables.filter(p => p.id !== action.id),
      };
    }

    case 'RECORD_PAYABLE_PAYMENT': {
      const p = state.payables.find(x => x.id === action.id);
      if (!p || !(action.amount > 0) || !action.accountId) return state;
      const now = nowISO();
      const settlement = {
        id: generateId(),
        amount: action.amount,
        accountId: action.accountId,
        date: action.date || now.slice(0, 10),
        note: action.note || '',
        createdAt: now,
      };
      const amountPaid = (p.amountPaid ?? 0) + action.amount;
      const status: FinancePayable['status'] =
        amountPaid >= p.amount - 0.005 ? 'paid' : amountPaid > 0 ? 'partial' : 'pending';
      const accounts = (state.accounts ?? []).map(a =>
        a.id === action.accountId
          ? { ...a, balance: a.balance - action.amount, updatedAt: now }
          : a,
      );
      const accountTransfers = [{
        id: generateId(),
        kind: 'withdraw' as const,
        fromAccountId: action.accountId,
        toAccountId: null,
        amount: action.amount,
        currency: p.currency,
        note: action.note || `Payable: ${p.person}`,
        date: settlement.date,
        createdAt: now,
      }, ...(state.accountTransfers ?? [])];
      return {
        ...state,
        accounts,
        accountTransfers,
        payables: state.payables.map(x =>
          x.id === action.id
            ? {
                ...x,
                amountPaid,
                status,
                settlements: [...(x.settlements ?? []), settlement],
                updatedAt: now,
              }
            : x,
        ),
      };
    }

    case 'RECORD_RECEIVABLE_PAYMENT': {
      const r = state.receivables.find(x => x.id === action.id);
      if (!r || !(action.amount > 0) || !action.accountId) return state;
      const now = nowISO();
      const settlement = {
        id: generateId(),
        amount: action.amount,
        accountId: action.accountId,
        date: action.date || now.slice(0, 10),
        note: action.note || '',
        createdAt: now,
      };
      const amountCollected = (r.amountCollected ?? 0) + action.amount;
      const status: FinanceReceivable['status'] =
        amountCollected >= r.amount - 0.005 ? 'collected' : amountCollected > 0 ? 'partial' : 'pending';
      const accounts = (state.accounts ?? []).map(a =>
        a.id === action.accountId
          ? { ...a, balance: a.balance + action.amount, updatedAt: now }
          : a,
      );
      const accountTransfers = [{
        id: generateId(),
        kind: 'deposit' as const,
        fromAccountId: null,
        toAccountId: action.accountId,
        amount: action.amount,
        currency: r.currency,
        note: action.note || `Receivable: ${r.person}`,
        date: settlement.date,
        createdAt: now,
      }, ...(state.accountTransfers ?? [])];
      return {
        ...state,
        accounts,
        accountTransfers,
        receivables: state.receivables.map(x =>
          x.id === action.id
            ? {
                ...x,
                amountCollected,
                status,
                settlements: [...(x.settlements ?? []), settlement],
                updatedAt: now,
              }
            : x,
        ),
      };
    }

    case 'ADD_EXPENSE': {
      const e = action.payload;
      let accounts = state.accounts ?? [];
      let accountTransfers = state.accountTransfers ?? [];
      if (e.accountId && e.amount > 0) {
        const now = nowISO();
        accounts = accounts.map(a =>
          a.id === e.accountId ? { ...a, balance: a.balance - e.amount, updatedAt: now } : a,
        );
        accountTransfers = [{
          id: generateId(),
          kind: 'withdraw' as const,
          fromAccountId: e.accountId,
          toAccountId: null,
          amount: e.amount,
          currency: e.currency,
          note: e.description || e.category || 'Expense',
          date: e.date,
          createdAt: now,
        }, ...accountTransfers];
      }
      return { ...state, expenses: [e, ...state.expenses], accounts, accountTransfers };
    }
    case 'UPDATE_EXPENSE': {
      const old = state.expenses.find(x => x.id === action.id);
      if (!old) return state;
      const next = { ...old, ...action.data };
      let accounts = state.accounts ?? [];
      const now = nowISO();
      // reverse previous paid-from
      if (old.accountId && old.amount > 0) {
        accounts = accounts.map(a =>
          a.id === old.accountId ? { ...a, balance: a.balance + old.amount, updatedAt: now } : a,
        );
      }
      // apply new paid-from
      if (next.accountId && next.amount > 0) {
        accounts = accounts.map(a =>
          a.id === next.accountId ? { ...a, balance: a.balance - next.amount, updatedAt: now } : a,
        );
      }
      return {
        ...state,
        accounts,
        expenses: state.expenses.map(e => e.id === action.id ? next : e),
      };
    }
    case 'DELETE_EXPENSE': {
      const old = state.expenses.find(x => x.id === action.id);
      let accounts = state.accounts ?? [];
      if (old?.accountId && old.amount > 0) {
        const now = nowISO();
        accounts = accounts.map(a =>
          a.id === old.accountId ? { ...a, balance: a.balance + old.amount, updatedAt: now } : a,
        );
      }
      return {
        ...state,
        accounts,
        expenses: state.expenses.filter(e => e.id !== action.id),
      };
    }

    case 'ADD_INCOME': {
      const inc = action.payload;
      let accounts = state.accounts ?? [];
      let accountTransfers = state.accountTransfers ?? [];
      if (inc.accountId && inc.amount > 0) {
        const now = nowISO();
        accounts = accounts.map(a =>
          a.id === inc.accountId ? { ...a, balance: a.balance + inc.amount, updatedAt: now } : a,
        );
        accountTransfers = [{
          id: generateId(),
          kind: 'deposit' as const,
          fromAccountId: null,
          toAccountId: inc.accountId,
          amount: inc.amount,
          currency: inc.currency,
          note: inc.description || inc.source || 'Income',
          date: inc.date,
          createdAt: now,
        }, ...accountTransfers];
      }
      return { ...state, incomes: [inc, ...state.incomes], accounts, accountTransfers };
    }
    case 'UPDATE_INCOME': {
      const old = state.incomes.find(x => x.id === action.id);
      if (!old) return state;
      const next = { ...old, ...action.data };
      let accounts = state.accounts ?? [];
      const now = nowISO();
      if (old.accountId && old.amount > 0) {
        accounts = accounts.map(a =>
          a.id === old.accountId ? { ...a, balance: a.balance - old.amount, updatedAt: now } : a,
        );
      }
      if (next.accountId && next.amount > 0) {
        accounts = accounts.map(a =>
          a.id === next.accountId ? { ...a, balance: a.balance + next.amount, updatedAt: now } : a,
        );
      }
      return {
        ...state,
        accounts,
        incomes: state.incomes.map(i => i.id === action.id ? next : i),
      };
    }
    case 'DELETE_INCOME': {
      const old = state.incomes.find(x => x.id === action.id);
      let accounts = state.accounts ?? [];
      if (old?.accountId && old.amount > 0) {
        const now = nowISO();
        accounts = accounts.map(a =>
          a.id === old.accountId ? { ...a, balance: a.balance - old.amount, updatedAt: now } : a,
        );
      }
      return {
        ...state,
        accounts,
        incomes: state.incomes.filter(i => i.id !== action.id),
      };
    }

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

    case 'ADD_TRADE': {
      let exchanges = state.exchanges ?? [];
      const t = action.payload;
      const debit = t.exchangeDebitAmount ?? t.investedAmount;
      if (t.exchangeId && debit > 0) {
        exchanges = exchanges.map(e =>
          e.id === t.exchangeId
            ? { ...e, balance: e.balance - debit, updatedAt: nowISO() }
            : e,
        );
      }
      return { ...state, trades: [t, ...state.trades], exchanges };
    }
    case 'UPDATE_TRADE': {
      const prev = state.trades.find(x => x.id === action.id);
      const trades = state.trades.map(t => t.id === action.id ? { ...t, ...action.data, updatedAt: nowISO() } : t);
      let exchanges = state.exchanges ?? [];
      if (prev && prev.status === 'open' && action.data.status === 'closed' && prev.exchangeId) {
        const pnl = typeof action.data.profitLoss === 'number' ? action.data.profitLoss : (prev.profitLoss ?? 0);
        const credit =
          typeof action.exchangeCredit === 'number'
            ? action.exchangeCredit
            : (prev.exchangeDebitAmount ?? prev.investedAmount) + pnl;
        exchanges = exchanges.map(e =>
          e.id === prev.exchangeId
            ? { ...e, balance: e.balance + credit, updatedAt: nowISO() }
            : e,
        );
      }
      return { ...state, trades, exchanges };
    }
    case 'DELETE_TRADE': {
      const t = state.trades.find(x => x.id === action.id);
      let exchanges = state.exchanges ?? [];
      if (t?.status === 'open' && t.exchangeId) {
        const refund = t.exchangeDebitAmount ?? t.investedAmount;
        exchanges = exchanges.map(e =>
          e.id === t.exchangeId
            ? { ...e, balance: e.balance + refund, updatedAt: nowISO() }
            : e,
        );
      }
      return { ...state, trades: state.trades.filter(x => x.id !== action.id), exchanges };
    }

    case 'ADD_ACCOUNT':
      return { ...state, accounts: [...(state.accounts ?? []), action.payload] };
    case 'UPDATE_ACCOUNT':
      return {
        ...state,
        accounts: (state.accounts ?? []).map(a =>
          a.id === action.id ? { ...a, ...action.data, updatedAt: nowISO() } : a,
        ),
      };
    case 'DELETE_ACCOUNT':
      return {
        ...state,
        accounts: (state.accounts ?? []).filter(a => a.id !== action.id),
        accountTransfers: (state.accountTransfers ?? []).filter(
          t => t.fromAccountId !== action.id && t.toAccountId !== action.id,
        ),
      };
    case 'ACCOUNT_MOVEMENT': {
      const { kind, fromAccountId, toAccountId, amount, currency, note, date } = action.payload;
      if (!(amount > 0)) return state;
      const accounts = [...(state.accounts ?? [])];
      const now = nowISO();

      if (kind === 'transfer') {
        if (!fromAccountId || !toAccountId || fromAccountId === toAccountId) return state;
        const from = accounts.find(a => a.id === fromAccountId);
        const to = accounts.find(a => a.id === toAccountId);
        if (!from || !to || from.balance < amount) return state;
        const next = accounts.map(a => {
          if (a.id === fromAccountId) return { ...a, balance: a.balance - amount, updatedAt: now };
          if (a.id === toAccountId) return { ...a, balance: a.balance + amount, updatedAt: now };
          return a;
        });
        const row: AccountTransfer = {
          id: generateId(), kind, fromAccountId, toAccountId, amount, currency, note, date, createdAt: now,
        };
        return { ...state, accounts: next, accountTransfers: [row, ...(state.accountTransfers ?? [])] };
      }

      if (kind === 'deposit') {
        if (!toAccountId) return state;
        if (!accounts.some(a => a.id === toAccountId)) return state;
        const next = accounts.map(a =>
          a.id === toAccountId ? { ...a, balance: a.balance + amount, updatedAt: now } : a,
        );
        const row: AccountTransfer = {
          id: generateId(), kind, fromAccountId: null, toAccountId, amount, currency, note, date, createdAt: now,
        };
        return { ...state, accounts: next, accountTransfers: [row, ...(state.accountTransfers ?? [])] };
      }

      if (kind === 'withdraw') {
        if (!fromAccountId) return state;
        const from = accounts.find(a => a.id === fromAccountId);
        if (!from || from.balance < amount) return state;
        const next = accounts.map(a =>
          a.id === fromAccountId ? { ...a, balance: a.balance - amount, updatedAt: now } : a,
        );
        const row: AccountTransfer = {
          id: generateId(), kind, fromAccountId, toAccountId: null, amount, currency, note, date, createdAt: now,
        };
        return { ...state, accounts: next, accountTransfers: [row, ...(state.accountTransfers ?? [])] };
      }
      return state;
    }

    case 'ADD_EXCHANGE':
      return { ...state, exchanges: [...(state.exchanges ?? []), action.payload] };
    case 'UPDATE_EXCHANGE':
      return {
        ...state,
        exchanges: (state.exchanges ?? []).map(e =>
          e.id === action.id ? { ...e, ...action.data, updatedAt: nowISO() } : e,
        ),
      };
    case 'DELETE_EXCHANGE':
      return {
        ...state,
        exchanges: (state.exchanges ?? []).filter(e => e.id !== action.id),
        exchangeFundings: (state.exchangeFundings ?? []).filter(f => f.exchangeId !== action.id),
        trades: state.trades.map(t => t.exchangeId === action.id ? { ...t, exchangeId: null } : t),
      };
    case 'ADD_EXCHANGE_FUNDS': {
      const { exchangeId, amount, source, note, date } = action.payload;
      if (!(amount > 0)) return state;
      if (!(state.exchanges ?? []).some(e => e.id === exchangeId)) return state;
      const now = nowISO();
      const funding: ExchangeFunding = {
        id: generateId(), exchangeId, amount, source, note, date, createdAt: now,
      };
      return {
        ...state,
        exchanges: (state.exchanges ?? []).map(e =>
          e.id === exchangeId ? { ...e, balance: e.balance + amount, updatedAt: now } : e,
        ),
        exchangeFundings: [funding, ...(state.exchangeFundings ?? [])],
      };
    }

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

    case 'ADD_REFLECTION_FIELD':
      return {
        ...state,
        reflectionFields: [...(state.reflectionFields ?? []), action.payload],
      };
    case 'UPDATE_REFLECTION_FIELD':
      return {
        ...state,
        reflectionFields: (state.reflectionFields ?? []).map(f =>
          f.id === action.id ? { ...f, ...action.data, updatedAt: nowISO() } : f,
        ),
      };
    case 'DELETE_REFLECTION_FIELD': {
      const fields = (state.reflectionFields ?? []).filter(f => f.id !== action.id);
      const entries = (state.reflectionEntries ?? []).map(e => {
        if (!(action.id in (e.values ?? {}))) return e;
        const { [action.id]: _, ...values } = e.values;
        return { ...e, values, updatedAt: nowISO() };
      });
      return { ...state, reflectionFields: fields, reflectionEntries: entries };
    }
    case 'REORDER_REFLECTION_FIELDS': {
      const order = new Map(action.orderedIds.map((id, i) => [id, i]));
      return {
        ...state,
        reflectionFields: [...(state.reflectionFields ?? [])]
          .map(f => ({ ...f, sortOrder: order.has(f.id) ? (order.get(f.id) as number) : f.sortOrder, updatedAt: nowISO() }))
          .sort((a, b) => a.sortOrder - b.sortOrder),
      };
    }
    case 'SET_REFLECTION_VALUE': {
      const now = nowISO();
      const entries = state.reflectionEntries ?? [];
      const existing = entries.find(e => e.date === action.date);
      if (existing) {
        return {
          ...state,
          reflectionEntries: entries.map(e =>
            e.date === action.date
              ? { ...e, values: { ...e.values, [action.fieldId]: action.value }, updatedAt: now }
              : e,
          ),
        };
      }
      const entry: ReflectionEntry = {
        id: generateId(),
        date: action.date,
        values: { [action.fieldId]: action.value },
        note: '',
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, reflectionEntries: [entry, ...entries] };
    }
    case 'SET_REFLECTION_NOTE': {
      const now = nowISO();
      const entries = state.reflectionEntries ?? [];
      const existing = entries.find(e => e.date === action.date);
      if (existing) {
        return {
          ...state,
          reflectionEntries: entries.map(e =>
            e.date === action.date ? { ...e, note: action.note, updatedAt: now } : e,
          ),
        };
      }
      const entry: ReflectionEntry = {
        id: generateId(),
        date: action.date,
        values: {},
        note: action.note,
        createdAt: now,
        updatedAt: now,
      };
      return { ...state, reflectionEntries: [entry, ...entries] };
    }

    case 'ADD_NOTIFICATION': {
      if (state.notifications.some(n => n.id === action.payload.id)) return state;
      return { ...state, notifications: [action.payload, ...state.notifications].slice(0, 100) };
    }
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(n => n.id === action.id ? { ...n, read: true } : n),
      };
    case 'MARK_ALL_NOTIFICATIONS_READ':
      return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
    case 'CLEAR_NOTIFICATIONS': {
      const extra = state.notifications.map(n => n.id);
      const ids = [...new Set([...(state.settings.notifiedReminderIds ?? []), ...extra])].slice(-200);
      return {
        ...state,
        notifications: [],
        settings: { ...state.settings, notifiedReminderIds: ids },
      };
    }
    case 'DISMISS_NOTIFICATION': {
      const ids = [...(state.settings.notifiedReminderIds ?? [])];
      if (!ids.includes(action.id)) ids.push(action.id);
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.id),
        settings: { ...state.settings, notifiedReminderIds: ids.slice(-200) },
      };
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
  addTask: (data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'googleEventId' | 'sortOrder'> & { sortOrder?: number }) => void;
  updateTask: (id: string, data: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  reorderTasks: (orderedIds: string[]) => void;
  addInboxItem: (data: Omit<InboxItem, 'id' | 'createdAt' | 'processed' | 'convertedToType' | 'convertedToId'>) => void;
  updateInboxItem: (id: string, data: Partial<InboxItem>) => void;
  deleteInboxItem: (id: string) => void;
  processInboxToTask: (inboxId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'googleEventId' | 'sortOrder'> & { sortOrder?: number }) => void;
  processInboxToNote: (inboxId: string, noteData: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  addGoal: (data: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateGoal: (id: string, data: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  addHabit: (data: Omit<Habit, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateHabit: (id: string, data: Partial<Habit>) => void;
  deleteHabit: (id: string) => void;
  toggleHabitCompletion: (habitId: string, date?: string) => void;
  addReflectionField: (data: Omit<ReflectionField, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'> & { sortOrder?: number }) => void;
  updateReflectionField: (id: string, data: Partial<ReflectionField>) => void;
  deleteReflectionField: (id: string) => void;
  reorderReflectionFields: (orderedIds: string[]) => void;
  setReflectionValue: (date: string, fieldId: string, value: ReflectionFieldValue) => void;
  setReflectionNote: (date: string, note: string) => void;
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
  recordPayablePayment: (id: string, data: { amount: number; accountId: string; date?: string; note?: string }) => boolean;
  recordReceivablePayment: (id: string, data: { amount: number; accountId: string; date?: string; note?: string }) => boolean;
  addExpense: (data: Omit<FinanceExpense, 'id' | 'createdAt'>) => void;
  updateExpense: (id: string, data: Partial<FinanceExpense>) => void;
  deleteExpense: (id: string) => void;
  addIncome: (data: Omit<FinanceIncome, 'id' | 'createdAt'>) => void;
  updateIncome: (id: string, data: Partial<FinanceIncome>) => void;
  deleteIncome: (id: string) => void;
  addVisionItem: (data: Omit<VisionItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateVisionItem: (id: string, data: Partial<VisionItem>) => void;
  deleteVisionItem: (id: string) => void;
  addWeeklyReview: (data: Omit<WeeklyReview, 'id' | 'createdAt'>) => void;
  updateWeeklyReview: (id: string, data: Partial<WeeklyReview>) => void;
  addFocusSession: (data: Omit<FocusSession, 'id'>) => void;
  addTrade: (data: Omit<Trade, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTrade: (id: string, data: Partial<Trade>, opts?: { exchangeCredit?: number }) => void;
  deleteTrade: (id: string) => void;
  addAccount: (data: Omit<FinanceAccount, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAccount: (id: string, data: Partial<FinanceAccount>) => void;
  deleteAccount: (id: string) => void;
  moveAccountMoney: (data: {
    kind: AccountTransfer['kind'];
    fromAccountId?: string | null;
    toAccountId?: string | null;
    amount: number;
    currency?: string;
    note?: string;
    date?: string;
  }) => boolean;
  addExchange: (data: Omit<TradingExchange, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExchange: (id: string, data: Partial<TradingExchange>) => void;
  deleteExchange: (id: string) => void;
  addExchangeFunds: (data: { exchangeId: string; amount: number; source?: string; note?: string; date?: string }) => void;
  setTopPriorities: (taskIds: string[]) => void;
  toggleTopPriority: (taskId: string) => void;
  pushNotification: (data: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { id?: string }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
  syncStatus: 'idle' | 'saving' | 'saved' | 'error' | 'offline';
  isOnline: boolean;
  forceSync: () => void;
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
  const [syncStatus, setSyncStatus] = React.useState<'idle' | 'saving' | 'saved' | 'error' | 'offline'>('idle');
  const [isOnline, setIsOnline] = React.useState(true);
  const skipNextSave = useRef(true);
  const stateRef = useRef(state);
  const pendingSync = useRef(false);
  const syncInFlight = useRef(false);
  stateRef.current = state;

  const pushToCloud = useCallback(async (payload: AppState): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncStatus('offline');
      pendingSync.current = true;
      return false;
    }
    if (syncInFlight.current) {
      pendingSync.current = true;
      return false;
    }
    syncInFlight.current = true;
    setSyncStatus('saving');
    try {
      saveState(payload);
      const res = await fetch('/api/sync', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('save failed');
      setSyncStatus('saved');
      pendingSync.current = false;
      return true;
    } catch {
      setSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
      pendingSync.current = true;
      saveState(payload);
      return false;
    } finally {
      syncInFlight.current = false;
    }
  }, []);

  const forceSync = useCallback(() => {
    if (status !== 'authenticated') return;
    void pushToCloud(stateRef.current);
  }, [status, pushToCloud]);

  // Online/offline handling — auto-retry when connectivity returns
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const goOnline = () => {
      setIsOnline(true);
      if (status === 'authenticated' && (pendingSync.current || syncStatus === 'error' || syncStatus === 'offline')) {
        void pushToCloud(stateRef.current);
      }
    };
    const goOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
      pendingSync.current = true;
    };

    setIsOnline(navigator.onLine);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [status, pushToCloud, syncStatus]);

  // Periodic retry while waiting for a successful sync
  useEffect(() => {
    if (status !== 'authenticated' || !hydrated) return;
    const id = setInterval(() => {
      if (pendingSync.current && navigator.onLine && !syncInFlight.current) {
        void pushToCloud(stateRef.current);
      }
    }, 15_000);
    return () => clearInterval(id);
  }, [status, hydrated, pushToCloud]);

  // Load data from cloud when authenticated
  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      dispatch({ type: 'HYDRATE', payload: loadState() });
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
        if (!cancelled) {
          dispatch({ type: 'HYDRATE', payload: loadState() });
          pendingSync.current = true;
          setSyncStatus(navigator.onLine ? 'error' : 'offline');
        }
      })
      .finally(() => {
        if (!cancelled) setHydrated(true);
      });

    return () => { cancelled = true; };
  }, [status]);

  // Auto-save (debounced) + always keep localStorage warm
  useEffect(() => {
    if (!hydrated) return;
    saveState(state);

    if (status !== 'authenticated') return;

    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }

    const timer = setTimeout(() => {
      void pushToCloud(state);
    }, 900);

    return () => clearTimeout(timer);
  }, [state, hydrated, status, pushToCloud]);

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

  const addTask = useCallback((data: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'googleEventId' | 'sortOrder'> & { sortOrder?: number }) => {
    const now = nowISO();
    const maxOrder = stateRef.current.tasks.reduce((m, t) => Math.max(m, t.sortOrder ?? 0), -1);
    const task: Task = {
      ...data,
      id: generateId(),
      googleEventId: null,
      followUpIntervalMinutes: data.followUpIntervalMinutes ?? null,
      sortOrder: data.sortOrder ?? maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
    dispatch({ type: 'ADD_TASK', payload: task });
  }, []);

  const updateTask = useCallback((id: string, data: Partial<Task>) => {
    dispatch({ type: 'UPDATE_TASK', id, data });
  }, []);

  const deleteTask = useCallback((id: string) => {
    dispatch({ type: 'DELETE_TASK', id });
  }, []);

  const reorderTasks = useCallback((orderedIds: string[]) => {
    dispatch({ type: 'REORDER_TASKS', orderedIds });
  }, []);

  const addInboxItem = useCallback((data: Omit<InboxItem, 'id' | 'createdAt' | 'processed' | 'convertedToType' | 'convertedToId'>) => {
    dispatch({ type: 'ADD_INBOX', payload: { ...data, id: generateId(), processed: false, convertedToType: null, convertedToId: null, createdAt: nowISO() } });
  }, []);
  const updateInboxItem = useCallback((id: string, data: Partial<InboxItem>) => dispatch({ type: 'UPDATE_INBOX', id, data }), []);
  const deleteInboxItem = useCallback((id: string) => dispatch({ type: 'DELETE_INBOX', id }), []);

  const processInboxToTask = useCallback((inboxId: string, taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt' | 'completedAt' | 'googleEventId' | 'sortOrder'> & { sortOrder?: number }) => {
    const now = nowISO();
    const maxOrder = stateRef.current.tasks.reduce((m, t) => Math.max(m, t.sortOrder ?? 0), -1);
    const task: Task = {
      ...taskData,
      id: generateId(),
      googleEventId: null,
      followUpIntervalMinutes: taskData.followUpIntervalMinutes ?? null,
      sortOrder: taskData.sortOrder ?? maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };
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

  const addReflectionField = useCallback((
    data: Omit<ReflectionField, 'id' | 'createdAt' | 'updatedAt' | 'sortOrder'> & { sortOrder?: number },
  ) => {
    const maxOrder = (stateRef.current.reflectionFields ?? []).reduce((m, f) => Math.max(m, f.sortOrder), -1);
    dispatch({
      type: 'ADD_REFLECTION_FIELD',
      payload: makeEntity<ReflectionField>({
        ...data,
        sortOrder: data.sortOrder ?? maxOrder + 1,
      }),
    });
  }, []);
  const updateReflectionField = useCallback((id: string, data: Partial<ReflectionField>) => {
    dispatch({ type: 'UPDATE_REFLECTION_FIELD', id, data });
  }, []);
  const deleteReflectionField = useCallback((id: string) => {
    dispatch({ type: 'DELETE_REFLECTION_FIELD', id });
  }, []);
  const reorderReflectionFields = useCallback((orderedIds: string[]) => {
    dispatch({ type: 'REORDER_REFLECTION_FIELDS', orderedIds });
  }, []);
  const setReflectionValue = useCallback((date: string, fieldId: string, value: ReflectionFieldValue) => {
    dispatch({ type: 'SET_REFLECTION_VALUE', date, fieldId, value });
  }, []);
  const setReflectionNote = useCallback((date: string, note: string) => {
    dispatch({ type: 'SET_REFLECTION_NOTE', date, note });
  }, []);

  const addNote = useCallback((data: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_NOTE', payload: makeEntity<Note>({ ...data, imageUrls: data.imageUrls ?? [] }) });
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
    dispatch({
      type: 'ADD_RECEIVABLE',
      payload: makeEntity<FinanceReceivable>({
        ...data,
        amountCollected: data.amountCollected ?? 0,
        settlements: data.settlements ?? [],
      }),
    });
  }, []);
  const updateReceivable = useCallback((id: string, data: Partial<FinanceReceivable>) => dispatch({ type: 'UPDATE_RECEIVABLE', id, data }), []);
  const deleteReceivable = useCallback((id: string) => dispatch({ type: 'DELETE_RECEIVABLE', id }), []);

  const addPayable = useCallback((data: Omit<FinancePayable, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({
      type: 'ADD_PAYABLE',
      payload: makeEntity<FinancePayable>({
        ...data,
        amountPaid: data.amountPaid ?? 0,
        settlements: data.settlements ?? [],
      }),
    });
  }, []);
  const updatePayable = useCallback((id: string, data: Partial<FinancePayable>) => dispatch({ type: 'UPDATE_PAYABLE', id, data }), []);
  const deletePayable = useCallback((id: string) => dispatch({ type: 'DELETE_PAYABLE', id }), []);

  const recordPayablePayment = useCallback((id: string, data: { amount: number; accountId: string; date?: string; note?: string }) => {
    if (!(data.amount > 0) || !data.accountId) return false;
    const acc = state.accounts?.find(a => a.id === data.accountId);
    if (acc && acc.balance < data.amount) return false;
    dispatch({
      type: 'RECORD_PAYABLE_PAYMENT',
      id,
      amount: data.amount,
      accountId: data.accountId,
      date: data.date ?? todayISO(),
      note: data.note ?? '',
    });
    return true;
  }, [state.accounts]);

  const recordReceivablePayment = useCallback((id: string, data: { amount: number; accountId: string; date?: string; note?: string }) => {
    if (!(data.amount > 0) || !data.accountId) return false;
    dispatch({
      type: 'RECORD_RECEIVABLE_PAYMENT',
      id,
      amount: data.amount,
      accountId: data.accountId,
      date: data.date ?? todayISO(),
      note: data.note ?? '',
    });
    return true;
  }, []);

  const addExpense = useCallback((data: Omit<FinanceExpense, 'id' | 'createdAt'>) => {
    dispatch({
      type: 'ADD_EXPENSE',
      payload: {
        ...data,
        accountId: data.accountId ?? null,
        id: generateId(),
        createdAt: nowISO(),
      },
    });
  }, []);
  const updateExpense = useCallback((id: string, data: Partial<FinanceExpense>) => dispatch({ type: 'UPDATE_EXPENSE', id, data }), []);
  const deleteExpense = useCallback((id: string) => dispatch({ type: 'DELETE_EXPENSE', id }), []);
  const addIncome = useCallback((data: Omit<FinanceIncome, 'id' | 'createdAt'>) => {
    dispatch({
      type: 'ADD_INCOME',
      payload: {
        ...data,
        accountId: data.accountId ?? null,
        id: generateId(),
        createdAt: nowISO(),
      },
    });
  }, []);
  const updateIncome = useCallback((id: string, data: Partial<FinanceIncome>) => dispatch({ type: 'UPDATE_INCOME', id, data }), []);
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
    const margin = typeof data.margin === 'number' ? data.margin : data.investedAmount;
    const market = data.market === 'futures' ? 'futures' : 'spot';
    dispatch({
      type: 'ADD_TRADE',
      payload: {
        ...data,
        market,
        side: data.side === 'short' ? 'short' : 'long',
        leverage: market === 'spot' ? 1 : Math.max(1, data.leverage || 1),
        margin,
        investedAmount: margin,
        quantity: data.quantity ?? null,
        entryPrice: data.entryPrice ?? null,
        exitPrice: data.exitPrice ?? null,
        stopLoss: data.stopLoss ?? null,
        takeProfit: data.takeProfit ?? null,
        fees: data.fees ?? 0,
        exchangeDebitAmount: data.exchangeDebitAmount ?? null,
        exchangeId: data.exchangeId ?? null,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      },
    });
  }, []);
  const updateTrade = useCallback((id: string, data: Partial<Trade>, opts?: { exchangeCredit?: number }) => {
    dispatch({ type: 'UPDATE_TRADE', id, data, exchangeCredit: opts?.exchangeCredit });
  }, []);
  const deleteTrade = useCallback((id: string) => dispatch({ type: 'DELETE_TRADE', id }), []);

  const addAccount = useCallback((data: Omit<FinanceAccount, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_ACCOUNT', payload: makeEntity<FinanceAccount>(data) });
  }, []);
  const updateAccount = useCallback((id: string, data: Partial<FinanceAccount>) =>
    dispatch({ type: 'UPDATE_ACCOUNT', id, data }), []);
  const deleteAccount = useCallback((id: string) => dispatch({ type: 'DELETE_ACCOUNT', id }), []);
  const moveAccountMoney = useCallback((data: {
    kind: AccountTransfer['kind'];
    fromAccountId?: string | null;
    toAccountId?: string | null;
    amount: number;
    currency?: string;
    note?: string;
    date?: string;
  }): boolean => {
    if (!(data.amount > 0)) return false;
    if (data.kind === 'transfer') {
      const from = state.accounts?.find(a => a.id === data.fromAccountId);
      if (!from || !data.toAccountId || from.balance < data.amount) return false;
    }
    if (data.kind === 'withdraw') {
      const from = state.accounts?.find(a => a.id === data.fromAccountId);
      if (!from || from.balance < data.amount) return false;
    }
    if (data.kind === 'deposit' && !data.toAccountId) return false;
    dispatch({
      type: 'ACCOUNT_MOVEMENT',
      payload: {
        kind: data.kind,
        fromAccountId: data.fromAccountId ?? null,
        toAccountId: data.toAccountId ?? null,
        amount: data.amount,
        currency: data.currency ?? 'PKR',
        note: data.note ?? '',
        date: data.date ?? todayISO(),
      },
    });
    return true;
  }, [state.accounts]);

  const addExchange = useCallback((data: Omit<TradingExchange, 'id' | 'createdAt' | 'updatedAt'>) => {
    dispatch({ type: 'ADD_EXCHANGE', payload: makeEntity<TradingExchange>(data) });
  }, []);
  const updateExchange = useCallback((id: string, data: Partial<TradingExchange>) =>
    dispatch({ type: 'UPDATE_EXCHANGE', id, data }), []);
  const deleteExchange = useCallback((id: string) => dispatch({ type: 'DELETE_EXCHANGE', id }), []);
  const addExchangeFunds = useCallback((data: {
    exchangeId: string; amount: number; source?: string; note?: string; date?: string;
  }) => {
    dispatch({
      type: 'ADD_EXCHANGE_FUNDS',
      payload: {
        exchangeId: data.exchangeId,
        amount: data.amount,
        source: data.source ?? 'external',
        note: data.note ?? '',
        date: data.date ?? todayISO(),
      },
    });
  }, []);

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

  const pushNotification = useCallback((data: Omit<AppNotification, 'id' | 'createdAt' | 'read'> & { id?: string }) => {
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        id: data.id ?? generateId(),
        title: data.title,
        body: data.body,
        type: data.type,
        href: data.href,
        read: false,
        createdAt: nowISO(),
      },
    });
  }, []);
  const markNotificationRead = useCallback((id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', id }), []);
  const markAllNotificationsRead = useCallback(() => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' }), []);
  const dismissNotification = useCallback((id: string) => dispatch({ type: 'DISMISS_NOTIFICATION', id }), []);
  const clearNotifications = useCallback(() => dispatch({ type: 'CLEAR_NOTIFICATIONS' }), []);

  return (
    <AppContext.Provider value={{
      state, filters, hydrated, syncStatus, isOnline, forceSync, setFilters, resetFilters, importState, updateSettings,
      addArea, updateArea, deleteArea,
      addProject, updateProject, deleteProject,
      addTask, updateTask, deleteTask, reorderTasks,
      addInboxItem, updateInboxItem, deleteInboxItem, processInboxToTask, processInboxToNote,
      addGoal, updateGoal, deleteGoal,
      addHabit, updateHabit, deleteHabit, toggleHabitCompletion,
      addReflectionField, updateReflectionField, deleteReflectionField, reorderReflectionFields,
      setReflectionValue, setReflectionNote,
      addNote, updateNote, deleteNote,
      addReminder, updateReminder, deleteReminder,
      addWaitingFor, updateWaitingFor, deleteWaitingFor,
      addReceivable, updateReceivable, deleteReceivable,
      addPayable, updatePayable, deletePayable,
      recordPayablePayment, recordReceivablePayment,
      addExpense, updateExpense, deleteExpense, addIncome, updateIncome, deleteIncome,
      addVisionItem, updateVisionItem, deleteVisionItem,
      addWeeklyReview, updateWeeklyReview,
      addFocusSession, addTrade, updateTrade, deleteTrade,
      addAccount, updateAccount, deleteAccount, moveAccountMoney,
      addExchange, updateExchange, deleteExchange, addExchangeFunds,
      setTopPriorities, toggleTopPriority,
      pushNotification, markNotificationRead, markAllNotificationsRead, dismissNotification, clearNotifications,
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
