/** USDT ↔ PKR helpers + daily rate cache */

export type QuoteCurrency = 'PKR' | 'USDT';

const CACHE_KEY = 'lifeos_usdt_pkr_rate';
/** Fallback if offline / API fails (approx) */
export const FALLBACK_PKR_PER_USDT = 280;

export interface UsdtRateSnapshot {
  pkrPerUsdt: number;
  /** ISO date yyyy-mm-dd of last successful fetch for “once a day” */
  day: string;
  fetchedAt: string;
  source: string;
}

export function todayDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function normalizeQuote(currency?: string | null): QuoteCurrency {
  const c = (currency ?? 'PKR').toUpperCase();
  return c === 'USDT' || c === 'USD' ? 'USDT' : 'PKR';
}

/** Convert amount between PKR and USDT. Rate = PKR per 1 USDT. */
export function convertQuote(
  amount: number,
  from: QuoteCurrency,
  to: QuoteCurrency,
  pkrPerUsdt: number,
): number {
  if (!Number.isFinite(amount)) return 0;
  if (from === to) return amount;
  const rate = pkrPerUsdt > 0 ? pkrPerUsdt : FALLBACK_PKR_PER_USDT;
  if (from === 'USDT' && to === 'PKR') return amount * rate;
  if (from === 'PKR' && to === 'USDT') return amount / rate;
  return amount;
}

export function formatTradingMoney(amount: number, currency: QuoteCurrency): string {
  if (currency === 'USDT') {
    const n = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
    return `${n} USDT`;
  }
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function otherQuote(c: QuoteCurrency): QuoteCurrency {
  return c === 'USDT' ? 'PKR' : 'USDT';
}

export function readCachedRate(): UsdtRateSnapshot | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UsdtRateSnapshot;
    if (!(parsed.pkrPerUsdt > 0) || !parsed.day) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCachedRate(snap: UsdtRateSnapshot): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(snap));
  } catch {
    // ignore quota
  }
}

export function isRateStale(snap: UsdtRateSnapshot | null): boolean {
  if (!snap) return true;
  return snap.day !== todayDayKey();
}

/**
 * Load rate: use local cache if same calendar day, else hit API.
 * force=true always fetches.
 */
export async function loadUsdtPkrRate(force = false): Promise<UsdtRateSnapshot> {
  const cached = readCachedRate();
  if (!force && cached && !isRateStale(cached)) {
    return cached;
  }
  try {
    const res = await fetch(`/api/rates/usdt-pkr${force ? '?refresh=1' : ''}`, {
      cache: 'no-store',
    });
    if (!res.ok) throw new Error('rate failed');
    const data = await res.json() as { pkrPerUsdt: number; source?: string; fetchedAt?: string };
    if (!(data.pkrPerUsdt > 0)) throw new Error('invalid rate');
    const snap: UsdtRateSnapshot = {
      pkrPerUsdt: data.pkrPerUsdt,
      day: todayDayKey(),
      fetchedAt: data.fetchedAt ?? new Date().toISOString(),
      source: data.source ?? 'api',
    };
    writeCachedRate(snap);
    return snap;
  } catch {
    if (cached) return cached;
    const snap: UsdtRateSnapshot = {
      pkrPerUsdt: FALLBACK_PKR_PER_USDT,
      day: todayDayKey(),
      fetchedAt: new Date().toISOString(),
      source: 'fallback',
    };
    writeCachedRate(snap);
    return snap;
  }
}
