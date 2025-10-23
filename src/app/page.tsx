'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config (edit safely)
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';

// Full contract address (no ellipsis)
const FULL_CA =
  'So1ana1111111111111111111111111111111111111111111111111';

// Where we read your manual state
const STATE_URL = '/data/state.json';

// Optional live price endpoint (falls back to priceUsdPerSol from JSON)
const SOL_PRICE_API = '/api/sol-price';

/* =========================
   Types matching /public/data/state.json
========================= */
type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol: number;           // running SOL spent (manual)
    priceUsdPerSol?: number;      // fallback price when API fails
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;

    // Friendly phrases ("in 12m", "21:30")
    nextBurnSpec?: string;
    nextBuybackSpec?: string;

    // Or exact times (ms epoch)
    nextBurnAt?: number;
    nextBuybackAt?: number;

    // Or derive from last+interval
    lastBurnAt?: number;
    lastBuybackAt?: number;
  };
  burns: Array<{
    id: string;
    amount: number;
    sol?: number;           // optional per-burn SOL
    timestamp: number;      // ms since epoch
    tx: string;
  }>;
};

/* =========================
   Helpers
========================= */
const fmtInt = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });

const fmtMoney = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

function parseSpec(now: number, spec?: string): number | null {
  if (!spec) return null;
  const s = spec.trim().toLowerCase();

  // "in 12m", "in 1h", "in 1h30m"
  if (s.startsWith('in')) {
    const m = s.match(/(\d+)\s*h/);
    const hm = s.match(/(\d+)\s*m/);
    const hours = m ? parseInt(m[1], 10) : 0;
    const mins = hm ? parseInt(hm[1], 10) : 0;
    const ms = (hours * 60 + mins) * 60_000;
    return now + ms;
  }

  // "21:30"
  const t = s.match(/^(\d{1,2}):(\d{2})$/);
  if (t) {
    const hh = parseInt(t[1], 10);
    const mm = parseInt(t[2], 10);
    const target = new Date();
    target.setHours(hh, mm, 0, 0);
    if (target.getTime() <= now) target.setDate(target.getDate() + 1);
    return target.getTime();
  }
  return null;
}

function nextTimeFromSchedule(now: number, sch?: StateJson['schedule']) {
  if (!sch) return { nextBurnAt: 0, nextBuybackAt: 0 };

  let nextBurnAt =
    parseSpec(now, sch.nextBurnSpec) ??
    sch.nextBurnAt ??
    (sch.lastBurnAt && sch.burnIntervalMs
      ? sch.lastBurnAt + sch.burnIntervalMs
      : 0);

  let nextBuybackAt =
    parseSpec(now, sch.nextBuybackSpec) ??
    sch.nextBuybackAt ??
    (sch.lastBuybackAt && sch.buybackIntervalMs
      ? sch.lastBuybackAt + sch.buybackIntervalMs
      : 0);

  return { nextBurnAt, nextBuybackAt };
}

function prettyCountdown(msLeft: number) {
  const s = Math.max(0, Math.floor(msLeft / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}m ${ss.toString().padStart(2, '0')}s`;
}

function friendlyDate(ts: number) {
  const d = new Date(ts);
  const day = d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${day}, ${time}`;
}

/* =========================
   Tiny Icons
========================= */
function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className}>
      <path
        d="M18.24 3.56h2.51l-5.48 6.26 6.25 8.62h-4.89l-3.82-5.03-4.37 5.03H5.93l5.86-6.76L5.8 3.56h5.07l3.45 4.59 3.92-4.59Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* =========================
   Page
========================= */
export default function Page() {
  const [data, setData] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const tick = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  // tick every second
  useEffect(() => {
    tick.current && clearInterval(tick.current);
    tick.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      tick.current && clearInterval(tick.current);
      tick.current = null;
    };
  }, []);

  // load state
  useEffect(() => {
    let alive = true;
    fetch(STATE_URL, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: StateJson) => alive && setData(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // live SOL price (fallback to stats.priceUsdPerSol)
  useEffect(() => {
    let alive = true;
    fetch(SOL_PRICE_API, { cache: 'no-store' })
      .then((r) => r.json())
      .then((p) => alive && typeof p.priceUsdPerSol === 'number' && setSolUsd(p.priceUsdPerSol))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const priceUsd = solUsd ?? data?.stats.priceUsdPerSol ?? null;

  // countdowns
  const { nextBuybackLeft, nextBurnLeft } = useMemo(() => {
    if (!data) return { nextBuybackLeft: 0, nextBurnLeft: 0 };
    const { nextBurnAt, nextBuybackAt } = nextTimeFromSchedule(now, data.schedule);
    return {
      nextBuybackLeft: nextBuybackAt ? Math.max(0, nextBuybackAt - now) : 0,
      nextBurnLeft: nextBurnAt ? Math.max(0, nextBurnAt - now) : 0,
    };
  }, [now, data]);

  // derived
  const initial = data?.stats.initialSupply ?? 0;
  const burned = data?.stats.burned ?? 0;
  const current = data?.stats.currentSupply ?? Math.max(0, initial - burned);
  const buybackSol = data?.stats.buybackSol ?? 0;
  const buybackUsd = priceUsd ? buybackSol * priceUsd : null;

  // sorted burns (newest first)
  const burns = useMemo(
    () => (data?.burns ?? []).slice().sort((a, b) => b.timestamp - a.timestamp),
    [data]
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FULL_CA);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };

  return (
    <main className="min-h-screen bg-[#0c1411] text-white">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0e1814]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 md:px-6 py-3 md:py-4">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <img
              src="/img/coin-logo.png"
              alt="logo"
              className="h-10 w-10 md:h-12 md:w-12 rounded-full"
            />
            <div className="leading-tight">
              <div className="text-base md:text-xl font-extrabold">{TOKEN_NAME}</div>
              <div className="text-[11px] md:text-xs text-white/55">
                {TOKEN_SYMBOL} • Live Burn Camp
              </div>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8 text-sm">
            <a href="#log" className="hover:text-amber-300">Live Burns</a>
            <a href="#how" className="hover:text-amber-300">How It Works</a>
            <a
              href="https://x.com/your-handle"
              target="_blank"
              className="flex items-center gap-2 hover:text-emerald-300"
              rel="noopener noreferrer"
            >
              <XIcon className="h-4 w-4" />
              X
            </a>
          </nav>

          {/* CA */}
          <div className="flex items-center gap-2">
            <span
              className="hidden md:inline rounded-full bg-emerald-900/40 px-3 py-1 text-xs text-emerald-300"
              title={FULL_CA}
            >
              {FULL_CA.slice(0, 6)}…{FULL_CA.slice(-4)}
            </span>
            <button
              onClick={handleCopy}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition
                ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          {/* Use the video if present; otherwise the poster. */}
          <video
            className="h-[58vh] w-full object-cover"
            playsInline
            autoPlay
            muted
            loop
            poster="/img/burning-bear-frame.jpg"
          >
            <source src="/img/burning-bear.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0c1411]/40 to-[#0c1411]" />
        </div>

        <div className="mx-auto max-w-6xl px-4 md:px-6 pt-14 md:pt-20 pb-10 md:pb-16">
          <h1 className="max-w-4xl text-4xl md:text-6xl font-extrabold leading-tight drop-shadow-lg">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdowns */}
          <div className="mt-6 grid grid-cols-2 gap-4 max-w-xl">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-wider text-white/55">Next buyback in</div>
              <div className="mt-1 text-2xl md:text-3xl font-extrabold">
                {nextBuybackLeft ? prettyCountdown(nextBuybackLeft) : '—'}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <div className="text-[11px] uppercase tracking-wider text-white/55">Next burn in</div>
              <div className="mt-1 text-2xl md:text-3xl font-extrabold">
                {nextBurnLeft ? prettyCountdown(nextBurnLeft) : '—'}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Initial Supply" value={fmtInt(initial)} />
            <StatCard label="Burned" value={fmtInt(burned)} />
            <StatCard label="Current Supply" value={fmtInt(current)} />
            <StatCard label="Buyback Spent" value={`${(buybackSol ?? 0).toFixed(2)} SOL`} />
          </div>

          <div className="mt-4 max-w-sm">
            <StatCard
              label="Buyback Value (USD)"
              value={buybackUsd != null ? fmtMoney(buybackUsd) : '—'}
            />
          </div>
        </div>
      </section>

      {/* Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 md:px-6 pb-16">
        <h2 className="text-xl md:text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {burns.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-6 text-white/60">
              No burns posted yet.
            </div>
          )}

          {burns.map((b) => (
            <BurnCard key={b.id} burn={b} priceUsd={priceUsd} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-white/10 bg-[#0f1a16]">
        <div className="mx-auto max-w-5xl px-4 md:px-6 py-12">
          <h2 className="text-2xl font-bold">How It Works</h2>
          <div className="mt-3 space-y-3 text-white/80 leading-relaxed">
            <p>
              Every few minutes, a portion of fees is used to repurchase and burn {TOKEN_SYMBOL} —
              permanently reducing supply. All activity is posted here with timestamps and TX links.
            </p>
            <p>
              Countdowns show when the next buyback and burn are scheduled. You can manually adjust
              the next times in <code className="text-white/70">/public/data/state.json</code> via
              <code className="text-white/70">nextBuybackSpec</code> / <code className="text-white/70">nextBurnSpec</code>
              (e.g., <em>“in 12m”</em> or <em>“21:30”</em>).
            </p>
            <p>
              Verify everything on Solana Explorer — just follow the TX links in the burn log.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0d1a14]">
        <div className="mx-auto max-w-6xl px-4 md:px-6 py-6 text-center text-sm text-white/50">
          Once upon a bear market, one dapper bear decided to fight the winter the only way he knew
          how — with fire. 🔥
        </div>
      </footer>
    </main>
  );
}

/* =========================
   Components
========================= */
function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function BurnCard({
  burn,
  priceUsd,
}: {
  burn: { id: string; amount: number; sol?: number; timestamp: number; tx: string };
  priceUsd: number | null;
}) {
  const solLine =
    burn.sol != null
      ? `≈ ${burn.sol.toFixed(4)} SOL${
          priceUsd ? ` (${fmtMoney(burn.sol * priceUsd)})` : ''
        }`
      : priceUsd
      ? `≈ ${((burn.amount || 0) / 1_000_000_000 * 0).toFixed(4)} SOL`
      : '';

  // visual age fade (newer = brighter)
  const ageMs = Math.max(0, Date.now() - burn.timestamp);
  const ageMin = ageMs / 60_000;
  const brightness = clamp(1 - ageMin / 180, 0.7, 1);
  const progress = clamp(ageMin / 10, 0, 1);

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
            <div className="text-lg font-bold">Burn • {fmtInt(burn.amount)} BEAR</div>
            <div className="text-sm text-white/60">{friendlyDate(burn.timestamp)}</div>
            {solLine && <div className="text-sm text-white/70 mt-0.5">{solLine}</div>}
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
          className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-600"
          style={{ width: `${Math.floor(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
