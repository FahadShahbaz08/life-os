import { TradeSide } from '@/types';

export interface SimulateTradeInput {
  side: TradeSide;
  entry: number;
  stopLoss: number | null;
  takeProfit: number | null;
  margin: number;
  leverage: number;
  /** Taker fee per side, as percent (0.04 = 0.04%) */
  feePctPerSide: number;
}

export interface SimulateTradeResult {
  leverage: number;
  notional: number;
  quantity: number;
  roundTripFee: number;
  breakEven: number;
  liquidation: number;
  slDistancePct: number | null;
  tpDistancePct: number | null;
  risk: number | null;
  reward: number | null;
  riskRoe: number | null;
  rewardRoe: number | null;
  rr: number | null;
  slBeyondLiq: boolean;
  slOnWrongSide: boolean;
  tpOnWrongSide: boolean;
  issues: string[];
  verdict: 'take' | 'caution' | 'skip' | 'incomplete';
  verdictLabel: string;
}

function n(v: number): boolean {
  return Number.isFinite(v) && v > 0;
}

/** Isolated-style approx. MMR ~0.4%. Not exchange-exact. */
export function approxLiquidation(entry: number, leverage: number, side: TradeSide, mmr = 0.004): number {
  const mm = 1 / Math.max(1, leverage);
  if (side === 'long') return entry * (1 - mm + mmr);
  return entry * (1 + mm - mmr);
}

export function priceMovePnl(side: TradeSide, entry: number, exit: number, qty: number, fees: number): number {
  const move = side === 'short' ? (entry - exit) * qty : (exit - entry) * qty;
  return move - fees;
}

export function simulateTrade(input: SimulateTradeInput): SimulateTradeResult | null {
  const { side, entry, stopLoss, takeProfit, margin } = input;
  const leverage = Math.max(1, input.leverage || 1);
  const feePct = Math.max(0, input.feePctPerSide || 0) / 100;

  if (!n(entry) || !n(margin)) return null;

  const notional = margin * leverage;
  const quantity = notional / entry;
  const roundTripFee = notional * feePct * 2;

  const breakEven = side === 'long'
    ? entry * (1 + feePct * 2)
    : entry * (1 - feePct * 2);

  const liquidation = approxLiquidation(entry, leverage, side);

  const issues: string[] = [];
  let slOnWrongSide = false;
  let tpOnWrongSide = false;
  let slBeyondLiq = false;

  if (stopLoss != null && n(stopLoss)) {
    slOnWrongSide = side === 'long' ? stopLoss >= entry : stopLoss <= entry;
    if (slOnWrongSide) issues.push('SL is on the wrong side of entry');
    slBeyondLiq = side === 'long' ? stopLoss <= liquidation : stopLoss >= liquidation;
    if (slBeyondLiq) issues.push('SL is at or beyond estimated liquidation — you may get liquidated first');
  }

  if (takeProfit != null && n(takeProfit)) {
    tpOnWrongSide = side === 'long' ? takeProfit <= entry : takeProfit >= entry;
    if (tpOnWrongSide) issues.push('TP is on the wrong side of entry');
  }

  const slDistancePct = stopLoss != null && n(stopLoss)
    ? Math.abs(entry - stopLoss) / entry * 100
    : null;
  const tpDistancePct = takeProfit != null && n(takeProfit)
    ? Math.abs(takeProfit - entry) / entry * 100
    : null;

  const risk = stopLoss != null && n(stopLoss) && !slOnWrongSide
    ? priceMovePnl(side, entry, stopLoss, quantity, roundTripFee)
    : null;
  const reward = takeProfit != null && n(takeProfit) && !tpOnWrongSide
    ? priceMovePnl(side, entry, takeProfit, quantity, roundTripFee)
    : null;

  const riskRoe = risk != null && margin > 0 ? (risk / margin) * 100 : null;
  const rewardRoe = reward != null && margin > 0 ? (reward / margin) * 100 : null;

  const absRisk = risk != null ? Math.abs(risk) : null;
  const rr = absRisk != null && absRisk > 0 && reward != null ? reward / absRisk : null;

  if (risk != null && risk >= 0) issues.push('SL would not produce a loss — check prices');
  if (riskRoe != null && riskRoe <= -80) issues.push('A full SL wipes most of this margin (~liquidation-level risk)');

  let verdict: SimulateTradeResult['verdict'] = 'incomplete';
  let verdictLabel = 'Add SL and TP to judge the setup';

  if (issues.some(i => i.includes('wrong side'))) {
    verdict = 'skip';
    verdictLabel = 'Fix SL / TP direction before this is usable';
  } else if (slBeyondLiq) {
    verdict = 'skip';
    verdictLabel = 'Skip — stop is past estimated liquidation';
  } else if (rr != null && risk != null) {
    if (rr >= 2 && (riskRoe == null || riskRoe > -50)) {
      verdict = 'take';
      verdictLabel = `Worth considering — R:R ${rr.toFixed(2)} (≥ 2)`;
    } else if (rr >= 1.2) {
      verdict = 'caution';
      verdictLabel = `Borderline — R:R ${rr.toFixed(2)}. Only if thesis is strong`;
    } else {
      verdict = 'skip';
      verdictLabel = `Skip — reward is too small vs risk (R:R ${rr.toFixed(2)})`;
    }
  } else if (risk != null) {
    verdict = 'caution';
    verdictLabel = 'Risk is defined. Add TP to see R:R';
  }

  return {
    leverage,
    notional,
    quantity,
    roundTripFee,
    breakEven,
    liquidation,
    slDistancePct,
    tpDistancePct,
    risk,
    reward,
    riskRoe,
    rewardRoe,
    rr,
    slBeyondLiq,
    slOnWrongSide,
    tpOnWrongSide,
    issues,
    verdict,
    verdictLabel,
  };
}

export function plannedRiskReward(
  side: TradeSide,
  entry: number | null,
  sl: number | null,
  tp: number | null,
): number | null {
  if (entry == null || sl == null || tp == null || entry <= 0) return null;
  const risk = Math.abs(entry - sl);
  const reward = Math.abs(tp - entry);
  if (!(risk > 0)) return null;
  return reward / risk;
}

export function tradeDurationLabel(openedAt: string, closedAt: string | null): string | null {
  if (!closedAt) return null;
  const a = Date.parse(openedAt);
  const b = Date.parse(closedAt);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  const mins = Math.round((b - a) / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}
