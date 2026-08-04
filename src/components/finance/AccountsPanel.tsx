'use client';

import { useState } from 'react';
import { Plus, Trash2, ArrowLeftRight, Banknote, Building2, Wallet } from 'lucide-react';
import type { FinanceAccount, FinanceAccountType } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY, DEFAULT_CURRENCY } from '@/lib/constants';
import { formatCurrency, formatDate, todayISO } from '@/lib/utils';

export default function AccountsPanel() {
  const { state, addAccount, deleteAccount, moveAccountMoney } = useApp();
  const { toast } = useToastContext();
  const accounts = state.accounts ?? [];
  const transfers = (state.accountTransfers ?? []).slice(0, 30);

  const [showAdd, setShowAdd] = useState(false);
  const [moveMode, setMoveMode] = useState<'deposit' | 'withdraw' | 'transfer' | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const totalBank = accounts.filter(a => a.type === 'bank').reduce((s, a) => s + a.balance, 0);
  const totalCash = accounts.filter(a => a.type === 'cash').reduce((s, a) => s + a.balance, 0);
  const total = totalBank + totalCash;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <SummaryCard icon={<Wallet size={16} />} label="Total liquid" value={formatCurrency(total)} />
        <SummaryCard icon={<Building2 size={16} />} label="In banks" value={formatCurrency(totalBank)} />
        <SummaryCard icon={<Banknote size={16} />} label="Cash" value={formatCurrency(totalCash)} />
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setShowAdd(true)} className={BTN_PRIMARY}>
          <Plus size={14} /> Add bank / cash
        </button>
        <button
          type="button"
          disabled={accounts.length === 0}
          onClick={() => setMoveMode('deposit')}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-base bg-raised text-secondary disabled:opacity-40"
        >
          + Add money
        </button>
        <button
          type="button"
          disabled={accounts.length === 0}
          onClick={() => setMoveMode('withdraw')}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-base bg-raised text-secondary disabled:opacity-40"
        >
          Withdraw
        </button>
        <button
          type="button"
          disabled={accounts.length < 2}
          onClick={() => setMoveMode('transfer')}
          className="px-3 py-2 text-xs font-medium rounded-lg border border-base bg-raised text-secondary disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          <ArrowLeftRight size={13} /> Transfer (intra)
        </button>
      </div>

      {accounts.length === 0 ? (
        <p className="text-sm text-muted py-6 text-center">
          Add HBL, Meezan, cash wallet, etc. Track balances and move money between them.
        </p>
      ) : (
        <div className="space-y-2">
          {accounts.map(a => (
            <div key={a.id} className="card px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-raised border border-base flex items-center justify-center shrink-0">
                  {a.type === 'cash' ? <Banknote size={16} className="text-muted" /> : <Building2 size={16} className="text-muted" />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-primary truncate">{a.name}</p>
                  <p className="text-[11px] text-muted capitalize">{a.type}{a.notes ? ` · ${a.notes}` : ''}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <p className="text-sm font-bold tabular-nums text-primary">{formatCurrency(a.balance)}</p>
                <button type="button" onClick={() => setDeleteId(a.id)} className="p-1.5 text-muted hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {transfers.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted mb-2">Recent movements</h3>
          <div className="space-y-1.5">
            {transfers.map(t => (
              <div key={t.id} className="text-xs text-secondary flex justify-between gap-2 py-1.5 border-b border-subtle last:border-0">
                <span className="truncate">
                  {labelMovement(t.kind, t.fromAccountId, t.toAccountId, accounts)}
                  {t.note ? ` — ${t.note}` : ''}
                </span>
                <span className="shrink-0 tabular-nums text-primary">
                  {formatCurrency(t.amount)} · {formatDate(t.date)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAdd && (
        <AddAccountModal
          onClose={() => setShowAdd(false)}
          onSave={d => {
            addAccount(d);
            toast(`${d.type === 'cash' ? 'Cash' : 'Bank'} account added`);
            setShowAdd(false);
          }}
        />
      )}

      {moveMode && (
        <MoveMoneyModal
          mode={moveMode}
          accounts={accounts}
          onClose={() => setMoveMode(null)}
          onSave={payload => {
            const ok = moveAccountMoney(payload);
            if (!ok) {
              toast('Could not complete — check balances', 'error');
              return;
            }
            toast(payload.kind === 'transfer' ? 'Transfer done' : payload.kind === 'deposit' ? 'Money added' : 'Withdrawn');
            setMoveMode(null);
          }}
        />
      )}

      {deleteId && (
        <ConfirmDialog
          title="Delete account?"
          message="This removes the account from your list. History of old transfers may still reference it."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => {
            deleteAccount(deleteId);
            setDeleteId(null);
            toast('Account removed', 'info');
          }}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card p-4 flex items-center gap-3">
      <div className="text-muted">{icon}</div>
      <div>
        <p className="text-[11px] text-muted">{label}</p>
        <p className="text-lg font-bold font-display text-primary tabular-nums">{value}</p>
      </div>
    </div>
  );
}

function accountName(id: string | null, list: FinanceAccount[]): string {
  if (!id) return '—';
  return list.find(a => a.id === id)?.name ?? 'Unknown';
}

function labelMovement(
  kind: string,
  from: string | null,
  to: string | null,
  list: FinanceAccount[],
): string {
  if (kind === 'transfer') return `${accountName(from, list)} → ${accountName(to, list)}`;
  if (kind === 'deposit') return `Deposit → ${accountName(to, list)}`;
  return `Withdraw ← ${accountName(from, list)}`;
}

function AddAccountModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: Omit<FinanceAccount, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<FinanceAccountType>('bank');
  const [balance, setBalance] = useState('0');
  const [notes, setNotes] = useState('');

  return (
    <Modal title="Add bank / cash" onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({
            name: name.trim(),
            type,
            balance: Number(balance) || 0,
            currency: DEFAULT_CURRENCY,
            notes: notes.trim(),
          });
        }}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <ModalBody>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. HBL, JazzCash, Wallet" className={FORM_INPUT} required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Type</label>
              <select value={type} onChange={e => setType(e.target.value as FinanceAccountType)} className={FORM_SELECT}>
                <option value="bank">Bank</option>
                <option value="cash">Cash</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Opening balance</label>
              <input type="number" step="0.01" min="0" value={balance} onChange={e => setBalance(e.target.value)} className={FORM_INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" className={FORM_INPUT} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm rounded-xl bg-[var(--accent)] text-[var(--bg-base)]">Save</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function MoveMoneyModal({
  mode,
  accounts,
  onClose,
  onSave,
}: {
  mode: 'deposit' | 'withdraw' | 'transfer';
  accounts: FinanceAccount[];
  onClose: () => void;
  onSave: (d: {
    kind: 'deposit' | 'withdraw' | 'transfer';
    fromAccountId?: string | null;
    toAccountId?: string | null;
    amount: number;
    note?: string;
    date?: string;
  }) => void;
}) {
  const [fromId, setFromId] = useState(accounts[0]?.id ?? '');
  const [toId, setToId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());

  const titles = { deposit: 'Add money', withdraw: 'Withdraw', transfer: 'Transfer between accounts' };

  return (
    <Modal title={titles[mode]} onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          const n = Number(amount);
          if (!(n > 0)) return;
          if (mode === 'deposit') onSave({ kind: 'deposit', toAccountId: toId, amount: n, note, date });
          else if (mode === 'withdraw') onSave({ kind: 'withdraw', fromAccountId: fromId, amount: n, note, date });
          else onSave({ kind: 'transfer', fromAccountId: fromId, toAccountId: toId, amount: n, note, date });
        }}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <ModalBody>
          <div className="space-y-3">
            {(mode === 'withdraw' || mode === 'transfer') && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">From *</label>
                <select value={fromId} onChange={e => setFromId(e.target.value)} className={FORM_SELECT} required>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>
                  ))}
                </select>
              </div>
            )}
            {(mode === 'deposit' || mode === 'transfer') && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">To *</label>
                <select value={toId} onChange={e => setToId(e.target.value)} className={FORM_SELECT} required>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Amount *</label>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={FORM_INPUT} required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)} className={FORM_INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Note</label>
              <input value={note} onChange={e => setNote(e.target.value)} placeholder="Optional" className={FORM_INPUT} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm rounded-xl bg-[var(--accent)] text-[var(--bg-base)]">Confirm</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
