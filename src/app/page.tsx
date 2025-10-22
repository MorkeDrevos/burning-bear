// src/app/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/** =========================
 *  Types matching /public/data/state.json
 *  ========================= */
type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol: number;       // total SOL spent on buybacks
    priceUsdPerSol?: number;  // optional fallback
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;
    nextBurnSpec?: string;      // e.g. "in 45m" or "21:30"
    nextBuybackSpec?: string;   // e.g. "in 12m" or "21:10"
    nextBurnAt?: number;        // epoch ms (optional)
    nextBuybackAt?: number;     // epoch ms (optional)
    lastBurnAt?: number;        // optional history
    lastBuybackAt?: number;     // optional history
  };
  burns: Array<{
    id: string;
    amount: number;     // BEAR
    sol?: number;       // SOL used for that burn (optional)
    timestamp: number;  // epoch ms
    tx: string;
  }>;
};

/** =========================
 *  Helpers
 *  ========================= */
function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}
function fmtSol(n: number, dp = 4) {
  return `${n.toFixed(dp)} SOL`;
}
function fmtDateTime(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
function msUntil(spec: string): number {
  // Parses "in 45m", "in 2h", "in 1h 30m", or "HH:MM" (today or tomorrow)
  const now = new Date();
  const lower = spec.trim().toLowerCase();

  if (lower.startsWith('in ')) {
    let total = 0;
    const parts = lower.slice(3).split(' ');
    for (const p of parts) {
      const m = p.match(/^(\d+)(ms|s|m|h)$/);
      if (!m) continue;
      const v = parseInt(m[1], 10);
      const unit = m[2];
      if (unit === 'ms') total += v;
      else if (unit === 's') total += v * 1000;
      else if (unit === 'm') total += v * 60_000;
      else if (unit === 'h') total += v * 3_600_000;
    }
    return total;
  }

  // "HH:MM" wall-clock
  const hm = spec.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const h = parseInt(hm[1], 10);
    const m = parseInt(hm[2], 10);
    const target = new Date(now);
    target.setHours(h, m, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return target.getTime() - now.getTime();
  }
  return 0;
}
function nextFromSchedule(now: number, sched: StateJson['schedule'] | undefined, key: 'burn' | 'buyback'): number {
  if (!sched) return now + 60_000;
  const spec = key === 'burn' ? sched.nextBurnSpec : sched.nextBuybackSpec;
  const abs = key === 'burn' ? sched.nextBurnAt : sched.nextBuybackAt;
  const last = key === 'burn' ? sched.lastBurnAt : sched.lastBuybackAt;
  const interval = key === 'burn' ? (sched.burnIntervalMs ?? 0) : (sched.buybackIntervalMs ?? 0);

  if (spec && msUntil(spec) > 0) return now + msUntil(spec);
  if (abs && abs > now) return abs;
  if (last && interval) return last + interval > now ? last + interval : now + interval;
  return now + (interval || 10 * 60_000);
}
function useTick(ms = 1000) {
  const [, force] = useState(0);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    timer.current && clearInterval(timer.current);
    timer.current = window.setInterval(() => force((n) => n + 1), ms);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [ms]);
}
function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${ss.toString().padStart(2, '0')}s`;
  return `${m}m ${ss.toString().padStart(2, '0')}s`;
}

/** =========================
 *  Inline SVG — Glowing Campfire
 *  ========================= */
function CampfireSVG({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 220" className={className} aria-hidden="true" role="img">
      <defs>
        <filter id="fireGlow">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <radialGradient id="flameGrad" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#FFE4A1" />
          <stop offset="45%" stopColor="#FFB647" />
          <stop offset="100%" stopColor="#B85D1A" />
        </radialGradient>
        <linearGradient id="logGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#86502A" />
          <stop offset="100%" stopColor="#6E3B1A" />
        </linearGradient>
      </defs>

      {/* soft glow */}
      <ellipse cx="110" cy="105" rx="80" ry="60" fill="#FFB84D" opacity="0.18" filter="url(#fireGlow)" />

      {/* flame cluster */}
      <g filter="url(#fireGlow)">
        <path d="M110 35c-12 18-8 29 5 44 9 10 16 20 8 34-11 18-40 15-49-1-9-15 0-28 7-37 6-8 9-16 11-24 2-8 5-14 18-16z" fill="url(#flameGrad)" opacity="0.95" />
        <path d="M126 56c-6 9-2 18 6 26 6 6 8 14 2 22-7 9-23 8-29-1-6-8 0-16 5-21 4-5 6-9 7-14 1-5 3-8 9-12z" fill="#FFE7B1" opacity="0.6" />
      </g>

      {/* logs */}
      <rect x="60" y="150" width="100" height="16" rx="8" fill="url(#logGrad)" />
      <rect x="45" y="158" width="100" height="14" rx="7" transform="rotate(-6 45 158)" fill="url(#logGrad)" />
    </svg>
  );
}

/** =========================
 *  Page
 *  ========================= */
export default function Page() {
  const [data, setData] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  useTick(1000);

  // load JSON state
  useEffect(() => {
    let alive = true;
    fetch('/data/state.json', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: StateJson) => alive && setData(j))
      .catch(() => alive && setData(null));
    return () => {
      alive = false;
    };
  }, []);

  // live SOL price (fallback to state if fetch fails)
  useEffect(() => {
    let alive = true;
    fetch('/api/sol-price', { cache: 'no-store' })
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        if (typeof j.usd === 'number' && j.usd > 0) setSolUsd(j.usd);
        else if (data?.stats?.priceUsdPerSol) setSolUsd(data.stats.priceUsdPerSol);
      })
      .catch(() => {
        if (alive && data?.stats?.priceUsdPerSol) setSolUsd(data.stats.priceUsdPerSol);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!data]);

  // countdowns
  const now = Date.now();
  const nextBuybackAt = useMemo(() => nextFromSchedule(now, data?.schedule, 'buyback'), [now, data]);
  const nextBurnAt = useMemo(() => nextFromSchedule(now, data?.schedule, 'burn'), [now, data]);

  if (!data) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-6xl items-center justify-center px-4">
        <div className="text-xl text-white/70">Loading…</div>
      </main>
    );
  }

  const { stats, burns } = data;
  const price = solUsd ?? stats.priceUsdPerSol ?? 0;
  const buybackUsd = price && stats.buybackSol ? price * stats.buybackSol : 0;

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-60">
          <div className="mx-auto max-w-6xl px-4 pt-10">
            <CampfireSVG className="h-[200px] w-[200px] animate-pulse" />
          </div>
        </div>
        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-10 md:pt-14">
          <h1 className="max-w-4xl text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdowns (counting down only) */}
          <div className="mt-4 grid grid-cols-2 gap-6 sm:max-w-md sm:grid-cols-2 md:max-w-none">
            <div>
              <div className="text-xs uppercase tracking-widest text-white/55">Next buyback in</div>
              <div className="text-3xl font-extrabold">
                {fmtCountdown(nextBuybackAt - Date.now())}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-white/55">Next burn in</div>
              <div className="text-3xl font-extrabold">
                {fmtCountdown(nextBurnAt - Date.now())}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Stat label="Initial Supply" value={fmtInt(stats.initialSupply)} />
            <Stat label="Burned" value={fmtInt(stats.burned)} />
            <Stat label="Current Supply" value={fmtInt(stats.currentSupply)} />
            <Stat label="Buyback Spent" value={`${stats.buybackSol.toFixed(2)} SOL`} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-4 md:max-w-sm">
            <Stat label="Buyback Value (USD)" value={fmtUsd(buybackUsd)} />
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open explorer.</p>

        {burns?.length ? (
          <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[...burns]
              .sort((a, b) => b.timestamp - a.timestamp)
              .map((b) => (
                <BurnCard key={b.id} burn={b} solUsd={price} />
              ))}
          </div>
        ) : (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 text-white/60">
            No burns posted yet.
          </div>
        )}
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="mb-3 text-center text-2xl font-bold">How It Works</h2>
        <div className="mx-auto max-w-3xl space-y-4 text-white/85">
          <p>
            The Burning Bear campfire runs on transparency and timing. At regular intervals, a portion
            of buyback funds is used to repurchase and burn tokens forever — reducing supply and
            boosting scarcity.
          </p>
          <p>
            Each buyback and burn is recorded on the blockchain and reflected live here. The countdowns
            show exactly when the next events are scheduled to ignite.
          </p>
          <p>
            You can verify everything yourself on Solana Explorer — just follow the TX links in the log
            above. 🔥
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0d1a14]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-white/50">
          Once upon a bear market, one dapper bear decided to fight the winter the only way he knew how, with fire. 🔥
        </div>
      </footer>
    </main>
  );
}

/** =========================
 *  Small components
 *  ========================= */
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
  solUsd,
}: {
  burn: { id: string; amount: number; sol?: number; timestamp: number; tx: string };
  solUsd: number;
}) {
  const usd = burn.sol && solUsd ? burn.sol * solUsd : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">
            🔥
          </span>
          <div>
            <div className="text-lg font-bold">
              Burn • {burn.amount.toLocaleString('en-US', { maximumFractionDigits: 0 })} BEAR
            </div>
            <div className="text-sm text-white/70">{fmtDateTime(burn.timestamp)}</div>
            {burn.sol ? (
              <div className="mt-1 text-sm text-white/70">
                ≈ {fmtSol(burn.sol)}{usd ? ` (${fmtUsd(usd)})` : ''}
              </div>
            ) : null}
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
        <div className="h-3 w-[85%] rounded-full bg-gradient-to-r from-amber-400 to-orange-500" />
      </div>
    </div>
  );
}
