'use client';

import { useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Edit2, Trash2, Lock, Unlock } from 'lucide-react';
import { Trade } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { LineChart } from '@/components/ui/Charts';
import { FORM_INPUT, BTN_PRIMARY, DEFAULT_CURRENCY } from '@/lib/constants';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { computeCumulativePnL, computeTradingStats } from '@/lib/chart-data';

export default function TradingPage() {
  const { state, addTrade, updateTrade, deleteTrade } = useApp();
  const { toast } = useToastContext();
  const [showOpen, setShowOpen] = useState(false);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const pnlData = computeCumulativePnL(state.trades);
  const stats = computeTradingStats(state.trades);
  const openTrades = state.trades.filter(t => t.status === 'open');
  const closedTrades = state.trades.filter(t => t.status === 'closed').sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader
          title="Trading Journal"
          subtitle="Track every trade — pair, entry, exit, P&L, and lessons"
          action={
            <button onClick={() => setShowOpen(true)} className={BTN_PRIMARY}>
              <Plus size={14} />Open Trade
            </button>
          }
        />

        {/* P&L Progress Chart */}
        <section className="bg-surface border border-base rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-1">Cumulative P&L Progress</h2>
          <p className="text-xs text-muted mb-4">Running total after each closed trade</p>
          <LineChart data={pnlData} height={220} />
        </section>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label="Total P&L" value={formatCurrency(stats.totalPnL)} color={stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <StatCard label="Win Rate" value={`${stats.winRate}%`} sub={`${stats.wins}W / ${stats.losses}L`} />
          <StatCard label="Open Trades" value={String(stats.openCount)} />
          <StatCard label="Closed Trades" value={String(stats.closedCount)} />
        </div>

        {/* Open trades */}
        {openTrades.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Unlock size={12} /> Open Positions ({openTrades.length})
            </h2>
            <div className="space-y-2">
              {openTrades.map(trade => (
                <TradeRow key={trade.id} trade={trade}
                  onClose={() => setClosingTrade(trade)}
                  onDelete={() => setDeletingId(trade.id)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Closed trades */}
        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Lock size={12} /> Trade History
          </h2>
          {closedTrades.length === 0 && openTrades.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No trades yet"
              description="Log your first trade — coin/pair, amount invested, and entry time."
              action={<button onClick={() => setShowOpen(true)} className={BTN_PRIMARY}>Open first trade</button>}
            />
          ) : closedTrades.length === 0 ? (
            <p className="text-sm text-muted">No closed trades yet.</p>
          ) : (
            <div className="space-y-2">
              {closedTrades.map(trade => (
                <TradeRow key={trade.id} trade={trade} onDelete={() => setDeletingId(trade.id)} />
              ))}
            </div>
          )}
        </section>
      </div>

      {showOpen && (
        <OpenTradeModal onClose={() => setShowOpen(false)} onSave={d => {
          addTrade({ ...d, status: 'open', closedAt: null, profitLoss: null });
          toast('Trade opened');
          setShowOpen(false);
        }} />
      )}

      {closingTrade && (
        <CloseTradeModal trade={closingTrade} onClose={() => setClosingTrade(null)} onSave={d => {
          updateTrade(closingTrade.id, { ...d, status: 'closed' });
          toast(d.profitLoss! >= 0 ? 'Trade closed — profit!' : 'Trade closed — loss recorded');
          setClosingTrade(null);
        }} />
      )}

      {deletingId && (
        <ConfirmDialog title="Delete trade?" message="This cannot be undone." onConfirm={() => { deleteTrade(deletingId); setDeletingId(null); toast('Deleted', 'info'); }} onCancel={() => setDeletingId(null)} />
      )}
    </>
  );
}

function StatCard({ label, value, sub, color = 'text-primary' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div className="bg-surface border border-base rounded-xl p-4">
      <p className="text-[10px] text-muted uppercase mb-1">{label}</p>
      <p className={`text-lg font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function TradeRow({ trade, onClose, onDelete }: { trade: Trade; onClose?: () => void; onDelete: () => void }) {
  const isOpen = trade.status === 'open';
  const pnl = trade.profitLoss;
  return (
    <div className="bg-surface border border-base rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-primary">{trade.pair}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md ${isOpen ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-muted'}`}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </span>
          </div>
          <p className="text-xs text-muted mt-1">
            Invested {formatCurrency(trade.investedAmount)} · Opened {formatDateTime(trade.openedAt)}
          </p>
          {!isOpen && trade.closedAt && (
            <p className="text-xs text-muted">Closed {formatDateTime(trade.closedAt)}</p>
          )}
          {trade.notes && <p className="text-xs text-secondary mt-2 italic">&ldquo;{trade.notes}&rdquo;</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isOpen && pnl !== null && (
            <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
            </div>
          )}
          {isOpen && onClose && (
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg">Close Trade</button>
          )}
          <button onClick={onDelete} className="p-1.5 text-muted hover:text-red-400 rounded-lg"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

function OpenTradeModal({ onClose, onSave }: { onClose: () => void; onSave: (d: Omit<Trade, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'closedAt' | 'profitLoss'>) => void }) {
  const [pair, setPair] = useState('');
  const [investedAmount, setInvestedAmount] = useState('');
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 16));

  return (
    <Modal title="Open Trade" onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault();
        if (!pair.trim() || !investedAmount) return;
        onSave({
          pair: pair.trim().toUpperCase(),
          investedAmount: Number(investedAmount),
          currency: DEFAULT_CURRENCY,
          openedAt: new Date(openedAt).toISOString(),
          notes: '',
        });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Coin / Pair *</label>
              <input value={pair} onChange={e => setPair(e.target.value)} placeholder="e.g. BTC/USDT, EUR/USD" className={FORM_INPUT} required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Amount Invested (PKR) *</label>
              <input type="number" step="0.01" min="0" value={investedAmount} onChange={e => setInvestedAmount(e.target.value)} placeholder="500" className={FORM_INPUT} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Entry Time *</label>
              <input type="datetime-local" value={openedAt} onChange={e => setOpenedAt(e.target.value)} className={FORM_INPUT} required />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-xl">Open Trade</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function CloseTradeModal({ trade, onClose, onSave }: { trade: Trade; onClose: () => void; onSave: (d: { closedAt: string; profitLoss: number; notes: string }) => void }) {
  const [profitLoss, setProfitLoss] = useState('');
  const [closedAt, setClosedAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');

  return (
    <Modal title={`Close ${trade.pair}`} onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault();
        if (profitLoss === '') return;
        onSave({
          closedAt: new Date(closedAt).toISOString(),
          profitLoss: Number(profitLoss),
          notes: notes.trim(),
        });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <p className="text-xs text-muted mb-4">Invested {formatCurrency(trade.investedAmount)} · Opened {formatDateTime(trade.openedAt)}</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Profit / Loss (PKR) *</label>
              <p className="text-[10px] text-muted mb-1">Use negative for loss (e.g. -25.50)</p>
              <input type="number" step="0.01" value={profitLoss} onChange={e => setProfitLoss(e.target.value)} placeholder="50 or -30" className={FORM_INPUT} required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Close Time *</label>
              <input type="datetime-local" value={closedAt} onChange={e => setClosedAt(e.target.value)} className={FORM_INPUT} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">What did you learn? (optional)</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Lesson from this trade…" rows={3} className={`${FORM_INPUT} resize-none`} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm text-white bg-indigo-600 rounded-xl">Close Trade</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
