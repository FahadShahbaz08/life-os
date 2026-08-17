'use client';

import { useMemo, useState } from 'react';
import { Lock, TrendingDown, TrendingUp } from 'lucide-react';
import { Trade } from '@/types';
import EmptyState from '@/components/ui/EmptyState';
import { formatDateTime } from '@/lib/utils';
import { tradeNotional, tradeRoe } from '@/lib/chart-data';
import { plannedRiskReward, tradeDurationLabel } from '@/lib/trade-simulator';
import { QuoteCurrency, convertQuote, formatTradingMoney, otherQuote } from '@/lib/trading-currency';

type ResultFilter = 'all' | 'win' | 'loss';
type MarketFilter = 'all' | 'spot' | 'futures';

type Fx = {
  display: QuoteCurrency;
  rate: number;
  toDisplay: (amount: number, from?: string | null) => number;
  fmt: (amount: number, from?: string | null) => string;
  dual: (amount: number, from?: string | null) => { main: string; alt: string };
};

export default function TradeHistoryPanel({
  trades,
  fx,
  exchangeName,
  onDelete,
}: {
  trades: Trade[];
  fx: Fx;
  exchangeName: (id: string | null) => string | null;
  onDelete: (id: string) => void;
}) {
  const [result, setResult] = useState<ResultFilter>('all');
  const [market, setMarket] = useState<MarketFilter>('all');
  const [query, setQuery] = useState('');
  const [month, setMonth] = useState('');

  const closed = useMemo(
    () => trades
      .filter(t => t.status === 'closed')
      .sort((a, b) => (b.closedAt ?? b.openedAt).localeCompare(a.closedAt ?? a.openedAt)),
    [trades],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return closed.filter(t => {
      if (market !== 'all' && (t.market ?? 'spot') !== market) return false;
      if (result === 'win' && !((t.profitLoss ?? 0) > 0)) return false;
      if (result === 'loss' && !((t.profitLoss ?? 0) < 0)) return false;
      if (month && !(t.closedAt ?? t.openedAt).startsWith(month)) return false;
      if (q && !t.pair.toLowerCase().includes(q) && !(t.notes ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [closed, market, result, month, query]);

  const alt = otherQuote(fx.display);
  const stats = useMemo(() => {
    const pnls = filtered.map(t => fx.toDisplay(t.profitLoss ?? 0, t.currency));
    const total = pnls.reduce((s, n) => s + n, 0);
    const wins = pnls.filter(n => n > 0);
    const losses = pnls.filter(n => n < 0);
    const winRate = pnls.length ? Math.round((wins.length / pnls.length) * 100) : 0;
    const avgWin = wins.length ? wins.reduce((s, n) => s + n, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, n) => s + n, 0) / losses.length : 0;
    const grossWin = wins.reduce((s, n) => s + n, 0);
    const grossLoss = Math.abs(losses.reduce((s, n) => s + n, 0));
    const profitFactor = grossLoss > 0 ? grossWin / grossLoss : (grossWin > 0 ? Infinity : 0);
    return { total, winRate, wins: wins.length, losses: losses.length, avgWin, avgLoss, profitFactor };
  }, [filtered, fx]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-primary font-display flex items-center gap-2">
          <Lock size={14} />
          Trade history
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Closed trades only · {filtered.length} of {closed.length} shown
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search pair or notes"
          className="px-3 py-1.5 text-xs bg-raised border border-base rounded-lg text-primary min-w-[160px]"
        />
        <input
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="px-3 py-1.5 text-xs bg-raised border border-base rounded-lg text-primary"
        />
        {([
          ['all', 'All'],
          ['win', 'Wins'],
          ['loss', 'Losses'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setResult(id)}
            className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border ${
              result === id ? 'bg-raised text-primary border-base' : 'border-transparent text-muted'
            }`}
          >
            {label}
          </button>
        ))}
        {([
          ['all', 'All markets'],
          ['futures', 'Futures'],
          ['spot', 'Spot'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setMarket(id)}
            className={`px-2.5 py-1.5 text-[11px] font-medium rounded-lg border ${
              market === id ? 'bg-raised text-primary border-base' : 'border-transparent text-muted'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filtered.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <MiniStat
            label="Net P&L"
            value={formatTradingMoney(stats.total, fx.display)}
            sub={`≈ ${formatTradingMoney(convertQuote(stats.total, fx.display, alt, fx.rate), alt)}`}
            color={stats.total >= 0 ? 'text-emerald-400' : 'text-red-400'}
          />
          <MiniStat label="Win rate" value={`${stats.winRate}%`} sub={`${stats.wins}W / ${stats.losses}L`} />
          <MiniStat label="Avg win" value={formatTradingMoney(stats.avgWin, fx.display)} />
          <MiniStat label="Avg loss" value={formatTradingMoney(stats.avgLoss, fx.display)} color="text-red-400" />
          <MiniStat
            label="Profit factor"
            value={!Number.isFinite(stats.profitFactor) ? '∞' : stats.profitFactor.toFixed(2)}
          />
        </div>
      )}

      {closed.length === 0 ? (
        <EmptyState
          icon={Lock}
          title="No closed trades yet"
          description="When you close a live trade, it lands here with entry, SL/TP, P&L, and duration."
        />
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted py-8 text-center">No trades match these filters.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(trade => (
            <HistoryRow
              key={trade.id}
              trade={trade}
              fx={fx}
              exchangeLabel={exchangeName(trade.exchangeId)}
              onDelete={() => onDelete(trade.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function MiniStat({ label, value, sub, color = 'text-primary' }: {
  label: string; value: string; sub?: string; color?: string;
}) {
  return (
    <div className="card p-3">
      <p className="text-[10px] text-muted uppercase">{label}</p>
      <p className={`text-sm font-bold tabular-nums mt-0.5 ${color}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted tabular-nums">{sub}</p>}
    </div>
  );
}

function HistoryRow({
  trade, fx, exchangeLabel, onDelete,
}: {
  trade: Trade;
  fx: Fx;
  exchangeLabel: string | null;
  onDelete: () => void;
}) {
  const pnl = trade.profitLoss ?? 0;
  const pnlD = fx.dual(pnl, trade.currency);
  const roe = tradeRoe(trade);
  const margin = trade.margin ?? trade.investedAmount;
  const marginD = fx.dual(margin, trade.currency);
  const market = trade.market ?? 'spot';
  const side = trade.side ?? 'long';
  const planned = plannedRiskReward(side, trade.entryPrice, trade.stopLoss, trade.takeProfit);
  const duration = tradeDurationLabel(trade.openedAt, trade.closedAt);
  const notional = tradeNotional(trade);

  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-primary">{trade.pair}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase ${
              market === 'futures' ? 'bg-violet-500/10 text-violet-300' : 'bg-sky-500/10 text-sky-300'
            }`}>{market}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-md uppercase ${
              side === 'long' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>{side}</span>
            {market === 'futures' && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-raised border border-base text-secondary">
                {trade.leverage || 1}x
              </span>
            )}
            {exchangeLabel && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-raised border border-base text-secondary">
                {exchangeLabel}
              </span>
            )}
            {duration && <span className="text-[10px] text-muted">{duration}</span>}
          </div>
          <p className="text-xs text-muted mt-1.5">
            Margin {marginD.main}
            {market === 'futures' && <> · Notional {fx.fmt(notional, trade.currency)}</>}
            {trade.entryPrice != null && <> · Entry {trade.entryPrice}</>}
            {trade.exitPrice != null && <> · Exit {trade.exitPrice}</>}
          </p>
          <p className="text-[11px] text-muted mt-0.5">
            {trade.stopLoss != null && <>SL {trade.stopLoss} · </>}
            {trade.takeProfit != null && <>TP {trade.takeProfit} · </>}
            {planned != null && <>Planned R:R 1:{planned.toFixed(2)} · </>}
            {trade.fees > 0 && <>Fees {fx.fmt(trade.fees, trade.currency)} · </>}
            Opened {formatDateTime(trade.openedAt)}
            {trade.closedAt && <> · Closed {formatDateTime(trade.closedAt)}</>}
          </p>
          {trade.notes && <p className="text-xs text-secondary mt-2 italic">&ldquo;{trade.notes}&rdquo;</p>}
        </div>
        <div className="text-right shrink-0">
          <div className={`flex items-center justify-end gap-1 text-sm font-bold tabular-nums ${pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {pnl >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {pnl >= 0 ? '+' : ''}{pnlD.main}
          </div>
          <p className="text-[10px] text-muted tabular-nums">≈ {pnlD.alt}</p>
          {roe != null && (
            <p className={`text-[10px] tabular-nums ${roe >= 0 ? 'text-emerald-400/80' : 'text-red-400/80'}`}>
              ROE {roe >= 0 ? '+' : ''}{roe}%
            </p>
          )}
          <button type="button" onClick={onDelete} className="mt-2 text-[11px] text-muted hover:text-red-400">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
