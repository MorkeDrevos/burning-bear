'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'Burning Bear';
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';
const BURN_INTERVAL_MS = 10 * 60 * 1000;

/* =========================
   Demo burn data
========================= */
type Burn = {
  id: string;
  amount: number;
  timestamp: number;
  tx: string;
};

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
  const year = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss} · ${day} ${mon} ${year}`;
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
  const intervalId = useRef<number | null>(null);

  useEffect(() => {
    if (intervalId.current) window.clearInterval(intervalId.current);
    intervalId.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalId.current) window.clearInterval(intervalId.current);
      intervalId.current = null;
    };
  }, []);

  const nextBurnIn = BURN_INTERVAL_MS - (now % BURN_INTERVAL_MS);
  const mins = Math.floor(nextBurnIn / 60_000).toString().padStart(2, '0');
  const secs = Math.floor((nextBurnIn % 60_000) / 1000).toString().padStart(2, '0');

  const INITIAL_SUPPLY = 1_000_000_000;
  const BURNED_DEMO = 5_550_000;
  const CURRENT_SUPPLY = INITIAL_SUPPLY - BURNED_DEMO;

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
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main>
      {/* HEADER */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/85 backdrop-blur-lg">
  <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
    {/* Left: logo + title */}
    <div className="flex items-center gap-4">
      <img
        src="/img/coin-logo.png"
        alt="Burning Bear"
        className="h-12 w-12 rounded-full shadow-ember"
      />
      <div className="leading-tight">
        <div className="text-lg font-extrabold tracking-wide">The Burning Bear</div>
        <div className="text-sm text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
      </div>
    </div>

    {/* Center: nav */}
    <nav className="hidden gap-10 text-base font-semibold md:flex">
      <a href="#log" className="hover:text-amber-300 transition-colors">Live Burns</a>
      <a href="#how" className="hover:text-amber-300 transition-colors">How It Works</a>
      <a href="#community" className="hover:text-amber-300 transition-colors">Community</a>
    </nav>

    {/* Right: address + copy */}
    <div className="flex items-center gap-3">
      <span
        className="hidden md:inline rounded-full bg-emerald-900/40 px-4 py-2 text-sm text-emerald-300"
        title={FULL_TOKEN_ADDRESS}
      >
        {truncateMiddle(FULL_TOKEN_ADDRESS)}
      </span>
      <button
        className={`rounded-full px-5 py-2 text-sm font-semibold transition
          ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
        onClick={handleCopyCA}
        aria-live="polite"
      >
        {copied ? 'Copied!' : 'Copy CA'}
      </button>
    </div>
  </div>
</header>

      {/* HERO */}
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
          <h1 className="max-w-3xl text-6xl font-extrabold leading-tight sm:text-7xl md:text-8xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          <div className="mt-3 text-sm uppercase tracking-[0.25em] text-white/55">Next burn in</div>
          <div className="text-5xl font-extrabold text-white/85 sm:text-6xl">
            {mins}m {secs}s
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Initial Supply" value={fmtInt(INITIAL_SUPPLY)} />
            <Stat label="Burned (demo)" value={fmtInt(BURNED_DEMO)} />
            <Stat label="Current Supply" value={fmtInt(CURRENT_SUPPLY)} />
          </div>
        </div>
      </section>

      {/* LIVE BURNS */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">Demo data — TX links open explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {[...DEMO_BURNS]
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((b) => (
              <BurnCard key={b.id} burn={b} now={now} />
            ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ul className="mt-4 space-y-2 text-white/80">
          <li>80% → Buy & Burn — creator fees auto-buy {TOKEN_SYMBOL} and burn them live.</li>
          <li>20% → Team + Marketing — keeps the vibes bright.</li>
          <li>Transparent — every burn is posted with TX link & timestamp.</li>
        </ul>
      </section>

      {/* FOOTER */}
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
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function BurnCard({ burn, now }: { burn: Burn; now: number }) {
  const ageMs = Math.max(0, now - burn.timestamp);
  const ageMin = ageMs / 60_000;
  const brightness = Math.max(0.65, 1 - ageMin / 180);
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
