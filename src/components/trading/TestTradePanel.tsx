'use client';

import { useEffect, useMemo, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { TradeSide } from '@/types';
import { FORM_INPUT, FORM_SELECT } from '@/lib/constants';
import { simulateTrade } from '@/lib/trade-simulator';
import {
  QuoteCurrency,
  convertQuote,
  formatTradingMoney,
  otherQuote,
} from '@/lib/trading-currency';

const DRAFT_KEY = 'lifeos_test_trade';

type Draft = {
  pair: string;
  side: TradeSide;
  entry: string;
  sl: string;
  tp: string;
  margin: string;
  leverage: string;
  feePct: string;
  account: string;
};

const EMPTY: Draft = {
  pair: '',
  side: 'long',
  entry: '',
  sl: '',
  tp: '',
  margin: '',
  leverage: '10',
  feePct: '0.04',
  account: '',
};

function loadDraft(): Draft {
  if (typeof window === 'undefined') return EMPTY;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return EMPTY;
    return { ...EMPTY, ...JSON.parse(raw) as Partial<Draft> };
  } catch {
    return EMPTY;
  }
}

export default function TestTradePanel({
  display,
  rate,
}: {
  display: QuoteCurrency;
  rate: number;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [hydrated, setHydrated] = useState(false);
  const alt = otherQuote(display);

  useEffect(() => {
    setDraft(loadDraft());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch { /* ignore */ }
  }, [draft, hydrated]);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft(d => ({ ...d, [key]: value }));

  const result = useMemo(() => {
    const entry = Number(draft.entry);
    const margin = Number(draft.margin);
    if (!(entry > 0) || !(margin > 0)) return null;
    return simulateTrade({
      side: draft.side,
      entry,
      stopLoss: draft.sl ? Number(draft.sl) : null,
      takeProfit: draft.tp ? Number(draft.tp) : null,
      margin,
      leverage: Number(draft.leverage) || 1,
      feePctPerSide: Number(draft.feePct) || 0,
    });
  }, [draft]);

  const money = (amount: number) => formatTradingMoney(amount, display);
  const dual = (amount: number) => ({
    main: money(amount),
    alt: formatTradingMoney(convertQuote(amount, display, alt, rate), alt),
  });

  const accountN = Number(draft.account) || 0;
  const accountRiskPct =
    result?.risk != null && accountN > 0
      ? (Math.abs(result.risk) / accountN) * 100
      : null;

  const verdictClass =
    result?.verdict === 'take' ? 'border-emerald-500/30 bg-emerald-500/5'
      : result?.verdict === 'skip' ? 'border-red-500/30 bg-red-500/5'
        : result?.verdict === 'caution' ? 'border-amber-500/30 bg-amber-500/5'
          : 'border-base';

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-sm font-semibold text-primary font-display flex items-center gap-2">
          <FlaskConical size={15} />
          Test a trade
        </h2>
        <p className="text-xs text-muted mt-0.5">
          Paper numbers only — nothing is opened on an exchange. Amounts are in {display}.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Side</label>
              <select value={draft.side} onChange={e => set('side', e.target.value as TradeSide)} className={FORM_SELECT}>
                <option value="long">Long / Buy</option>
                <option value="short">Short / Sell</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Pair (optional)</label>
              <input value={draft.pair} onChange={e => set('pair', e.target.value)} placeholder="BTCUSDT" className={FORM_INPUT} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-secondary mb-1.5">Entry price *</label>
            <input type="number" step="any" min="0" value={draft.entry} onChange={e => set('entry', e.target.value)} className={FORM_INPUT} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Stop loss</label>
              <input type="number" step="any" min="0" value={draft.sl} onChange={e => set('sl', e.target.value)} className={FORM_INPUT} />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Take profit</label>
              <input type="number" step="any" min="0" value={draft.tp} onChange={e => set('tp', e.target.value)} className={FORM_INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Margin ({display}) *</label>
              <input type="number" step="any" min="0" value={draft.margin} onChange={e => set('margin', e.target.value)} className={FORM_INPUT} />
              {Number(draft.margin) > 0 && (
                <p className="text-[10px] text-muted mt-1">
                  ≈ {formatTradingMoney(convertQuote(Number(draft.margin), display, alt, rate), alt)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Leverage</label>
              <input type="number" step="1" min="1" max="200" value={draft.leverage} onChange={e => set('leverage', e.target.value)} className={FORM_INPUT} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Fee % per side</label>
              <input type="number" step="0.01" min="0" value={draft.feePct} onChange={e => set('feePct', e.target.value)} className={FORM_INPUT} />
              <p className="text-[10px] text-muted mt-1">Binance-style taker ~0.04%</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Account size ({display})</label>
              <input type="number" step="any" min="0" value={draft.account} onChange={e => set('account', e.target.value)} placeholder="optional" className={FORM_INPUT} />
              <p className="text-[10px] text-muted mt-1">For % of account at risk</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDraft(EMPTY)}
            className="text-xs text-muted hover:text-secondary"
          >
            Clear fields
          </button>
        </div>

        <div className="space-y-3">
          {!result ? (
            <div className="card p-6 text-sm text-muted">
              Enter entry price and margin to see size, risk, R:R, and liquidation.
            </div>
          ) : (
            <>
              <div className={`card p-4 ${verdictClass}`}>
                <p className="text-[10px] uppercase tracking-wide text-muted mb-1">Verdict</p>
                <p className="text-sm font-semibold text-primary">{result.verdictLabel}</p>
                {draft.pair.trim() && (
                  <p className="text-[11px] text-muted mt-1">{draft.pair.toUpperCase()} · {draft.side} · {result.leverage}x</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Metric label="Notional" main={dual(result.notional).main} alt={dual(result.notional).alt} />
                <Metric label="Qty" main={formatQty(result.quantity)} />
                <Metric
                  label="If SL hits"
                  main={result.risk == null ? '—' : signed(dual(result.risk).main, result.risk)}
                  alt={result.risk == null ? undefined : `≈ ${dual(result.risk).alt}`}
                  tone={result.risk == null ? undefined : result.risk >= 0 ? 'pos' : 'neg'}
                />
                <Metric
                  label="If TP hits"
                  main={result.reward == null ? '—' : signed(dual(result.reward).main, result.reward)}
                  alt={result.reward == null ? undefined : `≈ ${dual(result.reward).alt}`}
                  tone={result.reward == null ? undefined : result.reward >= 0 ? 'pos' : 'neg'}
                />
                <Metric
                  label="R : R"
                  main={result.rr == null ? '—' : `1 : ${result.rr.toFixed(2)}`}
                  tone={result.rr == null ? undefined : result.rr >= 2 ? 'pos' : result.rr >= 1.2 ? 'warn' : 'neg'}
                />
                <Metric
                  label="ROE at SL / TP"
                  main={`${fmtRoe(result.riskRoe)} / ${fmtRoe(result.rewardRoe)}`}
                />
                <Metric
                  label="Est. liquidation"
                  main={formatPrice(result.liquidation)}
                  alt={result.slBeyondLiq ? 'SL past liq' : undefined}
                  tone={result.slBeyondLiq ? 'neg' : undefined}
                />
                <Metric
                  label="Break-even (fees)"
                  main={formatPrice(result.breakEven)}
                />
                <Metric
                  label="Round-trip fees"
                  main={dual(result.roundTripFee).main}
                  alt={`≈ ${dual(result.roundTripFee).alt}`}
                />
                <Metric
                  label="SL / TP distance"
                  main={`${fmtPct(result.slDistancePct)} / ${fmtPct(result.tpDistancePct)}`}
                />
                {accountRiskPct != null && (
                  <Metric
                    label="% of account at SL"
                    main={`${accountRiskPct.toFixed(2)}%`}
                    tone={accountRiskPct > 2 ? 'neg' : accountRiskPct > 1 ? 'warn' : 'pos'}
                  />
                )}
              </div>

              {result.issues.length > 0 && (
                <ul className="card p-3 text-xs text-amber-400 space-y-1 list-disc pl-5">
                  {result.issues.map(i => <li key={i}>{i}</li>)}
                </ul>
              )}

              <p className="text-[10px] text-muted">
                Liquidation is an isolated-margin estimate (MMR ~0.4%), not exchange-exact. Fees assumed on notional both ways.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label, main, alt, tone,
}: {
  label: string;
  main: string;
  alt?: string;
  tone?: 'pos' | 'neg' | 'warn';
}) {
  const color =
    tone === 'pos' ? 'text-emerald-400'
      : tone === 'neg' ? 'text-red-400'
        : tone === 'warn' ? 'text-amber-400'
          : 'text-primary';
  return (
    <div className="card p-3">
      <p className="text-[10px] text-muted uppercase">{label}</p>
      <p className={`text-sm font-semibold tabular-nums mt-0.5 ${color}`}>{main}</p>
      {alt && <p className="text-[10px] text-muted tabular-nums">{alt}</p>}
    </div>
  );
}

function signed(formatted: string, n: number): string {
  if (n > 0 && !formatted.startsWith('+')) return `+${formatted}`;
  return formatted;
}

function fmtRoe(v: number | null): string {
  if (v == null) return '—';
  const s = v >= 0 ? '+' : '';
  return `${s}${v.toFixed(1)}%`;
}

function fmtPct(v: number | null): string {
  if (v == null) return '—';
  return `${v.toFixed(2)}%`;
}

function formatQty(q: number): string {
  if (q >= 100) return q.toFixed(2);
  if (q >= 1) return q.toFixed(4);
  return q.toPrecision(4);
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1) return p.toFixed(4);
  return p.toPrecision(6);
}
