// src/app/api/sol-price/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 0; // always fresh

export async function GET() {
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { next: { revalidate: 0 }, cache: 'no-store' }
    );
    const j = await r.json();
    const usd = j?.solana?.usd;
    if (typeof usd === 'number') {
      return NextResponse.json({ usd });
    }
  } catch {
    // ignore, we'll fall back on the client
  }
  return NextResponse.json({ usd: null }, { status: 200 });
}
