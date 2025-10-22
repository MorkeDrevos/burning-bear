// src/app/api/sol-price/route.ts
import { NextResponse } from 'next/server';

export const revalidate = 0; // always fresh

export async function GET() {
  try {
    const r = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
      { next: { revalidate: 0 }, headers: { 'x-cg-demo-api-key': '' } }
    );
    const j = await r.json();
    const usd = j?.solana?.usd;
    if (typeof usd === 'number' && isFinite(usd)) {
      return NextResponse.json({ usd });
    }
  } catch {}
  return NextResponse.json({ usd: null }, { status: 200 });
}
