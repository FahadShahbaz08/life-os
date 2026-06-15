'use client';

import { useState } from 'react';
import { Plus, Trash2, ArrowDownLeft, ArrowUpRight, Receipt, TrendingUp } from 'lucide-react';
import { ExpenseCategory, FinancePayableStatus, IncomeSource } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY, EXPENSE_CATEGORIES, INCOME_SOURCES, DEFAULT_CURRENCY } from '@/lib/constants';
import { BarChart, DonutChart } from '@/components/ui/Charts';
import { computeMonthlyExpenses, computeExpensesByCategory, computeMonthlyCashflow } from '@/lib/chart-data';
import { formatCurrency, formatDate, todayISO } from '@/lib/utils';

export default function FinancePage() {
  const { state, addPayable, addExpense, addIncome, updatePayable, deletePayable, deleteExpense, deleteIncome } = useApp();
  const { toast } = useToastContext();
  const [tab, setTab] = useState<'overview' | 'income' | 'payables' | 'expenses'>('overview');
  const [modal, setModal] = useState<'income' | 'payable' | 'expense' | null>(null);

  const monthKey = todayISO().slice(0, 7);
  const monthIncome = (state.incomes ?? []).filter(i => i.date.startsWith(monthKey)).reduce((s, i) => s + i.amount, 0);
  const monthExpenses = state.expenses.filter(e => e.date.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
  const totalPayables = state.payables.filter(p => p.status !== 'paid').reduce((s, p) => s + p.amount, 0);
  const upcomingPayables = state.payables.filter(p => p.status === 'pending' && p.dueDate).sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? '')).slice(0, 5);

  const monthlyChart = computeMonthlyCashflow(state.incomes ?? [], state.expenses);
  const categoryChart = computeExpensesByCategory(state.expenses);
  const expenseBar = computeMonthlyExpenses(state.expenses);

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'income' as const, label: 'Income' },
    { id: 'payables' as const, label: 'Payables' },
    { id: 'expenses' as const, label: 'Expenses' },
  ];

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader title="Finance" subtitle="Monthly income, expenses, and payables"
          action={
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => setModal('income')} className="px-3 py-1.5 text-xs text-emerald-400 bg-emerald-500/10 rounded-xl">+ Income</button>
              <button onClick={() => setModal('payable')} className="px-3 py-1.5 text-xs text-amber-400 bg-amber-500/10 rounded-xl">+ Payable</button>
              <button onClick={() => setModal('expense')} className={BTN_PRIMARY}><Plus size={14} />Expense</button>
            </div>
          }
        />

        <div className="flex gap-1 p-1 bg-raised rounded-xl border border-base mb-6 overflow-x-auto">
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`flex-1 min-w-[70px] py-2 text-xs font-medium rounded-lg whitespace-nowrap ${tab === t.id ? 'bg-surface text-primary shadow-sm' : 'text-muted'}`}>{t.label}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-surface border border-base rounded-2xl p-5">
                <ArrowDownLeft size={16} className="text-emerald-400 mb-2" />
                <p className="text-2xl font-bold text-emerald-400">{formatCurrency(monthIncome)}</p>
                <p className="text-xs text-muted">Income this month</p>
              </div>
              <div className="bg-surface border border-base rounded-2xl p-5">
                <ArrowUpRight size={16} className="text-red-400 mb-2" />
                <p className="text-2xl font-bold text-red-400">{formatCurrency(monthExpenses)}</p>
                <p className="text-xs text-muted">Expenses this month</p>
              </div>
              <div className="bg-surface border border-base rounded-2xl p-5">
                <TrendingUp size={16} className="text-indigo-400 mb-2" />
                <p className={`text-2xl font-bold ${monthIncome - monthExpenses >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {formatCurrency(monthIncome - monthExpenses)}
                </p>
                <p className="text-xs text-muted">Net this month</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="bg-surface border border-base rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-primary mb-1">Monthly Cashflow</h3>
                <p className="text-xs text-muted mb-4">Income vs expenses · last 6 months</p>
                <BarChart data={monthlyChart.map(m => ({ label: m.label, value: m.net }))} height={160} />
              </div>
              <div className="bg-surface border border-base rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-primary mb-1">Spending by Category</h3>
                <p className="text-xs text-muted mb-4">All time expenses</p>
                <DonutChart segments={categoryChart.map(c => ({ label: c.label, value: c.value }))} />
              </div>
            </div>

            <div className="bg-surface border border-base rounded-2xl p-5 mb-6">
              <h3 className="text-sm font-semibold text-primary mb-1">Monthly Expenses</h3>
              <p className="text-xs text-muted mb-4">Expense trend · payables owed: {formatCurrency(totalPayables)}</p>
              <BarChart data={expenseBar} height={120} />
            </div>

            {upcomingPayables.length > 0 && (
              <div className="bg-surface border border-base rounded-2xl p-5">
                <h3 className="text-sm font-semibold text-primary mb-3">Upcoming Payments</h3>
                {upcomingPayables.map(p => (
                  <div key={p.id} className="flex justify-between py-2 border-b border-subtle last:border-0 text-sm">
                    <span className="text-secondary">{p.person} — {p.notes || 'Payment'}</span>
                    <span className="text-red-400 font-medium">{formatCurrency(p.amount)} · {formatDate(p.dueDate)}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'income' && (
          <div className="space-y-2">
            {(state.incomes ?? []).length === 0 ? (
              <p className="text-sm text-muted text-center py-8">No income logged yet.</p>
            ) : (state.incomes ?? []).map(i => (
              <div key={i.id} className="bg-surface border border-base rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">{i.description || i.source}</p>
                  <p className="text-xs text-muted">{i.source} · {formatDate(i.date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-emerald-400">{formatCurrency(i.amount)}</span>
                  <button onClick={() => deleteIncome(i.id)} className="text-muted hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'payables' && (
          <FinanceList items={state.payables.map(p => ({ id: p.id, primary: p.person, secondary: p.notes, amount: p.amount, date: p.dueDate, status: p.status }))}
            onMark={(id) => { updatePayable(id, { status: 'paid' as FinancePayableStatus }); toast('Marked paid'); }}
            onDelete={(id) => deletePayable(id)} color="red"
          />
        )}

        {tab === 'expenses' && (
          <div className="space-y-2">
            {state.expenses.map(e => (
              <div key={e.id} className="bg-surface border border-base rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-primary">{e.description || e.category}</p>
                  <p className="text-xs text-muted">{e.category} · {formatDate(e.date)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-primary">{formatCurrency(e.amount)}</span>
                  <button onClick={() => deleteExpense(e.id)} className="text-muted hover:text-red-400"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modal === 'income' && (
        <IncomeModal onClose={() => setModal(null)} onSave={d => { addIncome(d); toast('Income logged'); setModal(null); }} />
      )}
      {modal === 'payable' && (
        <FinanceModal title="Add Payable" onClose={() => setModal(null)} onSave={d => { addPayable({ person: d.person, amount: d.amount, currency: DEFAULT_CURRENCY, dueDate: d.date, notes: d.notes, status: 'pending' }); toast('Added'); setModal(null); }} />
      )}
      {modal === 'expense' && (
        <ExpenseModal onClose={() => setModal(null)} onSave={d => { addExpense(d); toast('Expense logged'); setModal(null); }} />
      )}
    </>
  );
}

function FinanceList({ items, onMark, onDelete, color }: { items: { id: string; primary: string; secondary: string; amount: number; date: string | null; status: string }[]; onMark: (id: string) => void; onDelete: (id: string) => void; color: string }) {
  return (
    <div className="space-y-2">
      {items.length === 0 ? <p className="text-sm text-muted text-center py-8">No items</p> : items.map(item => (
        <div key={item.id} className="bg-surface border border-base rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-primary">{item.primary}</p>
            <p className="text-xs text-muted">{item.secondary}{item.date ? ` · ${formatDate(item.date)}` : ''}</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold text-${color}-400`}>{formatCurrency(item.amount)}</span>
            {item.status !== 'paid' && (
              <button onClick={() => onMark(item.id)} className="px-2 py-1 text-xs bg-emerald-500/10 text-emerald-400 rounded-lg">Mark done</button>
            )}
            <button onClick={() => onDelete(item.id)} className="text-muted hover:text-red-400"><Trash2 size={14} /></button>
          </div>
        </div>
      ))}
    </div>
  );
}

function FinanceModal({ title, onClose, onSave }: { title: string; onClose: () => void; onSave: (d: { person: string; amount: number; date: string | null; notes: string }) => void }) {
  const [person, setPerson] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({ person, amount: Number(amount), date: date || null, notes }); }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <input value={person} onChange={e => setPerson(e.target.value)} placeholder="Person / Vendor" className={FORM_INPUT} required />
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (PKR)" className={FORM_INPUT} required />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={FORM_INPUT} />
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes" className={FORM_INPUT} />
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-xl">Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function IncomeModal({ onClose, onSave }: { onClose: () => void; onSave: (d: { source: IncomeSource; amount: number; currency: string; date: string; description: string }) => void }) {
  const [source, setSource] = useState<IncomeSource>('salary');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  return (
    <Modal title="Log Income" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({ source, amount: Number(amount), currency: DEFAULT_CURRENCY, date, description }); }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <select value={source} onChange={e => setSource(e.target.value as IncomeSource)} className={FORM_SELECT}>
              {INCOME_SOURCES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (PKR)" className={FORM_INPUT} required />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={FORM_INPUT} />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className={FORM_INPUT} />
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-xl">Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function ExpenseModal({ onClose, onSave }: { onClose: () => void; onSave: (d: { category: ExpenseCategory; amount: number; currency: string; date: string; description: string; areaId: string | null }) => void }) {
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [description, setDescription] = useState('');
  return (
    <Modal title="Log Expense" onClose={onClose}>
      <form onSubmit={e => { e.preventDefault(); onSave({ category, amount: Number(amount), currency: DEFAULT_CURRENCY, date, description, areaId: null }); }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <select value={category} onChange={e => setCategory(e.target.value as ExpenseCategory)} className={FORM_SELECT}>
              {EXPENSE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Amount (PKR)" className={FORM_INPUT} required />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className={FORM_INPUT} />
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className={FORM_INPUT} />
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-xl">Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
