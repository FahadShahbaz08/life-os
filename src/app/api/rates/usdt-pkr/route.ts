import { NextResponse } from 'next/server';
import { FALLBACK_PKR_PER_USDT } from '@/lib/trading-currency';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Module-level cache shared for a few minutes across warm instances
let mem: { pkrPerUsdt: number; fetchedAt: number; source: string } | null = null;
const MEM_TTL_MS = 60 * 60 * 1000; // 1 hour server-side

async function fetchFromCoinGecko(): Promise<{ rate: number; source: string } | null> {
  const res = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=pkr',
    { next: { revalidate: 0 }, headers: { Accept: 'application/json' } },
  );
  if (!res.ok) return null;
  const data = await res.json() as { tether?: { pkr?: number } };
  const rate = data?.tether?.pkr;
  if (typeof rate === 'number' && rate > 0) return { rate, source: 'coingecko' };
  return null;
}

async function fetchFromOpenER(): Promise<{ rate: number; source: string } | null> {
  // USD≈USDT; free, no key
  const res = await fetch('https://open.er-api.com/v6/latest/USD', {
    next: { revalidate: 0 },
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) return null;
  const data = await res.json() as { result?: string; rates?: { PKR?: number } };
  const rate = data?.rates?.PKR;
  if (typeof rate === 'number' && rate > 0) return { rate, source: 'open.er-api' };
  return null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const force = url.searchParams.get('refresh') === '1';
  const now = Date.now();

  if (!force && mem && now - mem.fetchedAt < MEM_TTL_MS) {
    return NextResponse.json({
      pkrPerUsdt: mem.pkrPerUsdt,
      fetchedAt: new Date(mem.fetchedAt).toISOString(),
      source: mem.source,
      cached: true,
    });
  }

  try {
    const hit = (await fetchFromCoinGecko()) ?? (await fetchFromOpenER());
    if (hit) {
      mem = { pkrPerUsdt: hit.rate, fetchedAt: now, source: hit.source };
      return NextResponse.json({
        pkrPerUsdt: hit.rate,
        fetchedAt: new Date(now).toISOString(),
        source: hit.source,
        cached: false,
      });
    }
  } catch (err) {
    console.error('USDT/PKR rate', err);
  }

  if (mem) {
    return NextResponse.json({
      pkrPerUsdt: mem.pkrPerUsdt,
      fetchedAt: new Date(mem.fetchedAt).toISOString(),
      source: mem.source,
      cached: true,
      stale: true,
    });
  }

  return NextResponse.json({
    pkrPerUsdt: FALLBACK_PKR_PER_USDT,
    fetchedAt: new Date().toISOString(),
    source: 'fallback',
    cached: false,
  });
}
