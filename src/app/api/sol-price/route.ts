// src/app/api/sol-price/route.ts
import { NextResponse } from 'next/server';

const COINGECKO = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';
const BINANCE  = 'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT';
const COINBASE = 'https://api.coinbase.com/v2/exchange-rates?currency=SOL';

// tiny fetch with timeout + graceful failure
async function fetchJSON(url: string, timeoutMs = 5000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: ctrl.signal, headers: { 'cache-control': 'no-cache' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

export async function GET() {
  // 1) Try CoinGecko
  try {
    const j = await fetchJSON(COINGECKO, 5000);
    const usd = Number(j?.solana?.usd);
    if (Number.isFinite(usd) && usd > 0) {
      return NextResponse.json({ usd, source: 'coingecko' }, { headers: { 'Cache-Control': 'public, max-age=30' } });
    }
  } catch {}

  // 2) Try Binance
  try {
    const j = await fetchJSON(BINANCE, 5000);
    const usd = Number(j?.price);
    if (Number.isFinite(usd) && usd > 0) {
      return NextResponse.json({ usd, source: 'binance' }, { headers: { 'Cache-Control': 'public, max-age=30' } });
    }
  } catch {}

  // 3) Try Coinbase
  try {
    const j = await fetchJSON(COINBASE, 5000);
    const usd = Number(j?.data?.rates?.USD);
    if (Number.isFinite(usd) && usd > 0) {
      return NextResponse.json({ usd, source: 'coinbase' }, { headers: { 'Cache-Control': 'public, max-age=30' } });
    }
  } catch {}

  // Fallback: tell client no live price
  return NextResponse.json({ usd: null, source: null }, { headers: { 'Cache-Control': 'no-store' } });
}
