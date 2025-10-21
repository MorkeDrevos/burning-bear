'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

// ---------- CONFIG ----------
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'Burning Bear';
const TOKEN_ADDRESS = 'So1ana...111111';
const BURN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// ---------- TYPES ----------
type Burn = { id: string; amount: number; timestamp: number; tx: string };

// ---------- HELPERS ----------
const rnd = (min: number, max: number) =>
  Math.floor(min + Math.random() * (max - min + 1));

const fakeTx = () => {
  const c = '0123456789abcdef';
  let s = 'https://explorer.solana.com/tx/0x';
  for (let i = 0; i < 64; i++) s += c[Math.floor(Math.random() * c.length)];
  return s;
};

const fmtInt = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });

const fmtClock = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, '0');
  const s = String(total % 60).padStart(2, '0');
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

const timeTintClass = (ts: number, now: number) => {
  const ageSec = (now - ts) / 1000;
  if (ageSec < 120) return 'text-amber-200';
  if (ageSec < 600) return 'text-amber-300';
  if (ageSec < 3600) return 'text-amber-400/90';
  return 'text-amber-400/70';
};

// ---------- PAGE ----------
export default function Page() {
  const [now, setNow] = useState(Date.now());
  const [ready, setReady] = useState(false);
  const [burns, setBurns] = useState<Burn[]>([]);
  const [displayBurned, setDisplayBurned] = useState(5_550_000);
  const [copied, setCopied] = useState(false);
  const bucketRef = useRef<number>(-1);

  // mount
  useEffect(() => {
    setReady(true);
    const base = Date.now();
    const demo: Burn[] = Array.from({ length: 12 }).map((_, i) => ({
      id: `b${i}`,
      amount: rnd(700_000, 4_600_000),
      timestamp: base - (i + 1) * rnd(60_000, 15 * 60_000),
      tx: fakeTx(),
    }));
    setBurns(demo.sort((a, b) => b.timestamp - a.timestamp));
  }, []);

  // tick
  useEffect(() => {
    const int = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(int);
  }, []);

  // next burn target
  const nextBurnAt = useMemo(() => {
    const mod = now % BURN_INTERVAL_MS;
    return now + (BURN_INTERVAL_MS - mod);
  }, [now]);

  const timeToNext = Math.max(0, nextBurnAt - now);

  // demo: add a burn each interval
  useEffect(() => {
    const bucket = Math.floor(now / BURN_INTERVAL_MS);
    if (bucketRef.current === -1) {
      bucketRef.current = bucket;
      return;
    }
    if (bucket !== bucketRef.current) {
      bucketRef.current = bucket;
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

  const copyCA = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN_ADDRESS);
      setCopied(true);
      setTimeout(() => setCopied(false), 1300);
    } catch {}
  };

  if (!ready) return null;

  return (
    <main className="min-h-screen bg-[#0b1712] text-[#f7e6c2] font-sans">
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur bg-[#0b1712]/70 border-b border-emerald-900/30">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/img/coin-logo.png"
              alt="Burning Bear"
              className="h-9 w-9 rounded-full ring-1 ring-emerald-900/40"
            />
            <div className="text-left">
              <div className="text-sm opacity-90">Burning Bear</div>
              <div className="text-[11px] opacity-60">
                {TOKEN_SYMBOL} • Live Burn Camp
              </div>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm opacity-90">
            <a className="hover:opacity-100 opacity-80" href="#burns">
              Live Burns
            </a>
            <a className="hover:opacity-100 opacity-80" href="#how">
              How It Works
            </a>
            <a
              className="hover:opacity-100 opacity-80"
              href="https://t.me/"
              target="_blank"
              rel="noreferrer"
            >
              Community
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs px-3 py-1 rounded-full bg-emerald-900/40 ring-1 ring-emerald-800/50">
              So1ana…111111
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

      {/* HERO */}
      <section className="relative isolate overflow-hidden">
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
          <div className="absolute inset-0 bg-gradient-to-b from-[#0b1712]/40 via-[#0b1712]/55 to-[#0b1712]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 pt-16 pb-20 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl sm:text-6xl font-semibold tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.35)]">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdown */}
          <div className="mt-8">
            <div className="text-xs uppercase tracking-[0.2em] text-amber-200/60">
              Next burn in
            </div>
            <div className="mt-2 text-[40px] sm:text-[48px] font-semibold text-amber-100/60 drop-shadow-[0_1px_8px_rgba(0,0,0,0.35)]">
              {fmtClock(timeToNext)}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
            <Stat label="Initial Supply" value="1,000,000,000" />
            <Stat label="Burned (demo)" value={fmtInt(displayBurned)} accent />
            <Stat
              label="Current Supply"
              value={fmtInt(1_000_000_000 - displayBurned)}
            />
          </div>
        </div>
      </section>

      {/* LIVE BURNS */}
      <section id="burns" className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="text-4xl font-semibold mb-6">Live Burn Log</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {burns.map((b) => (
            <BurnCard key={b.id} burn={b} now={now} />
          ))}
        </div>
      </section>

      {/* HOW IT WORKS (anchor only to keep your layout) */}
      <section id="how" className="pb-24" />
    </main>
  );
}

// ---------- UI ----------
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
        accent
          ? 'border-amber-500/20 bg-amber-500/5'
          : 'border-emerald-900/40 bg-emerald-900/20'
      }`}
    >
      <div className="text-[11px] uppercase tracking-[0.2em] opacity-70">
        {label}
      </div>
      <div className="mt-2 text-2xl sm:text-3xl font-semibold">{value}</div>
    </div>
  );
}

function BurnCard({ burn, now }: { burn: Burn; now: number }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-900/40 bg-emerald-950/60">
      <div className="p-5 flex items-start gap-4">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/20">
          <span className="text-2xl">🔥</span>
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
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
          <div className={`mt-1 text-sm ${timeTintClass(burn.timestamp, now)}`}>
            {preciseTime(burn.timestamp)}
          </div>
          <div className="mt-4 h-3 rounded-full bg-emerald-900/50 overflow-hidden ring-1 ring-emerald-900/40">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-emerald-600"
              style={{
                width: `${30 + ((burn.amount % 70_000) / 70_000) * 60}%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
