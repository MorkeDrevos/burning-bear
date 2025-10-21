'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

// ---------- CONFIG ----------
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'Burning Bear';
const TOKEN_ADDRESS = 'Solana…111111'; // put real CA here
const BURN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// ---------- DEMO DATA (replace with real feed later) ----------
type Burn = {
  id: string;
  amount: number;
  timestamp: number; // ms epoch
  tx: string;
};

function rnd(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
function fakeTx(): string {
  const c = '0123456789abcdef';
  let s = 'https://explorer.solana.com/tx/0x';
  for (let i = 0; i < 64; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
}

// ---------- FONTS (system fallbacks) ----------
const headingClass = 'font-serif';
const bodyClass = 'font-sans';

// Format helpers
const fmtInt = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });

const fmtClock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(total % 60)
    .toString()
    .padStart(2, '0');
  return `${m}m ${s}s`;
};

const preciseTime = (t: number) =>
  new Date(t).toLocaleString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    day: '2-digit',
    month: 'short',
  });

// recency tint for burn time label
function timeTintClass(ts: number, now: number) {
  const ageSec = (now - ts) / 1000;
  if (ageSec < 120) return 'text-amber-200'; // <2m fresh
  if (ageSec < 600) return 'text-amber-300'; // <10m
  if (ageSec < 3600) return 'text-amber-400/90'; // <1h
  return 'text-amber-400/70'; // older
}

// ---------- PAGE ----------
export default function Page() {
  // hydrate guard avoids SSR/CSR time mismatches
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return null;

  // now / ticking
  const [now, setNow] = useState(Date.now());
  const ticking = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ticking.current && clearInterval(ticking.current);
    ticking.current = setInterval(() => setNow(Date.now()), 1000);
    return () => ticking.current && clearInterval(ticking.current);
  }, []);

  // demo burns
  const [burns, setBurns] = useState<Burn[]>([]);
  const [displayBurned, setDisplayBurned] = useState(5_550_000); // demo counter
  const [copied, setCopied] = useState(false);

  // seed some demo burns on mount (stable timestamps)
  useEffect(() => {
    const base = Date.now();
    const demo: Burn[] = Array.from({ length: 12 }).map((_, i) => ({
      id: `b${i}`,
      amount: rnd(700_000, 4_600_000),
      timestamp: base - (i + 1) * rnd(60_000, 15 * 60_000),
      tx: fakeTx(),
    }));
    setBurns(demo.sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  // next burn target (aligned every 10 minutes)
  const nextBurnAt = useMemo(() => {
    const mod = now % BURN_INTERVAL_MS;
    return now + (BURN_INTERVAL_MS - mod);
  }, [now]);

  const timeToNext = Math.max(0, nextBurnAt - now);

  // simulate burn when the window flips (demo)
  const prevBucket = useRef<number>(-1);
  useEffect(() => {
    const bucket = Math.floor(now / BURN_INTERVAL_MS);
    if (prevBucket.current === -1) {
      prevBucket.current = bucket;
      return;
    }
    if (bucket !== prevBucket.current) {
      prevBucket.current = bucket;
      // "perform" a demo burn
      const amt = rnd(800_000, 4_800_000);
      const burn: Burn = {
        id: `b${now}`,
        amount: amt,
        timestamp: now,
        tx: fakeTx(),
      };
      setBurns((b) => [burn, ...b].slice(0, 24));
      setDisplayBurned((x) => x + amt);
    }
  }, [now]);

  // header copy
  const copyCA = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };

  // smooth scroll
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });
  const goTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <main className={`${bodyClass} min-h-screen bg-[#0b1712] text-[#f7e6c2]`}>
      {/* --- Header (sticky) --- */}
      <header className="sticky top-0 z-40 backdrop-blur bg-[#0b1712]/70 border-b border-emerald-900/30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <button
            onClick={scrollToTop}
            className="flex items-center gap-3 group"
            aria-label="Back to top"
          >
            <img
              src="/img/coin-logo.png"
              alt="Burning Bear"
              className="h-9 w-9 rounded-full ring-1 ring-emerald-900/40 group-hover:ring-amber-400/60 transition"
            />
            <div className="text-left">
              <div className="text-sm leading-none opacity-80">{TOKEN_NAME}</div>
              <div className="text-[11px] leading-none opacity-60">
                {TOKEN_SYMBOL} • Live Burn Camp
              </div>
            </div>
          </button>

          <nav className="hidden md:flex items-center gap-8 text-amber-200/90">
            <button onClick={() => goTo('burns')} className="hover:text-amber-200">
              Live Burns
            </button>
            <button onClick={() => goTo('how')} className="hover:text-amber-200">
              How It Works
            </button>
            <a
              href="https://x.com/MorkeDrevos"
              target="_blank"
              rel="noreferrer"
              className="hover:text-amber-200"
            >
              Community
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs px-3 py-1 rounded-full bg-emerald-900/40 ring-1 ring-emerald-800/50">
              {TOKEN_ADDRESS.slice(0, 6)}…{TOKEN_ADDRESS.slice(-6)}
            </span>
            <button
              onClick={copyCA}
              className="rounded-full px-4 py-2 text-sm bg-amber-300 text-[#0b1712] hover:bg-amber-200 transition"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* --- Hero --- */}
      <section
        id="hero"
        className="relative isolate overflow-hidden"
        aria-label="Hero"
      >
        {/* background video / image */}
        <div className="absolute inset-0 -z-10">
          <video
            className="h-full w-full object-cover"
            autoPlay
            muted
            loop
            playsInline
            poster="/img/burning-bear-frame.jpg"
          >
            <source src="/img/burning-bear.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1712]/40 via-[#0b1712]/45 to-[#0b1712]"></div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-16 pb-20">
          <h1
            className={`${headingClass} text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-semibold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]`}
          >
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdown — toned down brightness */}
          <div className="mt-8">
            <div className="text-xs uppercase tracking-[0.2em] text-amber-200/65">
              Next burn in
            </div>
            <div className="mt-2 text-[40px] sm:text-[52px] md:text-[64px] leading-none font-semibold text-amber-100/80 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
              {fmtClock(timeToNext)}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Initial Supply" value="1,000,000,000" />
            <Stat label="Burned (demo)" value={fmtInt(displayBurned)} accent />
            <Stat label="Current Supply" value={fmtInt(1_000_000_000 - displayBurned)} />
          </div>

          {/* Removed the extra Copy CA under stats per request */}
        </div>
      </section>

      {/* --- Live Burns --- */}
      <section id="burns" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className={`${headingClass} text-3xl sm:text-4xl font-semibold`}>
          Live Burn Log
        </h2>
        <p className="mt-2 text-sm text-amber-200/70">
          Demo data — TX links open explorer.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5">
          {burns.slice(0, 12).map((b) => (
            <BurnCard key={b.id} burn={b} now={now} />
          ))}
        </div>
      </section>

      {/* --- How it works --- */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className={`${headingClass} text-3xl sm:text-4xl font-semibold`}>
          How it works
        </h2>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <InfoCard title="80% → Buy & Burn">
            Creator fees auto-buy {TOKEN_SYMBOL} and burn them live — the campfire never
            sleeps.
          </InfoCard>
          <InfoCard title="20% → Team + Marketing">
            Fuels growth, creators, memes, and keeping the vibes bright.
          </InfoCard>
          <InfoCard title="Transparent">
            Every burn is posted with TX link & timestamp. Public wallets, public camp.
          </InfoCard>
        </div>

        <p className="mt-8 text-sm text-amber-200/80 leading-relaxed max-w-3xl">
          Once upon a bear market, one dapper bear decided to fight the winter the only
          way he knew how, with fire. 🔥 Now every transaction adds more logs to the
          blaze. No fake hype. Just steady, satisfying burns.
        </p>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-emerald-900/30 bg-[#0b1712]/80">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-amber-200/75">
          © {new Date().getFullYear()} The Burning Bear — The Classiest Arsonist in Crypto
          • {TOKEN_SYMBOL} is a meme token with no intrinsic value or expectation of
          financial return. Entertainment only. Always DYOR.
        </div>
      </footer>
    </main>
  );
}

// ---------- UI Bits ----------
function Stat({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string | number;
  accent?: boolean;
}) {
  return (
    <div
      className={`p-5 rounded-2xl border ${
        accent ? 'border-amber-500/20 bg-amber-500/5' : 'border-emerald-900/40 bg-emerald-900/20'
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.2em] opacity-70">{label}</div>
      <div className="mt-2 text-2xl sm:text-3xl font-semibold">{value}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-2xl bg-emerald-900/15 border border-emerald-900/40">
      <div className="font-semibold text-amber-100">{title}</div>
      <div className="text-sm mt-2 opacity-85">{children}</div>
    </div>
  );
}

function BurnCard({ burn, now }: { burn: Burn; now: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-900/40 bg-emerald-950/60">
      <div className="p-5 flex items-start gap-4">
        <div className="shrink-0">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
            <span className="text-2xl">🔥</span>
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3">
            <div className="text-amber-100 text-lg font-semibold truncate">
              Burn • {fmtInt(burn.amount)} BEAR
            </div>
            <a
              href={burn.tx}
              target="_blank"
              rel="noreferrer"
              className="text-amber-200/90 underline underline-offset-4 hover:text-amber-200"
            >
              TX
            </a>
          </div>

          {/* precise timestamp + recency tint */}
          <div className={`mt-1 text-sm ${timeTintClass(burn.timestamp, now)}`}>
            {preciseTime(burn.timestamp)}
          </div>

          {/* progress bar (decorative) */}
          <div className="mt-4 h-3 rounded-full bg-emerald-900/50 overflow-hidden ring-1 ring-emerald-900/40">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-emerald-600"
              style={{ width: `${30 + ((burn.amount % 70_000) / 70_000) * 60}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
