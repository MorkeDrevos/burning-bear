'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'Burning Bear';
const TOKEN_ADDRESS = 'So1ana...111111';
const BURN_INTERVAL_MS = 10 * 60 * 1000; // 10m

type Burn = {
  id: string;
  amount: number;
  timestamp: number; // ms epoch
  tx: string;
};

/* =========================
   Helpers
========================= */
function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fakeTx() {
  const hex = '0123456789abcdef';
  let s = 'https://explorer.solana.com/tx/0x';
  for (let i = 0; i < 64; i++) s += hex[Math.floor(Math.random() * hex.length)];
  return s;
}

function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

// “21 Oct 14:07:23”
function fmtExact(ts: number) {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  const s = d.getSeconds().toString().padStart(2, '0');
  return `${day} ${mon} ${h}:${m}:${s}`;
}

/* =========================
   Demo burn data (in-memory)
========================= */
function seedBurns(now: number): Burn[] {
  // 12 demo burns across last ~3 hours
  return Array.from({ length: 12 }).map((_, i) => {
    const minutesAgo = rnd(5, 180);
    return {
      id: `${now}-${i}`,
      amount: rnd(800_000, 4_500_000),
      timestamp: now - minutesAgo * 60_000,
      tx: fakeTx(),
    };
  }).sort((a, b) => b.timestamp - a.timestamp);
}

/* =========================
   Page
========================= */
export default function Page() {
  const [now, setNow] = useState<number>(() => Date.now());
  const [burns, setBurns] = useState<Burn[]>(() => seedBurns(Date.now()));
  const [copied, setCopied] = useState(false);

  // Tick every second (muted countdown color)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Simulate a new burn every ~45–90s (for demo)
  useEffect(() => {
    const id = window.setInterval(() => {
      setBurns((prev) => [
        {
          id: String(Date.now()),
          amount: rnd(900_000, 4_600_000),
          timestamp: Date.now(),
          tx: fakeTx(),
        },
        ...prev,
      ].slice(0, 48)); // keep at most 48 in memory
    }, rnd(45_000, 90_000));
    return () => clearInterval(id);
  }, []);

  /* Countdown to next burn window (10 min buckets) */
  const msIntoWindow = now % BURN_INTERVAL_MS;
  const msLeft = BURN_INTERVAL_MS - msIntoWindow;
  const mm = Math.floor(msLeft / 60_000).toString().padStart(2, '0');
  const ss = Math.floor((msLeft % 60_000) / 1000).toString().padStart(2, '0');

  const initialSupply = 1_000_000_000;
  const burnedDemo = 5_550_000;
  const currentSupply = initialSupply - burnedDemo;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <main className="min-h-screen bg-[#0b1712] text-[#ffe6c2]">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#0b1712]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img
              src="/img/coin-logo.png"
              alt="Burning Bear"
              className="h-8 w-8 rounded-full shadow"
            />
            <div>
              <div className="text-sm font-semibold">The Burning Bear</div>
              <div className="text-xs text-white/50">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a className="hover:text-white/90" href="#burns">Live Burns</a>
            <a className="hover:text-white/90" href="#how">How It Works</a>
            <a className="hover:text-white/90" href="#community">Community</a>
          </nav>

          <div className="flex items-center gap-2">
            <span className="rounded-full bg-emerald-800/40 px-3 py-1 text-xs text-emerald-300 ring-1 ring-emerald-500/30">
              {TOKEN_ADDRESS}
            </span>
            <button
              onClick={handleCopy}
              className="rounded-full bg-[#ffdb99] px-3 py-1 text-xs font-semibold text-black shadow hover:brightness-95"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate">
        {/* background image/video could be swapped here */}
        <div
          className="pointer-events-none absolute inset-0 bg-[url('/img/burning-bear-frame.jpg')] bg-cover bg-center"
          aria-hidden
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1712]/10 via-[#0b1712]/60 to-[#0b1712]" />
        <div className="relative mx-auto max-w-6xl px-4 pt-16 pb-10">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          <div className="mt-8 text-xs font-semibold tracking-widest text-white/50">
            NEXT BURN IN
          </div>

          {/* Countdown (muted, less white) */}
          <div className="mt-2 text-4xl font-extrabold text-white/80 md:text-5xl">
            {mm}m {ss}s
          </div>

          {/* Stats */}
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Stat label="INITIAL SUPPLY" value={fmtInt(initialSupply)} />
            <Stat label="BURNED (DEMO)" value={fmtInt(burnedDemo)} />
            <Stat label="CURRENT SUPPLY" value={fmtInt(currentSupply)} />
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="burns" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/45">Demo data — TX links open explorer.</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {burns.map((b, i) => (
            <BurnCard key={b.id} burn={b} index={i} now={now} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <InfoCard title="80% → Buy & Burn">
            Creator fees auto-buy {TOKEN_SYMBOL} and burn them live. The campfire never sleeps.
          </InfoCard>
          <InfoCard title="20% → Team + Marketing">
            Fuels growth, creators, memes, and keeping the vibes bright.
          </InfoCard>
          <InfoCard title="Transparent">
            Every burn is posted with TX link &amp; timestamp. Public wallets, public camp.
          </InfoCard>
        </div>

        <p className="mt-6 text-sm text-white/50">
          Once upon a bear market, one dapper bear decided to fight the winter the only way he knew how, with fire. 🔥
          Now every transaction adds more logs to the blaze. No fake hype. Just steady, satisfying burns.
        </p>
      </section>

      <footer id="community" className="border-t border-white/5 px-4 py-10 text-center text-xs text-white/45">
        © {new Date().getFullYear()} The Burning Bear — The Classiest Arsonist in Crypto
        <div className="mt-2">This is a meme token with no intrinsic value or expectation of financial return. Entertainment only. Always DYOR.</div>
      </footer>
    </main>
  );
}

/* =========================
   UI bits
========================= */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/80 p-5 ring-emerald-500/0 transition hover:ring-2">
      <div className="text-[11px] uppercase tracking-widest text-white/45">{label}</div>
      <div className="mt-2 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/80 p-5">
      <div className="font-semibold">{title}</div>
      <div className="mt-2 text-sm text-white/65">{children}</div>
    </div>
  );
}

function BurnCard({ burn, now, index }: { burn: Burn; now: number; index: number }) {
  const ageMs = Math.max(0, now - burn.timestamp);
  const ageMin = ageMs / 60_000;

  // simple dimming: newer = brighter
  const brightness = Math.max(0.65, 1 - ageMin / 180); // fades over ~3h

  const progress = Math.min(1, ageMin / 10); // arbitrary demo progress bar fill

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

            {/* precise time */}
            <div className="text-sm text-white/55">{fmtExact(burn.timestamp)}</div>
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
