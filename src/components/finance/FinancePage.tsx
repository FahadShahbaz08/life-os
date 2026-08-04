'use client';

import { useMemo, useState } from 'react';
import {
  Plus, Trash2, ArrowDownLeft, ArrowUpRight, TrendingUp, HandCoins, Landmark,
  Edit2, Filter, CheckCircle2,
} from 'lucide-react';
import {
  FinancePayableStatus, FinanceReceivableStatus, IncomeSource,
  FinanceExpense, FinanceIncome, FinancePayable, FinanceReceivable, FinanceAccount,
} from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY, INCOME_SOURCES, DEFAULT_CURRENCY, DEFAULT_EXPENSE_CATEGORIES } from '@/lib/constants';
import { CategoryBars } from '@/components/ui/Charts';
import { computeExpensesByCategory } from '@/lib/chart-data';
import { formatCurrency, formatDate, todayISO } from '@/lib/utils';
import AccountsPanel from '@/components/finance/AccountsPanel';

type Tab = 'overview' | 'accounts' | 'income' | 'expenses' | 'payables' | 'receivables' | 'categories';

function normalizeCategoryLabel(label: string): string {
  return label.trim().replace(/\s+/g, ' ');
}

/** Business start month: when the item first exists (created, or due date if earlier/later preference is create). */
function ledgerStartMonth(item: { createdAt: string; dueDate: string | null }): string {
  const created = item.createdAt.slice(0, 7);
  // dueDate alone cannot put an item into past months before it was logged
  return created;
}

/**
 * Show AR/AP in a selected month with roll-forward:
 * - Hide if not yet created (won't appear in prior months)
 * - Open items (pending/partial) appear from create month through all future months until settled
 * - Settled items appear from create month through the settlement month only
 */
function isLedgerItemActiveInMonth(
  item: { createdAt: string; dueDate: string | null; updatedAt: string; status: string },
  monthKey: string,
  openStatuses: string[],
): boolean {
  const start = ledgerStartMonth(item);
  if (start > monthKey) return false;

  if (openStatuses.includes(item.status)) {
    return true; // rolls forward while still open
  }

  // Settled: only through the month it was closed (updatedAt is set on status updates)
  const closed = item.updatedAt.slice(0, 7);
  return monthKey <= closed;
}

function isOpenInMonth(
  item: { createdAt: string; dueDate: string | null; updatedAt: string; status: string },
  monthKey: string,
  openStatuses: string[],
): boolean {
  if (!isLedgerItemActiveInMonth(item, monthKey, openStatuses)) return false;
  // Looking at historical month: if settled after month, or still open → open as of that month
  if (openStatuses.includes(item.status)) return true;
  const closed = item.updatedAt.slice(0, 7);
  return closed > monthKey; // closed later → was still open during monthKey
}

export default function FinancePage() {
  const {
    state, addPayable, addReceivable, addExpense, addIncome,
    updatePayable, updateReceivable, updateExpense, updateIncome,
    deletePayable, deleteReceivable, deleteExpense, deleteIncome,
    updateSettings,
  } = useApp();
  const { toast } = useToastContext();
  const [tab, setTab] = useState<Tab>('overview');
  const [modal, setModal] = useState<'income' | 'payable' | 'expense' | 'receivable' | null>(null);
  const [editingIncome, setEditingIncome] = useState<FinanceIncome | null>(null);
  const [editingExpense, setEditingExpense] = useState<FinanceExpense | null>(null);
  const [editingPayable, setEditingPayable] = useState<FinancePayable | null>(null);
  const [editingReceivable, setEditingReceivable] = useState<FinanceReceivable | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: string; id: string } | null>(null);
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [expenseFilter, setExpenseFilter] = useState<string>('all');
  const [newCategory, setNewCategory] = useState('');

  const categories = state.settings.expenseCategories?.length
    ? state.settings.expenseCategories
    : DEFAULT_EXPENSE_CATEGORIES;

  const addCategory = (raw: string) => {
    const label = normalizeCategoryLabel(raw);
    if (!label) return;
    const exists = categories.some(c => c.toLowerCase() === label.toLowerCase());
    if (exists) {
      toast('Category already exists', 'info');
      return;
    }
    updateSettings({ expenseCategories: [...categories, label] });
    toast(`Category “${label}” added`);
    setNewCategory('');
  };

  const removeCategory = (label: string) => {
    const inUse = state.expenses.some(e => e.category.toLowerCase() === label.toLowerCase());
    if (inUse) {
      toast('Category is used on expenses — reassign first', 'error');
      return;
    }
    updateSettings({ expenseCategories: categories.filter(c => c.toLowerCase() !== label.toLowerCase()) });
    toast('Category removed', 'info');
  };

  const RECEIVABLE_OPEN = ['pending', 'partial'];
  const PAYABLE_OPEN = ['pending', 'partial'];

  const monthIncome = useMemo(
    () => (state.incomes ?? []).filter(i => i.date.startsWith(month)).reduce((s, i) => s + i.amount, 0),
    [state.incomes, month]
  );
  const monthExpenses = useMemo(
    () => state.expenses.filter(e => e.date.startsWith(month)).reduce((s, e) => s + e.amount, 0),
    [state.expenses, month]
  );

  // AR/AP as-of selected month (open at that time / roll-forward)
  const monthReceivables = useMemo(
    () => state.receivables.filter(r => isLedgerItemActiveInMonth(r, month, RECEIVABLE_OPEN)),
    [state.receivables, month]
  );
  const monthPayables = useMemo(
    () => state.payables.filter(p => isLedgerItemActiveInMonth(p, month, PAYABLE_OPEN)),
    [state.payables, month]
  );
  const openReceivables = useMemo(
    () => state.receivables.filter(r => isOpenInMonth(r, month, RECEIVABLE_OPEN)),
    [state.receivables, month]
  );
  const openPayables = useMemo(
    () => state.payables.filter(p => isOpenInMonth(p, month, PAYABLE_OPEN)),
    [state.payables, month]
  );
  const totalPayables = openPayables.reduce((s, p) => s + p.amount, 0);
  const totalReceivables = openReceivables.reduce((s, r) => s + r.amount, 0);
  const net = monthIncome - monthExpenses;
  const savingsRate = monthIncome > 0 ? Math.round((net / monthIncome) * 100) : 0;

  const upcomingPayables = openPayables
    .filter(p => p.dueDate)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 5);

  const monthOnlyExpenses = state.expenses.filter(e => e.date.startsWith(month));
  const categoryChart = computeExpensesByCategory(monthOnlyExpenses);
  const liquidTotal = (state.accounts ?? []).reduce((s, a) => s + a.balance, 0);
  const accountLabel = (id: string | null | undefined) => {
    if (!id) return null;
    return (state.accounts ?? []).find(a => a.id === id)?.name ?? null;
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'accounts', label: 'Banks & Cash' },
    { id: 'income', label: 'Income' },
    { id: 'expenses', label: 'Expenses' },
    { id: 'payables', label: 'Payables' },
    { id: 'receivables', label: 'Receivables' },
    { id: 'categories', label: 'Categories' },
  ];

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const { type, id } = deleteTarget;
    if (type === 'income') deleteIncome(id);
    if (type === 'expense') deleteExpense(id);
    if (type === 'payable') deletePayable(id);
    if (type === 'receivable') deleteReceivable(id);
    toast('Deleted', 'info');
    setDeleteTarget(null);
  };

  const filteredExpenses = state.expenses
    .filter(e => e.date.startsWith(month))
    .filter(e => expenseFilter === 'all' || e.category === expenseFilter)
    .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader
          title="Finance"
          subtitle="Cashflow, ledger, payables & receivables"
          action={
            <div className="flex gap-2 flex-wrap items-center">
              <input
                type="month"
                value={month}
                onChange={e => setMonth(e.target.value)}
                className="px-3 py-1.5 text-xs bg-raised border border-base rounded-lg text-primary"
              />
              <button onClick={() => setModal('income')} className="px-3 py-1.5 text-xs text-secondary bg-raised border border-base rounded-lg">+ Income</button>
              <button onClick={() => setModal('expense')} className="px-3 py-1.5 text-xs text-secondary bg-raised border border-base rounded-lg">+ Expense</button>
              <button onClick={() => setModal('payable')} className="px-3 py-1.5 text-xs text-secondary bg-raised border border-base rounded-lg">+ Payable</button>
              <button onClick={() => setModal('receivable')} className={BTN_PRIMARY}><Plus size={14} />Receivable</button>
            </div>
          }
        />

        <div className="flex gap-1 p-1 bg-raised rounded-xl border border-base mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 min-w-[70px] py-2 text-xs font-medium rounded-lg whitespace-nowrap ${
                tab === t.id ? 'bg-surface text-primary shadow-sm border border-base' : 'text-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              <StatCard icon={<ArrowDownLeft size={16} className="text-muted" />} label="Income" value={formatCurrency(monthIncome)} valueClass="text-primary" />
              <StatCard icon={<ArrowUpRight size={16} className="text-muted" />} label="Expenses" value={formatCurrency(monthExpenses)} valueClass="text-primary" />
              <StatCard icon={<TrendingUp size={16} className="text-muted" />} label="Net cashflow" value={formatCurrency(net)} valueClass={net >= 0 ? 'text-[var(--chart-pos)]' : 'text-[var(--chart-neg)]'} hint={`${savingsRate}% savings rate`} />
              <StatCard icon={<Landmark size={16} className="text-muted" />} label="Banks + cash" value={formatCurrency(liquidTotal)} valueClass="text-primary" hint="See Banks & Cash tab" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">Open payables (you owe)</p>
                  <p className="text-xl font-bold text-primary font-display">{formatCurrency(totalPayables)}</p>
                  <p className="text-[11px] text-muted mt-0.5">{openPayables.length} open</p>
                </div>
                <HandCoins size={22} className="text-muted" />
              </div>
              <div className="card p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted">Open receivables (owed to you)</p>
                  <p className="text-xl font-bold text-primary font-display">{formatCurrency(totalReceivables)}</p>
                  <p className="text-[11px] text-muted mt-0.5">{openReceivables.length} open</p>
                </div>
                <ArrowDownLeft size={22} className="text-muted" />
              </div>
            </div>

            <div className="card p-5 mb-6">
              <h3 className="text-sm font-semibold font-display text-primary mb-1">Spending by category</h3>
              <p className="text-xs text-muted mb-4">
                {monthOnlyExpenses.length ? `Selected month · ${formatCurrency(monthExpenses)}` : 'No expenses this month'}
              </p>
              <CategoryBars segments={categoryChart.map(c => ({ label: c.label, value: c.value }))} />
            </div>

            {upcomingPayables.length > 0 && (
              <div className="card p-5">
                <h3 className="text-sm font-semibold font-display text-primary mb-3">Upcoming payments</h3>
                {upcomingPayables.map(p => (
                  <div key={p.id} className="flex justify-between py-2 border-b border-subtle last:border-0 text-sm gap-3">
                    <span className="text-secondary truncate">{p.person}{p.notes ? ` — ${p.notes}` : ''}</span>
                    <span className="text-red-400 font-medium shrink-0">{formatCurrency(p.amount)} · {formatDate(p.dueDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'accounts' && <AccountsPanel />}

        {tab === 'income' && (
          <LedgerList
            empty="No income logged for this period."
            items={(state.incomes ?? [])
              .filter(i => i.date.startsWith(month))
              .sort((a, b) => b.date.localeCompare(a.date))
              .map(i => ({
                id: i.id,
                title: i.description || i.source,
                meta: [
                  i.source,
                  formatDate(i.date),
                  accountLabel(i.accountId) ? `→ ${accountLabel(i.accountId)}` : null,
                ].filter(Boolean).join(' · '),
                amount: i.amount,
                amountClass: 'text-emerald-400',
                status: undefined,
              }))}
            onEdit={id => setEditingIncome(state.incomes.find(i => i.id === id) ?? null)}
            onDelete={id => setDeleteTarget({ type: 'income', id })}
          />
        )}

        {tab === 'expenses' && (
          <>
            <div className="flex items-center gap-2 mb-3">
              <Filter size={13} className="text-muted" />
              <select value={expenseFilter} onChange={e => setExpenseFilter(e.target.value)} className={`${FORM_SELECT} max-w-xs`}>
                <option value="all">All categories</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <LedgerList
              empty="No expenses for this month."
              items={filteredExpenses.map(e => ({
                id: e.id,
                title: e.description || e.category,
                meta: [
                  e.category,
                  formatDate(e.date),
                  accountLabel(e.accountId) ? `from ${accountLabel(e.accountId)}` : null,
                ].filter(Boolean).join(' · '),
                amount: e.amount,
                amountClass: 'text-primary',
              }))}
              onEdit={id => setEditingExpense(state.expenses.find(e => e.id === id) ?? null)}
              onDelete={id => setDeleteTarget({ type: 'expense', id })}
            />
          </>
        )}

        {tab === 'categories' && (
          <div className="max-w-lg">
            <p className="text-sm text-secondary mb-4">
              Create categories you actually use — gym fees, rent, internet, anything monthly or daily.
            </p>
            <div className="flex gap-2 mb-4">
              <input
                value={newCategory}
                onChange={e => setNewCategory(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCategory(newCategory); } }}
                placeholder="e.g. Gym fees, Internet, Maid"
                className={FORM_INPUT}
              />
              <button type="button" onClick={() => addCategory(newCategory)} className={BTN_PRIMARY}>
                <Plus size={14} /> Add
              </button>
            </div>
            <div className="space-y-2">
              {categories.map(c => (
                <div key={c} className="card px-4 py-3 flex items-center justify-between gap-3">
                  <span className="text-sm text-primary">{c}</span>
                  <button
                    type="button"
                    onClick={() => removeCategory(c)}
                    className="p-1.5 text-muted hover:text-red-400"
                    title="Remove category"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'payables' && (
          <div className="space-y-2">
            <p className="text-xs text-muted mb-1">
              Open balances roll into later months until paid. Items do not appear before the month you added them.
            </p>
            {monthPayables.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No payables for this month.</p>
            ) : monthPayables.map(p => {
              const openHere = isOpenInMonth(p, month, PAYABLE_OPEN);
              return (
              <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{p.person}</p>
                  <p className="text-xs text-muted">{p.notes || 'Payment'}{p.dueDate ? ` · due ${formatDate(p.dueDate)}` : ''}</p>
                  <StatusPill status={openHere && p.status === 'paid' ? 'pending' : p.status} />
                  {isOpenInMonth(p, month, PAYABLE_OPEN) && p.status === 'paid' && (
                    <span className="text-[10px] text-muted ml-1">(open as of this month)</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-amber-400">{formatCurrency(p.amount)}</span>
                  {p.status !== 'paid' && (
                    <>
                      {p.status === 'pending' && (
                        <button onClick={() => { updatePayable(p.id, { status: 'partial' }); toast('Marked partial'); }} className="px-2 py-1 text-[10px] bg-raised border border-base rounded-lg text-secondary">Partial</button>
                      )}
                      <button onClick={() => { updatePayable(p.id, { status: 'paid' }); toast('Marked paid'); }} className="px-2 py-1 text-[10px] bg-emerald-500/10 text-emerald-400 rounded-lg inline-flex items-center gap-1"><CheckCircle2 size={10} />Paid</button>
                    </>
                  )}
                  <button onClick={() => setEditingPayable(p)} className="p-1.5 text-muted hover:text-accent"><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteTarget({ type: 'payable', id: p.id })} className="p-1.5 text-muted hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {tab === 'receivables' && (
          <div className="space-y-2">
            <p className="text-xs text-muted mb-1">
              Uncollected items carry into later months. New receivables only show from the month you add them.
            </p>
            {monthReceivables.length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No receivables for this month.</p>
            ) : monthReceivables.map(r => {
              const openHere = isOpenInMonth(r, month, RECEIVABLE_OPEN);
              const displayStatus =
                openHere && (r.status === 'collected' || r.status === 'written_off') ? 'pending' : r.status;
              return (
              <div key={r.id} className="card p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{r.person}</p>
                  <p className="text-xs text-muted">{r.notes || 'Receivable'}{r.dueDate ? ` · due ${formatDate(r.dueDate)}` : ''}</p>
                  <StatusPill status={displayStatus} />
                  {openHere && (r.status === 'collected' || r.status === 'written_off') && (
                    <span className="text-[10px] text-muted block">Still open as of selected month · settled later</span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-bold text-cyan-400">{formatCurrency(r.amount)}</span>
                  {r.status !== 'collected' && r.status !== 'written_off' && (
                    <>
                      {r.status === 'pending' && (
                        <button onClick={() => { updateReceivable(r.id, { status: 'partial' }); toast('Marked partial'); }} className="px-2 py-1 text-[10px] bg-raised border border-base rounded-lg text-secondary">Partial</button>
                      )}
                      <button onClick={() => { updateReceivable(r.id, { status: 'collected' }); toast('Collected'); }} className="px-2 py-1 text-[10px] bg-emerald-500/10 text-emerald-400 rounded-lg">Collected</button>
                    </>
                  )}
                  <button onClick={() => setEditingReceivable(r)} className="p-1.5 text-muted hover:text-accent"><Edit2 size={13} /></button>
                  <button onClick={() => setDeleteTarget({ type: 'receivable', id: r.id })} className="p-1.5 text-muted hover:text-red-400"><Trash2 size={13} /></button>
                </div>
              </div>
              );
            })}
          </div>
        )}
      </div>

      {(modal === 'income' || editingIncome) && (
        <IncomeModal
          initial={editingIncome}
          accounts={state.accounts ?? []}
          onClose={() => { setModal(null); setEditingIncome(null); }}
          onSave={d => {
            if (editingIncome) {
              updateIncome(editingIncome.id, d);
              toast('Income updated');
            } else {
              addIncome(d);
              toast('Income logged');
            }
            setModal(null);
            setEditingIncome(null);
          }}
        />
      )}
      {(modal === 'expense' || editingExpense) && (
        <ExpenseModal
          initial={editingExpense}
          categories={categories}
          accounts={state.accounts ?? []}
          onAddCategory={addCategory}
          onClose={() => { setModal(null); setEditingExpense(null); }}
          onSave={d => {
            if (editingExpense) {
              updateExpense(editingExpense.id, d);
              toast('Expense updated');
            } else {
              addExpense(d);
              toast('Expense logged');
            }
            setModal(null);
            setEditingExpense(null);
          }}
        />
      )}
      {(modal === 'payable' || editingPayable) && (
        <PartyModal
          title={editingPayable ? 'Edit Payable' : 'Add Payable'}
          initial={editingPayable}
          onClose={() => { setModal(null); setEditingPayable(null); }}
          onSave={d => {
            if (editingPayable) {
              updatePayable(editingPayable.id, { person: d.person, amount: d.amount, dueDate: d.date, notes: d.notes, status: d.status as FinancePayableStatus });
              toast('Payable updated');
            } else {
              addPayable({ person: d.person, amount: d.amount, currency: DEFAULT_CURRENCY, dueDate: d.date, notes: d.notes, status: 'pending' });
              toast('Payable added');
            }
            setModal(null);
            setEditingPayable(null);
          }}
          statusOptions={[
            { value: 'pending', label: 'Pending' },
            { value: 'partial', label: 'Partial' },
            { value: 'paid', label: 'Paid' },
          ]}
        />
      )}
      {(modal === 'receivable' || editingReceivable) && (
        <PartyModal
          title={editingReceivable ? 'Edit Receivable' : 'Add Receivable'}
          initial={editingReceivable}
          onClose={() => { setModal(null); setEditingReceivable(null); }}
          onSave={d => {
            if (editingReceivable) {
              updateReceivable(editingReceivable.id, { person: d.person, amount: d.amount, dueDate: d.date, notes: d.notes, status: d.status as FinanceReceivableStatus });
              toast('Receivable updated');
            } else {
              addReceivable({ person: d.person, amount: d.amount, currency: DEFAULT_CURRENCY, dueDate: d.date, notes: d.notes, status: 'pending' });
              toast('Receivable added');
            }
            setModal(null);
            setEditingReceivable(null);
          }}
          statusOptions={[
            { value: 'pending', label: 'Pending' },
            { value: 'partial', label: 'Partial' },
            { value: 'collected', label: 'Collected' },
            { value: 'written_off', label: 'Written off' },
          ]}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete entry?"
          message="This finance entry will be removed permanently."
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

function StatCard({ icon, label, value, valueClass, hint }: {
  icon: React.ReactNode; label: string; value: string; valueClass: string; hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="mb-2">{icon}</div>
      <p className={`text-xl font-bold font-display ${valueClass}`}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
      {hint && <p className="text-[10px] text-muted mt-1">{hint}</p>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: 'bg-amber-500/10 text-amber-400',
    partial: 'bg-cyan-500/10 text-cyan-400',
    paid: 'bg-emerald-500/10 text-emerald-400',
    collected: 'bg-emerald-500/10 text-emerald-400',
    written_off: 'bg-raised text-muted',
  };
  return (
    <span className={`inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded-md capitalize ${map[status] ?? 'bg-raised text-muted'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function LedgerList({ items, empty, onEdit, onDelete }: {
  items: { id: string; title: string; meta: string; amount: number; amountClass: string; status?: string }[];
  empty: string;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (items.length === 0) return <p className="text-sm text-muted text-center py-8">{empty}</p>;
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="card p-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-primary truncate">{item.title}</p>
            <p className="text-xs text-muted">{item.meta}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-sm font-bold ${item.amountClass}`}>{formatCurrency(item.amount)}</span>
            <button onClick={() => onEdit(item.id)} className="p-1.5 text-muted hover:text-accent"><Edit2 size={13} /></button>
            <button onClick={() => onDelete(item.id)} className="p-1.5 text-muted hover:text-red-400"><Trash2 size={13} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function IncomeModal({ initial, accounts, onClose, onSave }: {
  initial?: FinanceIncome | null;
  accounts: FinanceAccount[];
  onClose: () => void;
  onSave: (d: {
    source: IncomeSource;
    amount: number;
    currency: string;
    date: string;
    description: string;
    accountId: string | null;
  }) => void;
}) {
  const [source, setSource] = useState<IncomeSource>(initial?.source ?? 'salary');
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '');
  return (
    <Modal title={initial ? 'Edit Income' : 'Log Income'} onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          onSave({
            source,
            amount: Number(amount),
            currency: DEFAULT_CURRENCY,
            date,
            description,
            accountId: accountId || null,
          });
        }}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <ModalBody>
          <div className="space-y-3">
            <select value={source} onChange={e => setSource(e.target.value as IncomeSource)} className={FORM_SELECT}>
              {INCOME_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (PKR)" className={FORM_INPUT} required />
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Received into *</label>
              {accounts.length === 0 ? (
                <p className="text-xs text-muted">
                  No bank/cash accounts yet — add some under <strong>Banks &amp; Cash</strong>, or leave unlinked.
                </p>
              ) : (
                <select value={accountId} onChange={e => setAccountId(e.target.value)} className={FORM_SELECT}>
                  <option value="">Not linked to an account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type}) · {formatCurrency(a.balance)}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[10px] text-muted mt-1">Balance on that account increases when you save.</p>
            </div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={FORM_INPUT} />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className={FORM_INPUT} />
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-lg">Cancel</button>
          <button type="submit" className={`flex-1 py-2 text-sm ${BTN_PRIMARY}`}>Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function ExpenseModal({ initial, categories, accounts, onAddCategory, onClose, onSave }: {
  initial?: FinanceExpense | null;
  categories: string[];
  accounts: FinanceAccount[];
  onAddCategory: (label: string) => void;
  onClose: () => void;
  onSave: (d: {
    category: string;
    amount: number;
    currency: string;
    date: string;
    description: string;
    areaId: string | null;
    accountId: string | null;
  }) => void;
}) {
  const defaultCat = initial?.category ?? categories[0] ?? 'Other';
  const [category, setCategory] = useState(defaultCat);
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '');
  const [date, setDate] = useState(initial?.date ?? todayISO());
  const [description, setDescription] = useState(initial?.description ?? '');
  const [accountId, setAccountId] = useState(initial?.accountId ?? accounts[0]?.id ?? '');
  const [creating, setCreating] = useState(false);
  const [custom, setCustom] = useState('');

  const selectValue = categories.some(c => c.toLowerCase() === category.toLowerCase())
    ? categories.find(c => c.toLowerCase() === category.toLowerCase())!
    : category;

  return (
    <Modal title={initial ? 'Edit Expense' : 'Log Expense'} onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          const cat = normalizeCategoryLabel(category) || 'Other';
          if (!categories.some(c => c.toLowerCase() === cat.toLowerCase())) {
            onAddCategory(cat);
          }
          onSave({
            category: cat,
            amount: Number(amount),
            currency: DEFAULT_CURRENCY,
            date,
            description,
            areaId: initial?.areaId ?? null,
            accountId: accountId || null,
          });
        }}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <ModalBody>
          <div className="space-y-3">
            {!creating ? (
              <div className="flex gap-2">
                <select
                  value={selectValue}
                  onChange={e => {
                    if (e.target.value === '__new__') {
                      setCreating(true);
                      return;
                    }
                    setCategory(e.target.value);
                  }}
                  className={FORM_SELECT}
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  <option value="__new__">+ Create new category…</option>
                </select>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  value={custom}
                  onChange={e => setCustom(e.target.value)}
                  placeholder="New category name"
                  className={FORM_INPUT}
                  autoFocus
                />
                <button
                  type="button"
                  className={BTN_PRIMARY}
                  onClick={() => {
                    const label = normalizeCategoryLabel(custom);
                    if (!label) return;
                    onAddCategory(label);
                    setCategory(label);
                    setCustom('');
                    setCreating(false);
                  }}
                >
                  Use
                </button>
                <button type="button" className="px-3 text-sm text-muted" onClick={() => setCreating(false)}>Cancel</button>
              </div>
            )}
            <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (PKR)" className={FORM_INPUT} required />
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Paid from *</label>
              {accounts.length === 0 ? (
                <p className="text-xs text-muted">
                  No bank/cash accounts yet — add some under <strong>Banks &amp; Cash</strong>, or leave unlinked.
                </p>
              ) : (
                <select value={accountId} onChange={e => setAccountId(e.target.value)} className={FORM_SELECT}>
                  <option value="">Not linked to an account</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type}) · {formatCurrency(a.balance)}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[10px] text-muted mt-1">Balance on that account decreases when you save.</p>
            </div>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={FORM_INPUT} />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className={FORM_INPUT} />
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-lg">Cancel</button>
          <button type="submit" className={`flex-1 py-2 text-sm ${BTN_PRIMARY}`}>Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function PartyModal({ title, initial, onClose, onSave, statusOptions }: {
  title: string;
  initial?: { person: string; amount: number; dueDate: string | null; notes: string; status: string } | null;
  onClose: () => void;
  onSave: (d: { person: string; amount: number; date: string | null; notes: string; status: string }) => void;
  statusOptions: { value: string; label: string }[];
}) {
  const [person, setPerson] = useState(initial?.person ?? '');
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? '');
  const [date, setDate] = useState(initial?.dueDate ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [status, setStatus] = useState(initial?.status ?? statusOptions[0].value);
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({ person, amount: Number(amount), date: date || null, notes, status }); }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <input value={person} onChange={e => setPerson(e.target.value)} placeholder="Person / Vendor" className={FORM_INPUT} required />
            <input type="number" step="0.01" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (PKR)" className={FORM_INPUT} required />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={FORM_INPUT} />
            {initial && (
              <select value={status} onChange={e => setStatus(e.target.value)} className={FORM_SELECT}>
                {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            )}
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className={FORM_INPUT} />
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-lg">Cancel</button>
          <button type="submit" className={`flex-1 py-2 text-sm ${BTN_PRIMARY}`}>Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
