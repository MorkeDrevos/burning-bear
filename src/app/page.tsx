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

const BURN_INTERVAL_MS = 10 * 60 * 1000; // 10 min

// 👇 DEMO price for display ONLY. When live, store `sol` per burn.
const PRICE_SOL_PER_BEAR = 0.0000002; // demo: 0.0000002 SOL per BEAR

/* =========================
   Demo burn data (static)
========================= */
type Burn = {
  id: string;
  amount: number;     // BEAR burned
  timestamp: number;  // ms epoch
  tx: string;
  sol?: number;       // SOL spent (set in live mode; derived for demo)
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
  { id: 'c', amount: 1_076_983, timestamp: agoMinutes(9),  tx: fakeTx() },
];

/* =========================
   Utils
========================= */
function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtSol(n: number) {
  // show 4–6 decimals depending on size, always trim trailing zeros
  const s = n.toLocaleString('en-US', {
    minimumFractionDigits: n < 1 ? 6 : 4,
    maximumFractionDigits: n < 1 ? 6 : 4,
  });
  return s.replace(/\.?0+$/, '');
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
  const [mobileOpen, setMobileOpen] = useState(false);
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

  // derive demo SOL totals using the constant
  const demoBurnsWithSol = DEMO_BURNS.map((b) => ({
    ...b,
    sol: b.sol ?? b.amount * PRICE_SOL_PER_BEAR,
  }));
  const TOTAL_SOL_DEMO = demoBurnsWithSol.reduce((sum, b) => sum + (b.sol || 0), 0);

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

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main>
      {/* ================= Header ================= */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        {/* Desktop / Tablet */}
        <div className="mx-auto hidden max-w-6xl items-center justify-between px-5 py-4 md:flex">
          {/* Left (Logo + Title) */}
          <div
            className="flex flex-1 items-center gap-3 cursor-pointer hover:opacity-90 transition"
            onClick={scrollToTop}
          >
            <img
              src="/img/coin-logo.png"
              alt="Burning Bear"
              className="h-9 w-9 rounded-full shadow-ember"
            />
            <div className="leading-tight">
              <div className="text-base font-extrabold">The Burning Bear</div>
              <div className="text-[12px] text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </div>

          {/* Center Nav */}
          <nav className="flex flex-1 justify-center gap-12 text-base font-semibold">
            <a href="#log" className="hover:text-amber-300 transition-colors">Live Burns</a>
            <a href="#how" className="hover:text-amber-300 transition-colors">How It Works</a>
            <a href="#community" className="hover:text-amber-300 transition-colors">Community</a>
          </nav>

          {/* Right */}
          <div className="flex flex-1 items-center justify-end gap-3">
            <span
              className="hidden lg:inline rounded-full bg-emerald-900/40 px-3 py-1.5 text-sm text-emerald-300"
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

        {/* Mobile Header */}
        <div className="mx-auto flex items-center justify-between px-4 py-3 md:hidden">
          {/* Logo + Name clickable */}
          <div
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition"
            onClick={scrollToTop}
          >
            <img
              src="/img/coin-logo.png"
              alt="Burning Bear"
              className="h-8 w-8 rounded-full shadow-ember"
            />
            <span className="text-[15px] font-extrabold">The Burning Bear</span>
          </div>

          {/* Copy + Menu */}
          <div className="flex items-center gap-2">
            <button
              className={`rounded-full px-3 py-1 text-xs font-semibold transition
                ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
              onClick={handleCopyCA}
              aria-live="polite"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>

            <button
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5"
              onClick={() => setMobileOpen(v => !v)}
              aria-label="Open Menu"
              aria-expanded={mobileOpen}
            >
              <div className="space-y-1.5">
                <span className="block h-0.5 w-5 bg-white/90"></span>
                <span className="block h-0.5 w-5 bg-white/90"></span>
                <span className="block h-0.5 w-5 bg-white/90"></span>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileOpen && (
          <div className="md:hidden">
            <nav className="mx-3 mb-3 rounded-xl border border-white/10 bg-[#0f1f19]/95 px-4 py-3">
              <a href="#log" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-base hover:bg-white/5">Live Burns</a>
              <a href="#how" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-base hover:bg-white/5">How It Works</a>
              <a href="#community" onClick={() => setMobileOpen(false)} className="block rounded-lg px-2 py-2 text-base hover:bg-white/5">Community</a>
              <div className="mt-2 border-t border-white/10 pt-2 text-xs text-emerald-300/80">
                {truncateMiddle(FULL_TOKEN_ADDRESS)}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* ================= Hero ================= */}
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

          <div className="mt-2 text-sm uppercase tracking-[0.25em] text-white/55">Next burn in</div>
          <div className="text-4xl font-extrabold text-white/85 sm:text-5xl">
            {mins}m {secs}s
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Initial Supply" value={fmtInt(INITIAL_SUPPLY)} />
            <Stat label="Burned (demo)" value={fmtInt(BURNED_DEMO)} />
            <Stat label="Current Supply" value={fmtInt(CURRENT_SUPPLY)} />
            <Stat label="Buyback Spent (SOL, demo)" value={`${fmtSol(TOTAL_SOL_DEMO)} SOL`} />
          </div>
        </div>
      </section>

      {/* ================= Live Burn Log ================= */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">Demo data — TX links open explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {[...demoBurnsWithSol]
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((b) => (
              <BurnCard key={b.id} burn={b} now={now} />
            ))}
        </div>
      </section>

      {/* ================= How it Works ================= */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ul className="mt-4 space-y-2 text-white/80">
          <li>80% → Buy & Burn — creator fees auto-buy {TOKEN_SYMBOL} and burn them live.</li>
          <li>20% → Team + Marketing — keeps the vibes bright.</li>
          <li>Transparent — every burn is posted with TX link & timestamp (incl. SOL spent).</li>
        </ul>
      </section>

      {/* ================= Footer ================= */}
      <footer id="community" className="border-t border-white/10 bg-[#0d1a14]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-white/50">
          Once upon a bear market, one dapper bear decided to fight the winter the only way he knew how — with fire. 🔥
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

  // derive SOL spent if not given (demo)
  const solSpent = burn.sol ?? burn.amount * PRICE_SOL_PER_BEAR;

  return (
    <div
      className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2"
      style={{ filter: `brightness(${brightness})` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">🔥</span>
          <div>
            <div className="text-lg font-bold">
              Burn • {fmtInt(burn.amount)} BEAR
            </div>
            <div className="text-sm text-white/60">
              {exact} <span className="text-white/35">({ago})</span>
            </div>
            <div className="mt-1 text-sm text-amber-300/90">
              ≈ {fmtSol(solSpent)} SOL
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
