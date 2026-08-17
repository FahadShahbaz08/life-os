'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Plus, TrendingUp, TrendingDown, Trash2, Lock, Unlock, Building2, WalletCards, RefreshCw,
  FlaskConical,
} from 'lucide-react';
import { Trade, TradeMarket, TradeSide, TradingExchange } from '@/types';
import { useApp } from '@/context/AppContext';
import { useToastContext } from '@/context/ToastContext';
import PageHeader from '@/components/ui/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import Modal, { ModalBody, ModalFooter } from '@/components/ui/Modal';
import { LineChart } from '@/components/ui/Charts';
import { FORM_INPUT, FORM_SELECT, BTN_PRIMARY } from '@/lib/constants';
import { formatDateTime, todayISO } from '@/lib/utils';
import {
  estimatePricePnL, tradeNotional, tradeRoe,
} from '@/lib/chart-data';
import {
  QuoteCurrency,
  convertQuote,
  formatTradingMoney,
  loadUsdtPkrRate,
  normalizeQuote,
  otherQuote,
  type UsdtRateSnapshot,
} from '@/lib/trading-currency';
import TestTradePanel from '@/components/trading/TestTradePanel';
import TradeHistoryPanel from '@/components/trading/TradeHistoryPanel';

type ListFilter = 'all' | 'spot' | 'futures';
type PageTab = 'journal' | 'test' | 'history';

type Fx = {
  display: QuoteCurrency;
  rate: number;
  toDisplay: (amount: number, from?: string | null) => number;
  fmt: (amount: number, from?: string | null) => string;
  dual: (amount: number, from?: string | null) => { main: string; alt: string };
};

function useFx(display: QuoteCurrency, pkrPerUsdt: number): Fx {
  return useMemo(() => {
    const toDisplay = (amount: number, from?: string | null) =>
      convertQuote(amount, normalizeQuote(from), display, pkrPerUsdt);
    const fmt = (amount: number, from?: string | null) =>
      formatTradingMoney(toDisplay(amount, from), display);
    const dual = (amount: number, from?: string | null) => {
      const src = normalizeQuote(from);
      const mainAmt = convertQuote(amount, src, display, pkrPerUsdt);
      const altC = otherQuote(display);
      const altAmt = convertQuote(amount, src, altC, pkrPerUsdt);
      return {
        main: formatTradingMoney(mainAmt, display),
        alt: formatTradingMoney(altAmt, altC),
      };
    };
    return { display, rate: pkrPerUsdt, toDisplay, fmt, dual };
  }, [display, pkrPerUsdt]);
}

export default function TradingPage() {
  const {
    state, addTrade, updateTrade, deleteTrade,
    addExchange, deleteExchange, addExchangeFunds, updateSettings,
  } = useApp();
  const { toast } = useToastContext();
  const [showOpen, setShowOpen] = useState(false);
  const [closingTrade, setClosingTrade] = useState<Trade | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAddExchange, setShowAddExchange] = useState(false);
  const [fundingExchange, setFundingExchange] = useState<TradingExchange | null>(null);
  const [deleteExchangeId, setDeleteExchangeId] = useState<string | null>(null);
  const [filter, setFilter] = useState<ListFilter>('all');
  const [tab, setTab] = useState<PageTab>('journal');
  const [rateSnap, setRateSnap] = useState<UsdtRateSnapshot | null>(null);
  const [rateLoading, setRateLoading] = useState(true);

  const display = (state.settings.tradingDisplayCurrency === 'USDT' ? 'USDT' : 'PKR') as QuoteCurrency;
  const rate = rateSnap?.pkrPerUsdt ?? 280;
  const fx = useFx(display, rate);

  const refreshRate = useCallback(async (force = false) => {
    setRateLoading(true);
    try {
      const snap = await loadUsdtPkrRate(force);
      setRateSnap(snap);
    } finally {
      setRateLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshRate(false);
  }, [refreshRate]);

  const setDisplay = (c: QuoteCurrency) => {
    updateSettings({ tradingDisplayCurrency: c });
  };

  const exchanges = state.exchanges ?? [];
  const matchFilter = (t: Trade) => filter === 'all' || (t.market ?? 'spot') === filter;

  const totalExchangeDisplay = exchanges.reduce(
    (s, e) => s + fx.toDisplay(e.balance, e.currency),
    0,
  );
  const totalExchangeAlt = convertQuote(totalExchangeDisplay, display, otherQuote(display), rate);

  const closedForStats = state.trades.filter(t => t.status === 'closed' && t.profitLoss != null);
  const openAll = state.trades.filter(t => t.status === 'open');
  const totalPnL = closedForStats.reduce((s, t) => s + fx.toDisplay(t.profitLoss ?? 0, t.currency), 0);
  const wins = closedForStats.filter(t => (t.profitLoss ?? 0) > 0).length;
  const losses = closedForStats.filter(t => (t.profitLoss ?? 0) < 0).length;
  const winRate = closedForStats.length ? Math.round((wins / closedForStats.length) * 100) : 0;
  const openMargin = openAll.reduce((s, t) => s + fx.toDisplay(t.margin ?? t.investedAmount, t.currency), 0);
  const futureOpen = openAll.filter(t => t.market === 'futures').length;
  const spotOpen = openAll.filter(t => (t.market ?? 'spot') === 'spot').length;
  const avgLeverage = (() => {
    const fut = state.trades.filter(t => t.market === 'futures');
    if (!fut.length) return 0;
    return Math.round((fut.reduce((s, t) => s + (t.leverage || 1), 0) / fut.length) * 10) / 10;
  })();
  const totalFees = state.trades.reduce((s, t) => s + fx.toDisplay(t.fees || 0, t.currency), 0);

  const pnlChart = useMemo(() => {
    const closed = state.trades
      .filter(t => t.status === 'closed' && t.profitLoss != null && t.closedAt)
      .sort((a, b) => a.closedAt!.localeCompare(b.closedAt!));
    let cum = 0;
    return closed.map(t => {
      cum += fx.toDisplay(t.profitLoss!, t.currency);
      return { label: t.closedAt!.slice(5, 10), value: cum };
    });
  }, [state.trades, fx]);

  const openTrades = state.trades.filter(t => t.status === 'open' && matchFilter(t));
  const closedTrades = state.trades
    .filter(t => t.status === 'closed' && matchFilter(t))
    .sort((a, b) => (b.closedAt ?? '').localeCompare(a.closedAt ?? ''));
  const exchangeName = (id: string | null) =>
    id ? exchanges.find(e => e.id === id)?.name ?? '—' : null;

  const alt = otherQuote(display);

  return (
    <>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 pb-8">
        <PageHeader
          title="Trading Journal"
          subtitle="Spot & futures — test setups, journal opens, keep closed-trade history"
          action={
            <div className="flex flex-wrap gap-2 items-center">
              <div className="flex rounded-lg border border-base overflow-hidden">
                {(['PKR', 'USDT'] as QuoteCurrency[]).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setDisplay(c)}
                    className={`px-3 py-1.5 text-xs font-semibold ${
                      display === c ? 'bg-[var(--accent)] text-[var(--bg-base)]' : 'bg-raised text-secondary'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              {tab === 'journal' && (
                <>
                  <button type="button" onClick={() => setShowAddExchange(true)} className="px-3 py-2 text-xs font-medium rounded-lg border border-base bg-raised text-secondary inline-flex items-center gap-1.5">
                    <Building2 size={13} /> Add exchange
                  </button>
                  <button type="button" onClick={() => setShowOpen(true)} className={BTN_PRIMARY}>
                    <Plus size={14} />Open Trade
                  </button>
                </>
              )}
            </div>
          }
        />

        <div
          role="tablist"
          className="flex w-full p-1 mb-5 rounded-xl bg-raised border border-base gap-1"
        >
          {([
            { id: 'journal' as const, label: 'Journal', icon: Unlock },
            { id: 'test' as const, label: 'Test Trade', icon: FlaskConical },
            { id: 'history' as const, label: 'History', icon: Lock },
          ]).map(t => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                tab === t.id
                  ? 'bg-surface text-primary shadow-sm border border-base'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Rate bar */}
        <div className="card px-4 py-3 mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary tabular-nums">
              1 USDT = {rateLoading && !rateSnap ? '…' : rate.toFixed(2)} PKR
            </p>
            <p className="text-[11px] text-muted">
              {rateSnap
                ? `Updated ${rateSnap.fetchedAt.slice(0, 10)} · ${rateSnap.source}${rateSnap.day === todayISO() ? ' · today' : ''}`
                : 'Loading market rate…'}
              {' · '}Viewing in {display} (entries save in {display})
            </p>
          </div>
          <button
            type="button"
            disabled={rateLoading}
            onClick={() => void refreshRate(true).then(() => toast('USDT rate refreshed'))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-base text-secondary hover:text-primary disabled:opacity-50"
          >
            <RefreshCw size={12} className={rateLoading ? 'animate-spin' : ''} />
            Refresh rate
          </button>
        </div>

        {tab === 'test' && (
          <TestTradePanel display={display} rate={rate} />
        )}

        {tab === 'history' && (
          <TradeHistoryPanel
            trades={state.trades}
            fx={fx}
            exchangeName={exchangeName}
            onDelete={id => setDeletingId(id)}
          />
        )}

        {tab === 'journal' && (
          <>
        {/* Totals dual */}
        <div className="card p-4 mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] text-muted uppercase tracking-wide">All exchange free balance</p>
            <p className="text-2xl font-bold font-display text-primary tabular-nums">
              {formatTradingMoney(totalExchangeDisplay, display)}
            </p>
            <p className="text-xs text-muted tabular-nums mt-0.5">
              ≈ {formatTradingMoney(totalExchangeAlt, alt)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted uppercase tracking-wide">Open margin locked</p>
            <p className="text-lg font-bold tabular-nums text-primary">{formatTradingMoney(openMargin, display)}</p>
            <p className="text-xs text-muted tabular-nums">
              ≈ {formatTradingMoney(convertQuote(openMargin, display, alt, rate), alt)}
            </p>
          </div>
        </div>

        <section className="mb-6">
          <div className="flex items-center justify-between mb-3 gap-2">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
              <WalletCards size={12} /> Exchange balances
            </h2>
          </div>
          {exchanges.length === 0 ? (
            <div className="card p-4 text-sm text-muted">
              Add Binance, Bybit, etc., then fund them in {display}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {exchanges.map(ex => {
                const d = fx.dual(ex.balance, ex.currency);
                return (
                  <div key={ex.id} className="card p-4 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary truncate">
                        {ex.name}
                        <span className="text-[10px] font-normal text-muted ml-1.5">({normalizeQuote(ex.currency)})</span>
                      </p>
                      <p className="text-lg font-bold tabular-nums text-primary mt-0.5">{d.main}</p>
                      <p className="text-[11px] text-muted tabular-nums">≈ {d.alt}</p>
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
                );
              })}
            </div>
          )}
        </section>

        <section className="bg-surface border border-base rounded-2xl p-5 mb-6">
          <h2 className="text-sm font-semibold text-primary mb-1">Cumulative P&amp;L ({display})</h2>
          <p className="text-xs text-muted mb-4">Converted with today’s USDT rate when needed</p>
          <LineChart data={pnlChart} height={220} />
        </section>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <StatCard
            label="Total P&L"
            value={formatTradingMoney(totalPnL, display)}
            sub={`≈ ${formatTradingMoney(convertQuote(totalPnL, display, alt, rate), alt)}`}
            color={totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
          <StatCard label="Win Rate" value={`${winRate}%`} sub={`${wins}W / ${losses}L`} />
          <StatCard label="Open" value={String(openAll.length)} sub={`${futureOpen}F · ${spotOpen}S`} />
          <StatCard
            label="Margin in use"
            value={formatTradingMoney(openMargin, display)}
            sub={`≈ ${formatTradingMoney(convertQuote(openMargin, display, alt, rate), alt)}`}
          />
          <StatCard label="Avg leverage" value={avgLeverage ? `${avgLeverage}x` : '—'} />
          <StatCard label="Fees" value={formatTradingMoney(totalFees, display)} />
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
                  fx={fx}
                  exchangeLabel={exchangeName(trade.exchangeId)}
                  onClose={() => setClosingTrade(trade)}
                  onDelete={() => setDeletingId(trade.id)}
                />
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-2">
              <Lock size={12} /> Recent closed
            </h2>
            {closedTrades.length > 0 && (
              <button type="button" onClick={() => setTab('history')} className="text-xs text-accent">
                Full history
              </button>
            )}
          </div>
          {closedTrades.length === 0 && openTrades.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No trades yet"
              description="Open a futures or spot trade. Amounts follow your PKR/USDT switch."
              action={<button onClick={() => setShowOpen(true)} className={BTN_PRIMARY}>Open first trade</button>}
            />
          ) : closedTrades.length === 0 ? (
            <p className="text-sm text-muted">No closed trades in this filter.</p>
          ) : (
            <div className="space-y-2">
              {closedTrades.slice(0, 5).map(trade => (
                <TradeRow
                  key={trade.id}
                  trade={trade}
                  fx={fx}
                  exchangeLabel={exchangeName(trade.exchangeId)}
                  onDelete={() => setDeletingId(trade.id)}
                />
              ))}
            </div>
          )}
        </section>
          </>
        )}
      </div>

      {showOpen && (
        <OpenTradeModal
          exchanges={exchanges}
          display={display}
          rate={rate}
          onClose={() => setShowOpen(false)}
          onSave={d => {
            if (d.exchangeId) {
              const ex = exchanges.find(e => e.id === d.exchangeId);
              const debit = d.exchangeDebitAmount ?? d.margin;
              if (ex && ex.balance < debit) {
                toast('Not enough free balance for this margin', 'error');
                return;
              }
            }
            addTrade({
              ...d,
              status: 'open',
              closedAt: null,
              profitLoss: null,
              exitPrice: null,
              investedAmount: d.margin,
              currency: display,
            });
            toast(d.market === 'futures' ? 'Futures opened' : 'Spot opened');
            setShowOpen(false);
          }}
        />
      )}

      {closingTrade && (
        <CloseTradeModal
          trade={closingTrade}
          display={display}
          rate={rate}
          onClose={() => setClosingTrade(null)}
          onSave={d => {
            const ex = exchanges.find(e => e.id === closingTrade.exchangeId);
            let exchangeCredit: number | undefined;
            if (closingTrade.exchangeId && ex) {
              const pnlInEx = convertQuote(
                d.profitLoss,
                normalizeQuote(closingTrade.currency),
                normalizeQuote(ex.currency),
                rate,
              );
              exchangeCredit = (closingTrade.exchangeDebitAmount ?? closingTrade.investedAmount) + pnlInEx;
            }
            updateTrade(
              closingTrade.id,
              {
                closedAt: d.closedAt,
                profitLoss: d.profitLoss,
                notes: d.notes,
                exitPrice: d.exitPrice,
                fees: d.fees,
                status: 'closed',
              },
              { exchangeCredit },
            );
            toast(d.profitLoss >= 0 ? 'Closed — profit' : 'Closed — loss');
            setClosingTrade(null);
          }}
        />
      )}

      {deletingId && (
        <ConfirmDialog title="Delete trade?" message="Open trades refund locked margin to the exchange." onConfirm={() => { deleteTrade(deletingId); setDeletingId(null); toast('Deleted', 'info'); }} onCancel={() => setDeletingId(null)} />
      )}

      {showAddExchange && (
        <AddExchangeModal
          display={display}
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
          display={display}
          rate={rate}
          onClose={() => setFundingExchange(null)}
          onSave={d => {
            const addAmount = convertQuote(d.amount, display, normalizeQuote(fundingExchange.currency), rate);
            // deposit in exchange native currency amount
            addExchangeFunds({
              exchangeId: fundingExchange.id,
              amount: addAmount,
              source: d.source,
              note: `${d.note}${d.note ? ' · ' : ''}${display} ${d.amount}`.trim(),
              date: d.date,
            });
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
      <p className={`text-sm sm:text-base font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted mt-0.5 tabular-nums">{sub}</p>}
    </div>
  );
}

function TradeRow({
  trade, fx, exchangeLabel, onClose, onDelete,
}: {
  trade: Trade;
  fx: Fx;
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
  const marginD = fx.dual(margin, trade.currency);
  const pnlD = pnl != null ? fx.dual(pnl, trade.currency) : null;

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
            Margin {marginD.main}
            <span className="text-muted/80"> (≈ {marginD.alt})</span>
            {market === 'futures' && <> · Notional ~{fx.fmt(notional, trade.currency)}</>}
            {trade.entryPrice != null && <> · Entry {trade.entryPrice}</>}
            {trade.exitPrice != null && <> · Exit {trade.exitPrice}</>}
            {trade.stopLoss != null && <> · SL {trade.stopLoss}</>}
            {trade.takeProfit != null && <> · TP {trade.takeProfit}</>}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            Opened {formatDateTime(trade.openedAt)}
            {!isOpen && trade.closedAt && <> · Closed {formatDateTime(trade.closedAt)}</>}
          </p>
          {trade.notes && <p className="text-xs text-secondary mt-2 italic">&ldquo;{trade.notes}&rdquo;</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isOpen && pnlD && (
            <div className="text-right">
              <div className={`flex items-center gap-1 text-sm font-bold tabular-nums ${(pnl ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(pnl ?? 0) >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {(pnl ?? 0) >= 0 ? '+' : ''}{pnlD.main}
              </div>
              <p className="text-[10px] text-muted tabular-nums">≈ {pnlD.alt}</p>
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
  display,
  rate,
  onClose,
  onSave,
}: {
  exchanges: TradingExchange[];
  display: QuoteCurrency;
  rate: number;
  onClose: () => void;
  onSave: (d: Omit<Trade, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'closedAt' | 'profitLoss' | 'exitPrice' | 'investedAmount' | 'currency'> & { margin: number; currency?: string }) => void;
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
  const ex = exchanges.find(e => e.id === exchangeId);
  const debitPreview = ex
    ? convertQuote(marginN, display, normalizeQuote(ex.currency), rate)
    : marginN;

  return (
    <Modal title={`Open trade (${display})`} onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault();
        if (!pair.trim() || !margin || Number(margin) <= 0) return;
        const m = Number(margin);
        const selected = exchanges.find(x => x.id === exchangeId);
        const exchangeDebitAmount = selected
          ? convertQuote(m, display, normalizeQuote(selected.currency), rate)
          : m;
        onSave({
          pair: pair.trim().toUpperCase(),
          market,
          side,
          margin: m,
          leverage: market === 'futures' ? Math.max(1, Number(leverage) || 1) : 1,
          exchangeId: exchangeId || null,
          exchangeDebitAmount: exchangeId ? exchangeDebitAmount : null,
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
              <input value={pair} onChange={e => setPair(e.target.value)} placeholder="BTCUSDT…" className={FORM_INPUT} required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Exchange</label>
              <select value={exchangeId} onChange={e => setExchangeId(e.target.value)} className={FORM_SELECT}>
                <option value="">None</option>
                {exchanges.map(x => (
                  <option key={x.id} value={x.id}>
                    {x.name} · free {formatTradingMoney(x.balance, normalizeQuote(x.currency))}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">
                  {market === 'futures' ? `Margin (${display}) *` : `Amount (${display}) *`}
                </label>
                <input type="number" step="0.01" min="0" value={margin} onChange={e => setMargin(e.target.value)} className={FORM_INPUT} required />
                {ex && normalizeQuote(ex.currency) !== display && marginN > 0 && (
                  <p className="text-[10px] text-muted mt-1">
                    Locks ≈ {formatTradingMoney(debitPreview, normalizeQuote(ex.currency))} on exchange
                  </p>
                )}
              </div>
              {market === 'futures' ? (
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Leverage *</label>
                  <input type="number" step="1" min="1" max="200" value={leverage} onChange={e => setLeverage(e.target.value)} className={FORM_INPUT} required />
                  <p className="text-[10px] text-muted mt-1">Notional ~{formatTradingMoney(notional, display)}</p>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Entry price</label>
                  <input type="number" step="any" min="0" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className={FORM_INPUT} />
                </div>
              )}
            </div>
            {market === 'futures' && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Entry price</label>
                  <input type="number" step="any" min="0" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} className={FORM_INPUT} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary mb-1.5">Quantity</label>
                  <input type="number" step="any" min="0" value={quantity} onChange={e => setQuantity(e.target.value)} className={FORM_INPUT} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">SL</label>
                <input type="number" step="any" value={stopLoss} onChange={e => setStopLoss(e.target.value)} className={FORM_INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">TP</label>
                <input type="number" step="any" value={takeProfit} onChange={e => setTakeProfit(e.target.value)} className={FORM_INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Fees ({display})</label>
                <input type="number" step="0.01" min="0" value={fees} onChange={e => setFees(e.target.value)} className={FORM_INPUT} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Entry time *</label>
              <input type="datetime-local" value={openedAt} onChange={e => setOpenedAt(e.target.value)} className={FORM_INPUT} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Notes</label>
              <input value={notes} onChange={e => setNotes(e.target.value)} className={FORM_INPUT} />
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
  display,
  rate,
  onClose,
  onSave,
}: {
  trade: Trade;
  display: QuoteCurrency;
  rate: number;
  onClose: () => void;
  onSave: (d: { closedAt: string; profitLoss: number; notes: string; exitPrice: number | null; fees: number }) => void;
}) {
  const [profitLoss, setProfitLoss] = useState('');
  const [exitPrice, setExitPrice] = useState('');
  const [fees, setFees] = useState(String(trade.fees || 0));
  const [closedAt, setClosedAt] = useState(new Date().toISOString().slice(0, 16));
  const [notes, setNotes] = useState(trade.notes || '');
  const margin = trade.margin ?? trade.investedAmount;
  const tradeC = normalizeQuote(trade.currency);

  // Form P&L in display currency → store in trade currency
  const suggested = useMemo(() => {
    if (!exitPrice || trade.entryPrice == null || trade.quantity == null) return null;
    return estimatePricePnL({
      side: trade.side ?? 'long',
      entryPrice: trade.entryPrice,
      exitPrice: Number(exitPrice),
      quantity: trade.quantity,
      fees: convertQuote(Number(fees) || 0, display, tradeC, rate),
    });
  }, [exitPrice, fees, trade, display, rate, tradeC]);

  return (
    <Modal title={`Close ${trade.pair}`} onClose={onClose}>
      <form onSubmit={e => {
        e.preventDefault();
        if (profitLoss === '') return;
        const pnlDisplay = Number(profitLoss);
        const pnlTrade = convertQuote(pnlDisplay, display, tradeC, rate);
        const feesTrade = convertQuote(Number(fees) || 0, display, tradeC, rate);
        onSave({
          closedAt: new Date(closedAt).toISOString(),
          profitLoss: pnlTrade,
          notes: notes.trim(),
          exitPrice: exitPrice ? Number(exitPrice) : null,
          fees: feesTrade,
        });
      }} className="flex flex-col flex-1 overflow-hidden">
        <ModalBody>
          <p className="text-xs text-muted mb-3">
            Margin {formatTradingMoney(convertQuote(margin, tradeC, display, rate), display)}
            {' · '}Entered in {tradeC}
          </p>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Exit price</label>
                <input type="number" step="any" value={exitPrice} onChange={e => setExitPrice(e.target.value)} className={FORM_INPUT} />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Fees ({display})</label>
                <input type="number" step="0.01" min="0" value={fees} onChange={e => setFees(e.target.value)} className={FORM_INPUT} />
              </div>
            </div>
            {suggested != null && Number.isFinite(suggested) && (
              <button
                type="button"
                className="text-[11px] text-accent underline"
                onClick={() => {
                  const asDisplay = convertQuote(suggested, tradeC, display, rate);
                  setProfitLoss(String(Math.round(asDisplay * 100) / 100));
                }}
              >
                Use price P&amp;L ≈ {formatTradingMoney(convertQuote(suggested, tradeC, display, rate), display)}
              </button>
            )}
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">P&amp;L ({display}) *</label>
              <input type="number" step="0.01" value={profitLoss} onChange={e => setProfitLoss(e.target.value)} className={FORM_INPUT} required autoFocus />
              {profitLoss !== '' && (
                <p className="text-[11px] text-muted mt-1">
                  ≈ {formatTradingMoney(convertQuote(Number(profitLoss), display, otherQuote(display), rate), otherQuote(display))}
                  {margin > 0 && (() => {
                    const m = convertQuote(margin, tradeC, display, rate);
                    return m > 0 ? ` · ROE ${Math.round((Number(profitLoss) / m) * 1000) / 10}%` : '';
                  })()}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Close time *</label>
              <input type="datetime-local" value={closedAt} onChange={e => setClosedAt(e.target.value)} className={FORM_INPUT} required />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={`${FORM_INPUT} resize-none`} />
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
  display,
  onClose,
  onSave,
}: {
  display: QuoteCurrency;
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
            currency: display,
            notes: notes.trim(),
          });
        }}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <ModalBody>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Binance Futures…" className={FORM_INPUT} required autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Starting balance ({display})</label>
              <input type="number" step="0.01" min="0" value={balance} onChange={e => setBalance(e.target.value)} className={FORM_INPUT} />
              <p className="text-[10px] text-muted mt-1">Stored as {display} on this exchange</p>
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
  display,
  rate,
  onClose,
  onSave,
}: {
  exchange: TradingExchange;
  display: QuoteCurrency;
  rate: number;
  onClose: () => void;
  onSave: (d: { amount: number; source: string; note: string; date: string }) => void;
}) {
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState('external');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(todayISO());
  const n = Number(amount) || 0;
  const alt = otherQuote(display);

  return (
    <Modal title={`Add money · ${exchange.name}`} onClose={onClose}>
      <form
        onSubmit={e => {
          e.preventDefault();
          if (!(n > 0)) return;
          onSave({ amount: n, source, note: note.trim(), date });
        }}
        className="flex flex-col flex-1 overflow-hidden"
      >
        <ModalBody>
          <p className="text-xs text-muted mb-3">
            Free {formatTradingMoney(exchange.balance, normalizeQuote(exchange.currency))}
            {' · '}fund in {display}
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Amount ({display}) *</label>
              <input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} className={FORM_INPUT} required autoFocus />
              {n > 0 && (
                <p className="text-[11px] text-muted mt-1">
                  ≈ {formatTradingMoney(convertQuote(n, display, alt, rate), alt)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Source</label>
              <select value={source} onChange={e => setSource(e.target.value)} className={FORM_SELECT}>
                <option value="external">External / bank</option>
                <option value="funding">Funding</option>
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
              <input value={note} onChange={e => setNote(e.target.value)} className={FORM_INPUT} />
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
