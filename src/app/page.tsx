'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config (you still control)
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'Burning Bear';
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111'; // your real CA
const BURN_INTERVAL_MS = 10 * 60 * 1000; // 10 min
const SOL_PRICE_REFRESH_MS = 60_000;     // pull live price every 60s

/* =========================
   Types
========================= */
type Burn = {
  id: string;
  amount: number;       // BEAR amount (integer)
  sol?: number | null;  // SOL used for that burn (optional)
  usd?: number | null;  // If omitted, we compute from sol * price
  timestamp: number;    // ms epoch
  tx: string;
};

type StateFile = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply?: number;
    buybackSol?: number;
    priceUsdPerSol?: number; // fallback price if live fails
  };
  burns: Burn[];
};

/* =========================
   Utils
========================= */
function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function fmtExact(ts: number) {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss} · ${day} ${mon} ${year}`;
}
function truncateMiddle(str: string, left = 6, right = 4) {
  if (!str || str.length <= left + right + 1) return str;
  return `${str.slice(0, left)}…${str.slice(-right)}`;
}

/* =========================
   Page
========================= */
export default function Page() {
  const [now, setNow] = useState<number>(Date.now());
  const [copied, setCopied] = useState(false);

  const [state, setState] = useState<StateFile | null>(null);
  const [liveSolUsd, setLiveSolUsd] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const tickRef = useRef<number | null>(null);
  const priceTimer = useRef<number | null>(null);

  // tick for countdown
  useEffect(() => {
    if (tickRef.current) window.clearInterval(tickRef.current);
    tickRef.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (tickRef.current) window.clearInterval(tickRef.current);
      tickRef.current = null;
    };
  }, []);

  // fetch manual JSON (no-store so your edits show instantly)
  const fetchState = async () => {
    try {
      setError(null);
      const r = await fetch('/data/state.json', { cache: 'no-store' });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const json: StateFile = await r.json();

      const currentSupply =
        json.stats.currentSupply ??
        Math.max(
          0,
          Number(json.stats.initialSupply || 0) - Number(json.stats.burned || 0)
        );

      // Sort newest first; keep raw values (we compute USD at render time using live/fallback price)
      const burns = [...(json.burns || [])].sort(
        (a, b) => b.timestamp - a.timestamp
      );

      setState({
        stats: {
          initialSupply: Number(json.stats.initialSupply || 0),
          burned: Number(json.stats.burned || 0),
          currentSupply,
          buybackSol: Number(json.stats.buybackSol || 0),
          priceUsdPerSol: Number(json.stats.priceUsdPerSol || 0),
        },
        burns,
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load state.json');
    }
  };

  // live SOL price (CoinGecko). If it fails, we keep previous/liveSolUsd or null.
  const fetchSolPrice = async () => {
    try {
      const r = await fetch(
        'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd',
        { cache: 'no-store' }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const data = await r.json();
      const p = Number(data?.solana?.usd);
      if (p > 0) setLiveSolUsd(p);
    } catch {
      // ignore; we'll use fallback from state.stats.priceUsdPerSol
    }
  };

  // initial loads
  useEffect(() => {
    fetchState();
    fetchSolPrice();
  }, []);

  // refresh live price every 60s
  useEffect(() => {
    if (priceTimer.current) window.clearInterval(priceTimer.current);
    priceTimer.current = window.setInterval(fetchSolPrice, SOL_PRICE_REFRESH_MS);
    return () => {
      if (priceTimer.current) window.clearInterval(priceTimer.current);
      priceTimer.current = null;
    };
  }, []);

  const nextBurnIn = BURN_INTERVAL_MS - (now % BURN_INTERVAL_MS);
  const mins = Math.floor(nextBurnIn / 60_000).toString().padStart(2, '0');
  const secs = Math.floor((nextBurnIn % 60_000) / 1000).toString().padStart(2, '0');

  const handleCopyCA = async () => {
    try {
      await navigator.clipboard.writeText(FULL_TOKEN_ADDRESS);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = FULL_TOKEN_ADDRESS;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const effectiveSolPrice =
    liveSolUsd != null && liveSolUsd > 0
      ? liveSolUsd
      : Number(state?.stats.priceUsdPerSol || 0);

  return (
    <main>
      {/* Sticky header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4">
          {/* Left: logo + title (logo scrolls to top) */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3"
            aria-label="Back to top"
          >
            <img
              src="/img/coin-logo.png"
              alt="Burning Bear"
              className="h-9 w-9 rounded-full shadow-ember"
            />
            <div className="leading-tight text-left">
              <div className="text-base font-extrabold">The Burning Bear</div>
              <div className="text-[12px] text-white/55">
                {TOKEN_SYMBOL} • Live Burn Camp
              </div>
            </div>
          </button>

          {/* Center: nav */}
          <nav className="hidden items-center justify-center gap-8 text-base md:flex">
            <a href="#log" className="hover:text-amber-300">
              Live Burns
            </a>
            <a href="#how" className="hover:text-amber-300">
              How It Works
            </a>
            <a href="#community" className="hover:text-amber-300">
              Community
            </a>
          </nav>

          {/* Right: CA */}
          <div className="flex items-center gap-3 justify-self-end">
            <span
              className="hidden md:inline rounded-full bg-emerald-900/40 px-3 py-1.5 text-sm text-emerald-300"
              title={FULL_TOKEN_ADDRESS}
            >
              {truncateMiddle(FULL_TOKEN_ADDRESS)}
            </span>
            <button
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition
                ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
              onClick={handleCopyCA}
              aria-live="polite"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero with video */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <video
            className="h-[70vh] w-full object-cover"
            playsInline
            autoPlay
            muted
            loop
            poster="/img/burning-bear-frame.jpg"
          >
            <source src="/img/burning-bear.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-[#0b1712]/40 to-[#0b1712]" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 pt-20 sm:pt-24">
          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdown toned down */}
          <div className="mt-2 text-sm uppercase tracking-[0.25em] text-white/55">
            Next burn in
          </div>
          <div className="text-4xl font-extrabold text-white/85 sm:text-5xl">
            {mins}m {secs}s
          </div>

          {/* Stats (from manual JSON) */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Initial Supply" value={fmtInt(state?.stats.initialSupply ?? 0)} />
            <Stat label="Burned" value={fmtInt(state?.stats.burned ?? 0)} />
            <Stat
              label="Current Supply"
              value={fmtInt(state?.stats.currentSupply ?? 0)}
            />
          </div>

          {/* Small price / buyback summary line (optional) */}
          <div className="mt-2 text-sm text-white/60">
            {effectiveSolPrice > 0 && (
              <>
                SOL ≈ {fmtMoney(effectiveSolPrice)}{' '}
                {state?.stats.buybackSol ? (
                  <>
                    • Buybacks spent: {state.stats.buybackSol.toFixed(4)} SOL (
                    {fmtMoney(state.stats.buybackSol * effectiveSolPrice)})
                  </>
                ) : null}
              </>
            )}
          </div>

          {error && (
            <div className="mt-3 rounded-lg border border-red-500/30 bg-red-900/20 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">
          Data is maintained manually. TX links open the explorer.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {(state?.burns || []).map((b) => (
            <BurnCard
              key={b.id}
              burn={b}
              solPrice={effectiveSolPrice}
            />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ul className="mt-4 space-y-2 text-white/80">
          <li>80% → Buy & Burn — creator fees auto-buy {TOKEN_SYMBOL} and burn them live.</li>
          <li>20% → Team + Marketing — keeps the vibes bright.</li>
          <li>Transparent — every burn is posted with TX link & timestamp.</li>
        </ul>
      </section>

      {/* Footer */}
      <footer id="community" className="border-t border-white/10 bg-[#0d1a14]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-white/50">
          Once upon a bear market, one dapper bear decided to fight the winter the only way he knew how, with fire. 🔥
        </div>
      </footer>
    </main>
  );
}

/* =========================
   Components
========================= */
function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function BurnCard({
  burn,
  solPrice
}: {
  burn: Burn;
  solPrice: number;
}) {
  const { amount, sol, usd, timestamp, tx } = burn;

  // Prefer explicit USD from JSON; otherwise compute if we have sol + price
  const computedUsd =
    usd != null ? usd : sol != null && solPrice > 0 ? Number((sol * solPrice).toFixed(2)) : null;

  // subtle aging fade (last 3h brighter)
  const ageMin = Math.max(0, (Date.now() - timestamp) / 60_000);
  const brightness = Math.max(0.65, 1 - ageMin / 180);

  return (
    <div
      className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2"
      style={{ filter: `brightness(${brightness})` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">
            🔥
          </span>
          <div>
            <div className="text-lg font-bold">
              Burn • {fmtInt(amount)} BEAR
            </div>
            <div className="text-sm text-white/60">
              {fmtExact(timestamp)}
            </div>
            {(sol != null || computedUsd != null) && (
              <div className="mt-1 text-sm text-white/70">
                {sol != null && <>≈ {sol.toFixed(4)} SOL</>}
                {sol != null && computedUsd != null && ' • '}
                {computedUsd != null && <>{fmtMoney(computedUsd)}</>}
              </div>
            )}
          </div>
        </div>

        <Link
          href={tx}
          target="_blank"
          className="mt-1 text-right text-sm font-semibold text-amber-300 underline-offset-2 hover:underline"
        >
          TX
        </Link>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
