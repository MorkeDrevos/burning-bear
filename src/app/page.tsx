'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'Burning Bear';

// Put your real, full CA (no ellipsis) — this is what “Copy CA” copies.
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

// How often to refetch your JSON and SOL price (ms)
const STATE_POLL_MS = 10_000;
const SOL_PRICE_POLL_MS = 60_000;

/* =========================
   Types
========================= */
type Burn = {
  id: string;
  amount: number;     // BEAR burned/bought back (raw token amount)
  sol?: number;       // SOL spent for this burn (optional; we can compute USD via price)
  timestamp: number;  // ms epoch
  tx: string;
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;        // total SOL spent so far
    priceUsdPerSol?: number;    // fallback if API fails
  };
  burns: Burn[];
  schedule?: {
    // You control countdowns with either next*At or last*At + intervalMs
    burnIntervalMs?: number;
    buybackIntervalMs?: number;

    nextBurnAt?: number;    // ms epoch in the future
    nextBuybackAt?: number; // ms epoch in the future

    lastBurnAt?: number;    // ms epoch (used with burnIntervalMs)
    lastBuybackAt?: number; // ms epoch (used with buybackIntervalMs)
  };
};

/* =========================
   Helpers: time + numbers
========================= */
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtInt(n: number) { return nf0.format(n); }
function fmt2(n: number)  { return nf2.format(n); }

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

function friendlyDate(ts: number, now: number) {
  const d = new Date(ts);
  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue…
  const date = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' }); // 22 Oct 2025
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); // 09:42

  const diffSec = Math.floor((now - ts) / 1000);
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);
  const midnight = (x: number) => new Date(new Date(x).toDateString()).getTime();
  const isToday = midnight(ts) === midnight(now);
  const isYesterday = midnight(ts) === midnight(now - 86_400_000);

  if (diffMin < 60 && isToday) return `${diffMin}m ago, Today at ${time}`;
  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;
  return `${dayName} ${time}, ${date}`;
}

function msToMinSec(ms: number) {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}

/* =========================
   Countdown resolver
========================= */
function resolveNextAt(now: number, kind: 'burn'|'buyback', s?: StateJson['schedule']) {
  const interval = kind === 'burn' ? s?.burnIntervalMs : s?.buybackIntervalMs;
  const nextAt   = kind === 'burn' ? s?.nextBurnAt     : s?.nextBuybackAt;
  const lastAt   = kind === 'burn' ? s?.lastBurnAt     : s?.lastBuybackAt;

  if (nextAt && nextAt > now) return nextAt;
  if (interval && lastAt)     return lastAt + interval;

  // Fallback: rolling modulo timer using interval if present, otherwise 10m default
  const roll = interval ?? 10 * 60 * 1000;
  const rem  = roll - (now % roll);
  return now + rem;
}

/* =========================
   Page
========================= */
export default function Page() {
  const [now, setNow] = useState<number>(Date.now());
  const [state, setState] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Tick once a second
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll state.json
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch('/data/state.json', { cache: 'no-store' });
        if (!r.ok) throw new Error('state JSON failed');
        const j: StateJson = await r.json();
        if (!stop) setState(j);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    const t = setInterval(load, STATE_POLL_MS);
    return () => { stop = true; clearInterval(t); };
  }, []);

  // Poll live SOL price (fallback to JSON if needed)
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch('/api/sol-price', { cache: 'no-store' });
        if (!r.ok) throw new Error('price api failed');
        const j = await r.json();
        if (typeof j.priceUsdPerSol === 'number' && !stop) setSolUsd(j.priceUsdPerSol);
      } catch (e) {
        // fall back: we’ll read from JSON when rendering
        console.warn('SOL price API failed, using JSON fallback if available.');
      }
    };
    load();
    const t = setInterval(load, SOL_PRICE_POLL_MS);
    return () => { stop = true; clearInterval(t); };
  }, []);

  const priceUsdPerSol = useMemo(() => {
    return solUsd ?? state?.stats?.priceUsdPerSol ?? null;
  }, [solUsd, state]);

  // Next timers
  const nextBurnAt = useMemo(
    () => resolveNextAt(now, 'burn', state?.schedule),
    [now, state?.schedule]
  );
  const nextBuybackAt = useMemo(
    () => resolveNextAt(now, 'buyback', state?.schedule),
    [now, state?.schedule]
  );
  const burnRemaining = Math.max(0, nextBurnAt - now);
  const buyRemaining  = Math.max(0, nextBuybackAt - now);

  // Totals / stats (guard if JSON missing)
  const initial = state?.stats?.initialSupply ?? 0;
  const burned  = state?.stats?.burned ?? 0;
  const current = state?.stats?.currentSupply ?? Math.max(0, initial - burned);
  const totalSol = state?.stats?.buybackSol ?? 0;
  const totalUsd = priceUsdPerSol ? totalSol * priceUsdPerSol : null;

  const burns = (state?.burns ?? []).slice().sort((a, b) => b.timestamp - a.timestamp);

  const handleCopyCA = async () => {
    try {
      await navigator.clipboard.writeText(FULL_TOKEN_ADDRESS);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = FULL_TOKEN_ADDRESS;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          {/* Left: logo + title (logo scrolls to top) */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3"
            aria-label="Go to top"
          >
            <img
              src="/img/coin-logo.png"
              alt="Burning Bear"
              className="h-8 w-8 rounded-full shadow-ember"
            />
            <div className="hidden sm:block leading-tight text-left">
              <div className="text-sm font-extrabold">The Burning Bear</div>
              <div className="text-[11px] text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </button>

          {/* Center: nav */}
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#log" className="hover:text-amber-300">Live Burns</a>
            <a href="#how" className="hover:text-amber-300">How It Works</a>
            <a href="#community" className="hover:text-amber-300">Community</a>
          </nav>

          {/* Right: CA + Copy */}
          <div className="flex items-center gap-2">
            <span
              title={FULL_TOKEN_ADDRESS}
              className="hidden rounded-full bg-emerald-900/40 px-3 py-1 text-xs text-emerald-300 sm:inline"
            >
              {FULL_TOKEN_ADDRESS.slice(0, 6)}…{FULL_TOKEN_ADDRESS.slice(-4)}
            </span>
            <button
              onClick={handleCopyCA}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition
                ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
              aria-live="polite"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero with video + countdowns */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <video
            className="h-[68vh] w-full object-cover"
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

        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-14 pt-20 sm:pt-24 md:px-6">
          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Two countdowns */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">Next burn in</div>
              <div className="text-3xl font-extrabold text-white/90 sm:text-4xl">
                {msToMinSec(burnRemaining)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">Next buyback in</div>
              <div className="text-3xl font-extrabold text-white/90 sm:text-4xl">
                {msToMinSec(buyRemaining)}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Initial Supply" value={fmtInt(initial)} />
            <Stat label="Burned" value={fmtInt(burned)} />
            <Stat label="Current Supply" value={fmtInt(current)} />
          </div>

          {/* Totals */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat label="Buyback Spent" value={`${fmt2(totalSol)} SOL`} />
            <Stat label="Buyback Value (USD)" value={totalUsd != null ? `$${fmt2(totalUsd)}` : '—'} />
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open the explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {burns.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-6">
              <div className="text-white/60">No burns posted yet.</div>
            </div>
          )}
          {burns.map((b) => (
            <BurnCard key={b.id} burn={b} now={now} priceUsdPerSol={priceUsdPerSol} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12 md:px-6">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ul className="mt-4 space-y-2 text-white/80">
          <li>80% → Buy &amp; Burn — creator fees auto-buy {TOKEN_SYMBOL} and burn them live.</li>
          <li>20% → Team + Marketing — keeps the vibes bright.</li>
          <li>Transparent — every burn is posted with TX link &amp; timestamp.</li>
        </ul>
      </section>

      {/* Footer */}
      <footer id="community" className="border-t border-white/10 bg-[#0d1a14]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-white/50 md:px-6">
          Once upon a bear market, one dapper bear decided to fight the winter the only way he knew how, with fire. 🔥
        </div>
      </footer>
    </main>
  );
}

/* =========================
   Components
========================= */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function BurnCard({ burn, now, priceUsdPerSol }: { burn: Burn; now: number; priceUsdPerSol: number | null }) {
  const ageMin = Math.max(0, (now - burn.timestamp) / 60_000);
  const brightness = clamp(1 - ageMin / 180, 0.65, 1);
  const progress = clamp(ageMin / 10, 0, 1); // fills over ~10 minutes

  const friendly = friendlyDate(burn.timestamp, now);

  const solStr = burn.sol != null ? `${fmt2(burn.sol)} SOL` : null;
  const usdStr = burn.sol != null && priceUsdPerSol ? `$${fmt2(burn.sol * priceUsdPerSol)}` : null;

  return (
    <div
      className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2"
      style={{ filter: `brightness(${brightness})` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">🔥</span>
          <div>
            <div className="text-lg font-bold">Burn • {fmtInt(burn.amount)} BEAR</div>
            <div className="text-sm text-white/60">{friendly}</div>
            {(solStr || usdStr) && (
              <div className="mt-1 text-sm text-white/70">
                {solStr}{solStr && usdStr ? ' • ' : ''}{usdStr ?? ''}
              </div>
            )}
          </div>
        </div>
        <Link
          href={burn.tx}
          target="_blank"
          className="mt-1 text-right text-sm font-semibold text-amber-300 underline-offset-2 hover:underline"
        >
          TX
        </Link>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          style={{ width: `${Math.floor(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
