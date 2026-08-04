'use client';

import { useMemo, useState } from 'react';
import {
  Plus, TrendingUp, TrendingDown, Trash2, Lock, Unlock, Building2, WalletCards,
} from 'lucide-react';
import { Trade, TradeMarket, TradeSide, TradingExchange } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { LineChart } from '@/components/ui/Charts';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY, DEFAULT_CURRENCY } from '@/lib/constants';
import { formatCurrency, formatDateTime, todayISO } from '@/lib/utils';
import {
  computeCumulativePnL, computeTradingStats, estimatePricePnL, tradeNotional, tradeRoe,
} from '@/lib/chart-data';

type ListFilter = 'all' | 'spot' | 'futures';

export default function TradingPage() {
  const {
    state, addTrade, updateTrade, deleteTrade,
    addExchange, deleteExchange, addExchangeFunds,
  } = useApp();
  const { toast } = useToastContext();
  const [showOpen, setShowOpen] = useState(false);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddExchange, setShowAddExchange] = useState(false);
  const [fundingExchange, setFundingExchange] = useState<TradingExchange | null>(null);
  const [deleteExchangeId, setDeleteExchangeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ListFilter>('all');

  const exchanges = state.exchanges ?? [];
  const totalOnExchange = exchanges.reduce((s, e) => s + e.balance, 0);
  const pnlData = computeCumulativePnL(state.trades);
  const stats = computeTradingStats(state.trades);

  const matchFilter = (t: Trade) => {
    if (filter === 'all') return true;
    return (t.market ?? 'spot') === filter;
  };

  const openTrades = state.trades.filter(t => t.status === 'open' && matchFilter(t));
  const closedTrades = state.trades
    .filter(t => t.status === 'closed' && matchFilter(t))
    .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));
  const exchangeName = (id: string | null) =>
    id ? exchanges.find(e => e.id === id)?.name ?? '—' : null;

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader
          title="Trading Journal"
          subtitle="Spot & futures — margin, leverage, prices, and P&L"
          action={
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setShowAddExchange(true)} className="px-3 py-2 text-xs font-medium rounded-lg border border-base bg-raised text-secondary inline-flex items-center gap-1.5">
                <Building2 size={13} /> Add exchange
              </button>
              <button type="button" onClick={() => setShowOpen(true)} className={BTN_PRIMARY}>
                <Plus size={14} />Open Trade
              </button>
            </div>
          }
        />

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
              <WalletCards size={12} /> Exchange balances
            </h2>
            <p className="text-xs text-muted tabular-nums">Available {formatCurrency(totalOnExchange)}</p>
          </div>
          {exchanges.length === 0 ? (
            <div className="card p-4 text-sm text-muted">
              Add Binance, Bybit, etc., then fund them. Margin is locked from exchange on open.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {exchanges.map(ex => (
                <div key={ex.id} className="card p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-primary truncate">{ex.name}</p>
                    <p className="text-lg font-bold tabular-nums text-primary mt-0.5">{formatCurrency(ex.balance)}</p>
                    {ex.notes && <p className="text-[11px] text-muted mt-1 truncate">{ex.notes}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setFundingExchange(ex)}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[var(--accent)] text-[var(--bg-base)]"
                    >
                      + Add money
                    </button>
                    <button type="button" onClick={() => setDeleteExchangeId(ex.id)} className="p-1 text-muted hover:text-red-400 self-end">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-surface border border-base rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-1">Cumulative P&L</h2>
          <p className="text-xs text-muted mb-4">After each closed trade</p>
          <LineChart data={pnlData} height={220} />
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard label="Total P&L" value={formatCurrency(stats.totalPnL)} color={stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'} />
          <StatCard label="Win Rate" value={`${stats.winRate}%`} sub={`${stats.wins}W / ${stats.losses}L`} />
          <StatCard label="Open" value={String(stats.openCount)} sub={`${stats.futureOpen}F · ${stats.spotOpen}S`} />
          <StatCard label="Margin in use" value={formatCurrency(stats.openMargin)} />
          <StatCard label="Avg leverage" value={stats.avgLeverage ? `${stats.avgLeverage}x` : '—'} />
          <StatCard label="Fees paid" value={formatCurrency(stats.totalFees)} />
        </div>

        <div className="flex flex-wrap gap-1.5 mb-4">
          {([
            ['all', 'All'],
            ['futures', 'Futures'],
            ['spot', 'Spot'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                filter === id ? 'bg-raised text-primary border-base' : 'border-transparent text-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {openTrades.length > 0 && (
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
              <Unlock size={12} /> Open Positions ({openTrades.length})
            </h2>
            <div className="space-y-2">
              {openTrades.map(trade => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  exchangeLabel={exchangeName(trade.exchangeId)}
                  onClose={() => setClosingTrade(trade)}
                  onDelete={() => setDeletingId(trade.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <h2 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3 flex items-center gap-2">
            <Lock size={12} /> Trade History
          </h2>
          {closedTrades.length === 0 && openTrades.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No trades yet"
              description="Open a futures or spot trade with margin, leverage, and entry."
              action={<button onClick={() => setShowOpen(true)} className={BTN_PRIMARY}>Open first trade</button>}
            />
          ) : closedTrades.length === 0 ? (
            <p className="text-sm text-muted">No closed trades in this filter.</p>
          ) : (
            <div className="space-y-2">
              {closedTrades.map(trade => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  exchangeLabel={exchangeName(trade.exchangeId)}
                  onDelete={() => setDeletingId(trade.id)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {showOpen && (
        <OpenTradeModal
          exchanges={exchanges}
          onClose={() => setShowOpen(false)}
          onSave={d => {
            const margin = d.margin;
            if (d.exchangeId) {
              const ex = exchanges.find(e => e.id === d.exchangeId);
              if (ex && ex.balance < margin) {
                toast('Not enough free balance for this margin — add money first', 'error');
                return;
              }
            }
            addTrade({ ...d, status: 'open', closedAt: null, profitLoss: null, exitPrice: null, investedAmount: margin });
            toast(d.market === 'futures' ? 'Futures position opened' : 'Spot trade opened');
            setShowOpen(false);
          }}
        />
      )}

      {closingTrade && (
        <CloseTradeModal
          trade={closingTrade}
          onClose={() => setClosingTrade(null)}
          onSave={d => {
            updateTrade(closingTrade.id, { ...d, status: 'closed' });
            toast(d.profitLoss! >= 0 ? 'Closed — profit' : 'Closed — loss recorded');
            setClosingTrade(null);
          }}
        />
      )}

      {deletingId && (
        <ConfirmDialog title="Delete trade?" message="Open trades refund locked margin to the exchange." onConfirm={() => { deleteTrade(deletingId); setDeletingId(null); toast('Deleted', 'info'); }} onCancel={() => setDeletingId(null)} />
      )}

      {showAddExchange && (
        <AddExchangeModal
          onClose={() => setShowAddExchange(false)}
          onSave={d => {
            addExchange(d);
            toast('Exchange added');
            setShowAddExchange(false);
          }}
        />
      )}

      {fundingExchange && (
        <AddFundsModal
          exchange={fundingExchange}
          onClose={() => setFundingExchange(null)}
          onSave={d => {
            addExchangeFunds({ exchangeId: fundingExchange.id, ...d });
            toast('Funds added');
            setFundingExchange(null);
          }}
        />
      )}

      {deleteExchangeId && (
        <ConfirmDialog
          title="Delete exchange?"
          message="Trades keep their history but lose the exchange link."
          confirmLabel="Delete"
          variant="danger"
          onConfirm={() => {
            deleteExchange(deleteExchangeId);
            setDeleteExchangeId(null);
            toast('Exchange removed', 'info');
          }}
          onCancel={() => setDeleteExchangeId(null)}
        />
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

function TradeRow({
  trade, exchangeLabel, onClose, onDelete,
}: {
  trade: Trade;
  exchangeLabel: string | null;
  onClose?: () => void;
  onDelete: () => void;
}) {
  const isOpen = trade.status === 'open';
  const pnl = trade.profitLoss;
  const roe = tradeRoe(trade);
  const notional = tradeNotional(trade);
  const margin = trade.margin ?? trade.investedAmount;
  const market = trade.market ?? 'spot';
  const side = trade.side ?? 'long';

  return (
    <div className="bg-surface border border-base rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-primary">{trade.pair}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase ${
              market === 'futures' ? 'bg-violet-500/10 text-violet-300' : 'bg-sky-500/10 text-sky-300'
            }`}>
              {market}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase ${
              side === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
              {side}
            </span>
            {market === 'futures' && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-raised border border-base text-secondary">
                {trade.leverage || 1}x
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-md ${isOpen ? 'bg-amber-500/10 text-amber-400' : 'bg-slate-500/10 text-muted'}`}>
              {isOpen ? 'OPEN' : 'CLOSED'}
            </span>
            {exchangeLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-raised border border-base text-secondary">
                {exchangeLabel}
              </span>
            )}
          </div>
          <p className="text-xs text-muted mt-1.5">
            Margin {formatCurrency(margin)}
            {market === 'futures' && <> · Notional ~{formatCurrency(notional)}</>}
            {trade.entryPrice != null && <> · Entry {trade.entryPrice}</>}
            {trade.exitPrice != null && <> · Exit {trade.exitPrice}</>}
            {trade.quantity != null && <> · Qty {trade.quantity}</>}
          </p>
          {(trade.stopLoss != null || trade.takeProfit != null || (trade.fees ?? 0) > 0) && (
            <p className="text-[11px] text-muted mt-0.5">
              {trade.stopLoss != null && <>SL {trade.stopLoss} </>}
              {trade.takeProfit != null && <>TP {trade.takeProfit} </>}
              {(trade.fees ?? 0) > 0 && <>Fees {formatCurrency(trade.fees)}</>}
            </p>
          )}
          <p className="text-[11px] text-muted mt-0.5">
            Opened {formatDateTime(trade.openedAt)}
            {!isOpen && trade.closedAt && <> · Closed {formatDateTime(trade.closedAt)}</>}
          </p>
          {trade.notes && <p className="text-xs text-secondary mt-2 italic">&ldquo;{trade.notes}&rdquo;</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isOpen && pnl !== null && (
            <div className="text-right">
              <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {pnl >= 0 ? '+' : ''}{formatCurrency(pnl)}
              </div>
              {roe != null && (
                <p className={`text-[10px] tabular-nums ${roe >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
                  ROE {roe >= 0 ? '+' : ''}{roe}%
                </p>
              )}
            </div>
          )}
          {isOpen && onClose && (
            <button onClick={onClose} className="px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--accent)] text-[var(--bg-base)]">Close</button>
          )}
          <button onClick={onDelete} className="p-1.5 text-muted hover:text-red-400 rounded-lg"><Trash2 size={13} /></button>
        </div>
      </div>
    </div>
  );
}

function OpenTradeModal({
  exchanges,
  onClose,
  onSave,
}: {
  exchanges: TradingExchange[];
  onClose: () => void;
  onSave: (d: Omit<Trade, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'closedAt' | 'profitLoss' | 'exitPrice' | 'investedAmount'> & { margin: number }) => void;
}) {
  const [pair, setPair] = useState('');
  const [market, setMarket] = useState<TradeMarket>('futures');
  const [side, setSide] = useState<TradeSide>('long');
  const [margin, setMargin] = useState('');
  const [leverage, setLeverage] = useState('10');
  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [fees, setFees] = useState('0');
  const [exchangeId, setExchangeId] = useState(exchanges[0]?.id ?? '');
  const [openedAt, setOpenedAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState('');

  const lev = market === 'futures' ? Math.max(1, Number(leverage) || 1) : 1;
  const marginN = Number(margin) || 0;
  const notional = marginN * lev;

  return (
    <Modal title="Open trade" onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault();
        if (!pair.trim() || !margin || Number(margin) <= 0) return;
        const m = Number(margin);
        onSave({
          pair: pair.trim().toUpperCase(),
          market,
          side,
          margin: m,
          leverage: market === 'futures' ? Math.max(1, Number(leverage) || 1) : 1,
          currency: DEFAULT_CURRENCY,
          exchangeId: exchangeId || null,
          entryPrice: entryPrice ? Number(entryPrice) : null,
          quantity: quantity ? Number(quantity) : null,
          stopLoss: stopLoss ? Number(stopLoss) : null,
          takeProfit: takeProfit ? Number(takeProfit) : null,
          fees: Number(fees) || 0,
          openedAt: new Date(openedAt).toISOString(),
          notes: notes.trim(),
        });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Market *</label>
                <select value={market} onChange={e => setMarket(e.target.value as TradeMarket)} className={FORM_SELECT}>
                  <option value="futures">Futures</option>
                  <option value="spot">Spot</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Side *</label>
                <select value={side} onChange={e => setSide(e.target.value as TradeSide)} className={FORM_SELECT}>
                  <option value="long">Long / Buy</option>
                  <option value="short">Short / Sell</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Pair *</label>
              <input value={pair} onChange={e => setPair(e.target.value)} placeholder="BTCUSDT, ETHUSDT…" className={FORM_INPUT} required autoFocus />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Exchange</label>
              <select value={exchangeId} onChange={e => setExchangeId(e.target.value)} className={FORM_SELECT}>
                <option value="">None (manual only)</option>
                {exchanges.map(ex => (
                  <option key={ex.id} value={ex.id}>{ex.name} · free {formatCurrency(ex.balance)}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  {market === 'futures' ? 'Margin (PKR) *' : 'Amount (PKR) *'}
                </label>
                <input type="number" step="0.01" min="0" value={margin} onChange={e => setMargin(e.target.value)} className={FORM_INPUT} required />
                <p className="text-[10px] text-muted mt-1">Locked from exchange balance</p>
              </div>
              {market === 'futures' ? (
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Leverage *</label>
                  <input type="number" step="1" min="1" max="200" value={leverage} onChange={e => setLeverage(e.target.value)} className={FORM_INPUT} required />
                  <p className="text-[10px] text-muted mt-1">Notional ~{formatCurrency(notional)}</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Entry price</label>
                  <input type="number" step="any" min="0" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className={FORM_INPUT} placeholder="Optional" />
                </div>
              )}
            </div>

            {market === 'futures' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Entry price</label>
                  <input type="number" step="any" min="0" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className={FORM_INPUT} placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Quantity / size</label>
                  <input type="number" step="any" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className={FORM_INPUT} placeholder="Coins / contracts" />
                </div>
              </div>
            )}

            {market === 'spot' && (
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Quantity</label>
                <input type="number" step="any" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className={FORM_INPUT} placeholder="Optional" />
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Stop loss</label>
                <input type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className={FORM_INPUT} placeholder="—" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Take profit</label>
                <input type="number" step="any" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className={FORM_INPUT} placeholder="—" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Fees</label>
                <input type="number" step="0.01" min="0" value={fees} onChange={e => setFees(e.target.value)} className={FORM_INPUT} />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Entry time *</label>
              <input type="datetime-local" value={openedAt} onChange={e => setOpenedAt(e.target.value)} className={FORM_INPUT} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Setup, reason…" className={FORM_INPUT} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm rounded-xl bg-[var(--accent)] text-[var(--bg-base)]">Open</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function CloseTradeModal({
  trade,
  onClose,
  onSave,
}: {
  trade: Trade;
  onClose: () => void;
  onSave: (d: { closedAt: string; profitLoss: number; notes: string; exitPrice: number | null; fees: number }) => void;
}) {
  const [profitLoss, setProfitLoss] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [fees, setFees] = useState(String(trade.fees || 0));
  const [closedAt, setClosedAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState(trade.notes || '');

  const margin = trade.margin ?? trade.investedAmount;

  const suggested = useMemo(() => {
    if (!exitPrice || trade.entryPrice == null || trade.quantity == null) return null;
    return estimatePricePnL({
      side: trade.side ?? 'long',
      entryPrice: trade.entryPrice,
      exitPrice: Number(exitPrice),
      quantity: trade.quantity,
      fees: Number(fees) || 0,
    });
  }, [exitPrice, fees, trade]);

  return (
    <Modal title={`Close ${trade.pair}`} onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault();
        if (profitLoss === '') return;
        onSave({
          closedAt: new Date(closedAt).toISOString(),
          profitLoss: Number(profitLoss),
          notes: notes.trim(),
          exitPrice: exitPrice ? Number(exitPrice) : null,
          fees: Number(fees) || 0,
        });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <div className="text-xs text-muted mb-4 space-y-0.5">
            <p>
              {(trade.market ?? 'spot').toUpperCase()} · {(trade.side ?? 'long').toUpperCase()}
              {(trade.market === 'futures') && ` · ${trade.leverage || 1}x`}
              {' · '}Margin {formatCurrency(margin)}
            </p>
            <p>
              {trade.entryPrice != null && <>Entry {trade.entryPrice} · </>}
              Opened {formatDateTime(trade.openedAt)}
            </p>
            <p>On close, margin + P&amp;L returns to the exchange (if linked).</p>
          </div>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Exit price</label>
                <input type="number" step="any" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className={FORM_INPUT} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Total fees</label>
                <input type="number" step="0.01" min="0" value={fees} onChange={e => setFees(e.target.value)} className={FORM_INPUT} />
              </div>
            </div>
            {suggested != null && Number.isFinite(suggested) && (
              <button
                type="button"
                onClick={() => setProfitLoss(String(Math.round(suggested * 100) / 100))}
                className="text-[11px] text-accent underline"
              >
                Use price P&L estimate: {formatCurrency(suggested)}
                {margin > 0 && ` (ROE ${Math.round((suggested / margin) * 1000) / 10}%)`}
              </button>
            )}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Profit / Loss (PKR) *</label>
              <p className="text-[10px] text-muted mb-1">Net P&L after fees. Negative for loss.</p>
              <input type="number" step="0.01" value={profitLoss} onChange={e => setProfitLoss(e.target.value)} placeholder="50 or -30" className={FORM_INPUT} required autoFocus />
              {profitLoss !== '' && margin > 0 && (
                <p className="text-[11px] text-muted mt-1">
                  ROE {Math.round((Number(profitLoss) / margin) * 1000) / 10}% on margin
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Close time *</label>
              <input type="datetime-local" value={closedAt} onChange={e => setClosedAt(e.target.value)} className={FORM_INPUT} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Notes / lesson</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className={`${FORM_INPUT} resize-none`} />
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <button type="button" onClick={onClose} className="flex-1 py-2 text-sm text-secondary bg-raised border border-base rounded-xl">Cancel</button>
          <button type="submit" className="flex-1 py-2 text-sm rounded-xl bg-[var(--accent)] text-[var(--bg-base)]">Close trade</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}

function AddExchangeModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (d: Omit<TradingExchange, 'id' | 'createdAt' | 'updatedAt'>) => void;
}) {
  const [name, setName] = useState('');
  const [balance, setBalance] = useState('0');
  const [notes, setNotes] = useState('');

  return (
    <Modal title="Add exchange" onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!name.trim()) return;
          onSave({
            name: name.trim(),
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
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Binance Futures, Bybit…" className={FORM_INPUT} required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Starting balance</label>
              <input type="number" step="0.01" min="0" value={balance} onChange={e => setBalance(e.target.value)} className={FORM_INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className={FORM_INPUT} />
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

function AddFundsModal({
  exchange,
  onClose,
  onSave,
}: {
  exchange: TradingExchange;
  onClose: () => void;
  onSave: (d: { amount: number; source: string; note: string; date: string }) => void;
}) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('external');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());

  return (
    <Modal title={`Add money · ${exchange.name}`} onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          const n = Number(amount);
          if (!(n > 0)) return;
          onSave({ amount: n, source, note: note.trim(), date });
        }}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <ModalBody>
          <p className="text-xs text-muted mb-3">Free balance {formatCurrency(exchange.balance)}</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Amount *</label>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={FORM_INPUT} required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Source</label>
              <select value={source} onChange={e => setSource(e.target.value)} className={FORM_SELECT}>
                <option value="external">External / bank transfer</option>
                <option value="funding">Funding / promotion</option>
                <option value="deposit">Deposit</option>
                <option value="other">Other</option>
              </select>
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
          <button type="submit" className="flex-1 py-2 text-sm rounded-xl bg-[var(--accent)] text-[var(--bg-base)]">Add money</button>
        </ModalFooter>
      </form>
    </Modal>
  );
}
