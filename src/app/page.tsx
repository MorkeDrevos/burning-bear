'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */

// Put your real full CA here
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

// How often to refresh price/state (ms)
const PRICE_REFRESH_MS = 60_000;
const STATE_REFRESH_MS = 60_000;

/* =========================
   Types matching /public/data/state.json
========================= */
type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number; // total SOL spent on buybacks
    priceUsdPerSol?: number; // fallback price if API fails
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;

    // human specs (either this…) e.g. "in 45m", "in 12m", "21:30"
    nextBurnSpec?: string;
    nextBuybackSpec?: string;

    // …or exact times (epoch ms)
    nextBurnAt?: number;
    nextBuybackAt?: number;

    // optional history fallbacks
    lastBurnAt?: number;
    lastBuybackAt?: number;
  };
  ops?: {
    lastClaimAt?: number;
    lastMarketingFundAt?: number;
    marketingWallet?: string;
    notes?: string;
  };
  burns: Array<{
    id: string;
    amount: number; // BEAR
    sol?: number; // SOL spent for that burn (optional, will estimate USD w/ price)
    timestamp: number; // ms epoch
    tx: string;
  }>;
};

/* =========================
   Helpers
========================= */

function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function two(n: number) {
  return n.toString().padStart(2, '0');
}
function fmtClock(msLeft: number) {
  if (msLeft < 0) msLeft = 0;
  const s = Math.floor(msLeft / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ss = s % 60;
  if (h > 0) return `${h}h ${two(mm)}m ${two(ss)}s`;
  return `${mm}m ${two(ss)}s`;
}

function fmtDateLine(ts: number) {
  const d = new Date(ts);
  // e.g. "Wed, Oct 30, 2024, 07:21 PM"
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function truncateMiddle(str: string, left = 6, right = 4) {
  if (!str || str.length <= left + right + 1) return str;
  return `${str.slice(0, left)}…${str.slice(-right)}`;
}

function parseSpecToEpoch(spec: string | undefined, now: number): number | null {
  if (!spec) return null;
  const s = spec.trim().toLowerCase();
  // "in 45m" or "in 12m", also support "in 1h" / "in 1h 20m"
  const inMatch = /^in\s+(\d+)\s*m(?:in)?(?:\s*(\d+)\s*s)?$/i.exec(s);
  const inHM = /^in\s+(\d+)\s*h(?:\s*(\d+)\s*m(?:in)?)?$/i.exec(s);
  if (inMatch) {
    const m = parseInt(inMatch[1] || '0', 10);
    const sec = parseInt(inMatch[2] || '0', 10);
    return now + (m * 60 + sec) * 1000;
  }
  if (inHM) {
    const h = parseInt(inHM[1] || '0', 10);
    const m = parseInt(inHM[2] || '0', 10);
    return now + (h * 3600 + m * 60) * 1000;
  }
  // "21:30" today (or tomorrow if it already passed)
  const timeMatch = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (timeMatch) {
    const hh = parseInt(timeMatch[1], 10);
    const mm = parseInt(timeMatch[2], 10);
    const d = new Date(now);
    d.setHours(hh, mm, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  return null;
}

function nextTargetMs(
  now: number,
  spec: string | undefined,
  explicitAt: number | undefined,
  lastAt: number | undefined,
  intervalMs: number | undefined
) {
  const fromSpec = parseSpecToEpoch(spec, now);
  if (fromSpec) return fromSpec;
  if (explicitAt && explicitAt > now) return explicitAt;
  if (lastAt && intervalMs && lastAt > 0) return lastAt + intervalMs;
  return null;
}

/* =========================
   Page
========================= */

export default function Page() {
  const [data, setData] = useState<StateJson | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [copied, setCopied] = useState(false);

  // tick every second for countdowns
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // load state.json and auto-refresh
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/data/state.json', { cache: 'no-store' })
        .then((r) => r.json())
        .then((j: StateJson) => alive && setData(j))
        .catch(() => {});
    load();
    const id = setInterval(load, STATE_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // live SOL price (optional /api/sol-price), fallback to stats.priceUsdPerSol
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/sol-price', { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((j: { price: number }) => alive && setPrice(j.price))
        .catch(() => {});
    load();
    const id = setInterval(load, PRICE_REFRESH_MS);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const solPrice = price ?? data?.stats.priceUsdPerSol ?? 0;

  const solSpent = useMemo(() => {
    if (!data?.burns?.length) return 0;
    return data.burns.reduce((acc, b) => acc + (b.sol ?? 0), 0);
  }, [data]);

  const solUsd = solSpent * (solPrice || 0);

  // Determine next countdown targets
  const buybackClock = useMemo(() => {
    if (!data) return '—';
    const s = data.schedule ?? {};
    const t = nextTargetMs(
      now,
      s.nextBuybackSpec,
      s.nextBuybackAt,
      s.lastBuybackAt,
      s.buybackIntervalMs
    );
    if (!t) return '—';
    return fmtClock(t - now);
  }, [data, now]);

  const burnClock = useMemo(() => {
    if (!data) return '—';
    const s = data.schedule ?? {};
    const t = nextTargetMs(now, s.nextBurnSpec, s.nextBurnAt, s.lastBurnAt, s.burnIntervalMs);
    if (!t) return '—';
    return fmtClock(t - now);
  }, [data, now]);

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

  if (!data) {
    return (
      <main className="min-h-screen bg-[#0b1712] text-white">
        <div className="mx-auto max-w-6xl px-4 py-24 text-white/70">Loading…</div>
      </main>
    );
  }

  const stats = data.stats;

  return (
    <main className="min-h-screen bg-[#0b1712] text-white">
      {/* ===== Header (client) ===== */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/img/coin-logo.png" alt="Burning Bear" className="h-8 w-8 rounded-full" />
            <div className="leading-tight">
              <div className="text-sm font-bold">The Burning Bear</div>
              <div className="text-[11px] text-white/55">$BEAR • Live Burn Camp</div>
            </div>
          </div>

          <nav className="hidden gap-6 text-sm md:flex">
            <a href="#log" className="hover:text-amber-300">
              Live Burns
            </a>
            <a href="#how" className="hover:text-amber-300">
              How It Works
            </a>
          </nav>

          <div className="flex items-center gap-2">
            <span
              title={FULL_TOKEN_ADDRESS}
              className="hidden rounded-full bg-emerald-900/40 px-3 py-1 text-xs text-emerald-300 md:inline"
            >
              {truncateMiddle(FULL_TOKEN_ADDRESS)}
            </span>
            <button
              onClick={handleCopyCA}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
                copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'
              }`}
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* ===== HERO (restored) ===== */}
      <section className="relative">
        {/* Background video */}
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

        {/* Content */}
        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 pt-20 sm:pt-24">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdowns */}
          <div className="mt-2 grid max-w-xl grid-cols-2 gap-6 text-white/85">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/55">Next buyback in</div>
              <div className="text-3xl font-extrabold sm:text-4xl">{buybackClock}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/55">Next burn in</div>
              <div className="text-3xl font-extrabold sm:text-4xl">{burnClock}</div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Initial Supply" value={fmtInt(stats.initialSupply)} />
            <Stat label="Burned" value={fmtInt(stats.burned)} />
            <Stat label="Current Supply" value={fmtInt(stats.currentSupply)} />
            <Stat label="Buyback Spent" value={`${(solSpent || 0).toFixed(2)} SOL`} />
          </div>

          {/* Buyback USD */}
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="rounded-2xl border border-transparent p-5 sm:col-span-3" />
            <Stat
              label="Buyback Value (USD)"
              value={`$${(solUsd || 0).toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`}
            />
          </div>
        </div>
      </section>

      {/* ===== Live Burn Log ===== */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {[...data.burns]
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((b) => (
              <BurnCard key={b.id} burn={b} solPrice={solPrice} />
            ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">How It Works</h2>
        <div className="mt-4 space-y-4 text-white/85">
          <p>
            The Burning Bear campfire runs on transparency and timing. A portion of revenue is
            periodically used to buy back $BEAR and burn it forever — reducing supply and keeping the
            vibes toasty.
          </p>
          <p>
            Every buyback and burn has a public TX. Countdowns show when the next events are
            scheduled to ignite. You can verify everything yourself on Solana Explorer via the TX links
            above.
          </p>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/10 bg-[#0d1a14]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-white/50">
          Once upon a bear market, one dapper bear decided to fight the winter the only way he knew
          how, with fire. 🔥
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

function BurnCard({
  burn,
  solPrice,
}: {
  burn: { id: string; amount: number; sol?: number; timestamp: number; tx: string };
  solPrice: number;
}) {
  const amount = burn.amount;
  const sol = burn.sol ?? 0;
  const usd = sol * (solPrice || 0);

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">
            🔥
          </span>
          <div>
            <div className="text-lg font-bold">Burn • {fmtInt(amount)} BEAR</div>
            <div className="text-sm text-white/60">{fmtDateLine(burn.timestamp)}</div>
            <div className="text-sm text-white/70">
              ≈ {sol.toFixed(4)} SOL{' '}
              {usd > 0 &&
                `($${usd.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })})`}
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
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
