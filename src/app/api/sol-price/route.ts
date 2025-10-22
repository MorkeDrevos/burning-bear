// src/app/api/sol-price/route.ts
import { NextResponse } from 'next/server';

// Simple live price via CoinGecko; soft-fails to 0 so page can fallback to state.priceUsdPerSol.
export async function GET() {
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { cache: 'no-store', next: { revalidate: 0 } }
    );
    if (!r.ok) throw new Error('bad status');
    const j = await r.json();
    const usd = Number(j?.solana?.usd ?? 0);
    return NextResponse.json({ usd: isFinite(usd) ? usd : 0 });
  } catch {
    return NextResponse.json({ usd: 0 });
  }
}
