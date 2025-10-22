// Simple server-side SOL price proxy (CoinGecko)
// Avoids CORS on the client and keeps keys out of the browser.

export const revalidate = 60; // cache for up to 60s on Vercel

export async function GET() {
  try {
    const r = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd",
      { next: { revalidate } }
    );
    if (!r.ok) throw new Error(`Upstream ${r.status}`);
    const j = (await r.json()) as { solana?: { usd?: number } };
    const usd = j?.solana?.usd ?? null;
    return new Response(JSON.stringify({ usd }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  } catch (e) {
    return new Response(JSON.stringify({ usd: null }), {
      headers: { "content-type": "application/json" },
      status: 200,
    });
  }
}
