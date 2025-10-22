// src/app/api/sol-price/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 0; // always fresh

export async function GET() {
  try {
    // Public, no key needed. If CG errors, we throw and the client will fallback.
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { next: { revalidate: 0 }, cache: 'no-store' }
    );
    if (!r.ok) throw new Error('coingecko failed');
    const j = await r.json();
    const price = j?.solana?.usd;
    if (typeof price !== 'number') throw new Error('bad payload');
    return NextResponse.json({ priceUsdPerSol: price }, { status: 200 });
  } catch {
    return NextResponse.json({ error: 'price unavailable' }, { status: 503 });
  }
}
