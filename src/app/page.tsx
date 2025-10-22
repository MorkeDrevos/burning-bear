'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'Burning Bear';
const TOKEN_ADDRESS = 'Solana…11111'; // demo
const BURN_INTERVAL_MS = 10 * 60 * 1000; // 10 min

/* =========================
   Demo burn data (static)
========================= */
type Burn = {
  id: string;
  amount: number;
  timestamp: number; // ms epoch
  tx: string;
};

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function fakeTx() {
  const s = '0123456789abcdef';
  let h = 'https://explorer.solana.com/tx/0x';
  for (let i = 0; i < 64; i++) h += s[Math.floor(Math.random() * s.length)];
  return h;
}
function agoMinutes(minsAgo: number) {
  return Date.now() - minsAgo * 60_000;
}

const DEMO_BURNS: Burn[] = [
  { id: 'a', amount: 2_450_000, timestamp: agoMinutes(60), tx: fakeTx() },
  { id: 'b', amount: 3_100_000, timestamp: agoMinutes(120), tx: fakeTx() },
  { id: 'c', amount: 1_076_983, timestamp: agoMinutes(9), tx: fakeTx() },
];

/* =========================
   Utils
========================= */
function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtExact(ts: number) {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${day} ${mon} ${hh}:${mm}:${ss}`;
}

function fmtAgo(now: number, ts: number) {
  const ms = Math.max(0, now - ts);
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

/* =========================
   Page
========================= */
export default function Page() {
  const [now, setNow] = useState<number>(Date.now());
  const ticking = useRef<number | null>(null);

  useEffect(() => {
    // tick once per second in the browser
    ticking.current && window.clearInterval(ticking.current);
    ticking.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (ticking.current) window.clearInterval(ticking.current);
      ticking.current = null;
    };
  }, []);

  const nextBurnIn = BURN_INTERVAL_MS - (now % BURN_INTERVAL_MS);
  const mins = Math.floor(nextBurnIn / 60_000).toString().padStart(2, '0');
  const secs = Math.floor((nextBurnIn % 60_000) / 1000).toString().padStart(2, '0');

  const INITIAL_SUPPLY = 1_000_000_000;
  const BURNED_DEMO = 5_550_000;
  const CURRENT_SUPPLY = INITIAL_SUPPLY - BURNED_DEMO;

  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/img/coin-logo.png"
              alt="Burning Bear"
              className="h-8 w-8 rounded-full shadow-ember"
            />
            <div className="leading-tight">
              <div className="text-sm font-bold">The Burning Bear</div>
              <div className="text-[11px] text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </div>

          <nav className="hidden gap-6 text-sm md:flex">
            <a href="#log" className="hover:text-amber-300">Live Burns</a>
            <a href="#how" className="hover:text-amber-300">How It Works</a>
            <a href="#community" className="hover:text-amber-300">Community</a>
          </nav>

          <div className="flex items-center gap-2">
            <span className="hidden rounded-full bg-emerald-900/40 px-3 py-1 text-xs text-emerald-300 md:inline">
              {TOKEN_ADDRESS}
            </span>
            {/* Keep the ONLY Copy CA here */}
            <button
              className="rounded-full bg-[#ffedb3] px-3 py-1 text-sm font-semibold text-black hover:bg-[#ffe48d]"
              onClick={() => navigator.clipboard.writeText(TOKEN_ADDRESS)}
            >
              Copy CA
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
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdown (softer/less white) */}
          <div className="mt-2 text-sm uppercase tracking-[0.25em] text-white/55">Next burn in</div>
          <div className="text-4xl font-extrabold text-white/85 sm:text-5xl">
            {mins}m {secs}s
          </div>

          {/* Stats (NOTE: Removed the extra Copy CA that used to be under these boxes) */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Initial Supply" value={fmtInt(INITIAL_SUPPLY)} />
            <Stat label="Burned (demo)" value={fmtInt(BURNED_DEMO)} />
            <Stat label="Current Supply" value={fmtInt(CURRENT_SUPPLY)} />
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">Demo data — TX links open explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {DEMO_BURNS.map((b, i) => (
            <BurnCard key={b.id} burn={b} now={now} index={i} />
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-6 sm:flex-row">
          <div className="text-sm text-white/50">
            © {new Date().getFullYear()} The Burning Bear — The Classiest Arsonist in Crypto
          </div>
          <div className="text-xs text-white/40">
            {TOKEN_SYMBOL} is a meme token with no intrinsic value or expectation of financial return. Entertainment only. Always DYOR.
          </div>
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

function BurnCard({ burn, now, index }: { burn: Burn; now: number; index: number }) {
  const ageMs = Math.max(0, now - burn.timestamp);
  const ageMin = ageMs / 60_000;
  const brightness = Math.max(0.65, 1 - ageMin / 180); // fades over ~3h
  const progress = Math.min(1, ageMin / 10);

  const exact = fmtExact(burn.timestamp);
  const ago = fmtAgo(now, burn.timestamp);

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
            {/* precise timestamp + relative */}
            <div className="text-sm text-white/60">
              {exact} <span className="text-white/35">({ago})</span>
            </div>
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
