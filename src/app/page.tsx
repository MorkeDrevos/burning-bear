// src/app/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config / constants
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';
const FULL_TOKEN_ADDRESS = 'So1ana1111111111111111111111111111111111111111111111111';

type Burn = {
  id: string;
  amount: number;   // BEAR (integer)
  sol?: number;     // optional, SOL spent for this burn
  timestamp: number; // ms since epoch
  tx: string;
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;     // total SOL spent
    priceUsdPerSol?: number; // optional fallback if API is down
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;
    nextBurnSpec?: string;      // "in 45m" or "21:30"
    nextBuybackSpec?: string;   // "in 12m" or "21:10"
    nextBurnAt?: number;        // absolute ms
    nextBuybackAt?: number;     // absolute ms
    lastBurnAt?: number;        // last event time
    lastBuybackAt?: number;
  };
  burns?: Burn[];
};

function truncateMiddle(str: string, left = 6, right = 4) {
  if (!str || str.length <= left + right + 1) return str;
  return `${str.slice(0, left)}…${str.slice(-right)}`;
}

function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtMoney(n: number | undefined) {
  if (!n || !isFinite(n)) return '$0.00';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}
function fmtWhen(ts: number) {
  const d = new Date(ts);
  // Wed, Oct 30, 2024 • 07:21 PM
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
function fmtCountdown(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

/** parse "in 12m" or "21:30" (local time today, or tomorrow if already passed) */
function parseSpecToMsNow(spec?: string): number | undefined {
  if (!spec) return undefined;
  const now = Date.now();
  const s = spec.trim().toLowerCase();

  // "in 12m", "in 1h", "in 1h 30m"
  if (s.startsWith('in')) {
    let mins = 0;
    const m = s.match(/(\d+)\s*m/);
    const h = s.match(/(\d+)\s*h/);
    if (h) mins += parseInt(h[1], 10) * 60;
    if (m) mins += parseInt(m[1], 10);
    if (mins > 0) return now + mins * 60_000;
    return undefined;
  }

  // "21:30"
  const hm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const H = parseInt(hm[1], 10);
    const M = parseInt(hm[2], 10);
    const d = new Date();
    d.setSeconds(0, 0);
    d.setHours(H, M, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  return undefined;
}

export default function Page() {
  const [data, setData] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const copyTimer = useRef<number | null>(null);
  const [copied, setCopied] = useState(false);

  // tick every second for countdowns
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // fetch state.json (manual source of truth)
  useEffect(() => {
    let alive = true;
    fetch('/data/state.json', { cache: 'no-store' })
      .then(r => r.json())
      .then((j: StateJson) => alive && setData(j))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // fetch live SOL price (falls back to json if absent)
  useEffect(() => {
    let alive = true;
    const getPrice = () =>
      fetch('/api/sol-price', { cache: 'no-store' })
        .then(r => r.json())
        .then(o => {
          if (!alive) return;
          if (o && typeof o.usd === 'number' && o.usd > 0) {
            setSolUsd(o.usd);
          }
        })
        .catch(() => {});
    getPrice();
    const id = window.setInterval(getPrice, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const priceUsdPerSol = solUsd ?? data?.stats?.priceUsdPerSol ?? null;
  const burnsSorted = useMemo(() => {
    return (data?.burns ?? []).slice().sort((a, b) => b.timestamp - a.timestamp);
  }, [data]);

  // countdown targets (buyback & burn)
  const targets = useMemo(() => {
    const s = data?.schedule ?? {};
    const nb = parseSpecToMsNow(s.nextBuybackSpec);
    const nbu = typeof s.nextBuybackAt === 'number' ? s.nextBuybackAt : undefined;
    const nbs = nb ?? nbu;

    const b = parseSpecToMsNow(s.nextBurnSpec);
    const bu = typeof s.nextBurnAt === 'number' ? s.nextBurnAt : undefined;
    const bs = b ?? bu;

    let buybackAt = nbs;
    let burnAt = bs;

    // interval fallbacks if nothing set
    if (!buybackAt && s.lastBuybackAt && s.buybackIntervalMs) {
      buybackAt = s.lastBuybackAt + s.buybackIntervalMs;
    }
    if (!burnAt && s.lastBurnAt && s.burnIntervalMs) {
      burnAt = s.lastBurnAt + s.burnIntervalMs;
    }

    return { buybackAt, burnAt };
  }, [data]);

  const nextBuybackMs = targets.buybackAt ? targets.buybackAt - now : 0;
  const nextBurnMs = targets.burnAt ? targets.burnAt - now : 0;

  const totalSolSpent = useMemo(() => data?.stats?.buybackSol ?? 0, [data]);
  const totalUsd = useMemo(
    () => (priceUsdPerSol ? totalSolSpent * priceUsdPerSol : undefined),
    [totalSolSpent, priceUsdPerSol]
  );

  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);

  const handleCopy = async () => {
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
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main id="top">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          {/* left: logo + title */}
          <Link href="#top" className="flex items-center gap-3">
            <img src="/img/coin-logo.png" alt="Burning Bear" className="h-8 w-8 rounded-full shadow-md" />
            <div className="leading-tight">
              <div className="text-sm font-bold">The Burning Bear</div>
              <div className="text-[11px] text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </Link>

          {/* center: nav */}
          <nav className="hidden gap-6 text-sm md:flex">
            <a href="#log" className="hover:text-amber-300">Live Burns</a>
            <a href="#how" className="hover:text-amber-300">How It Works</a>
          </nav>

          {/* right: CA bubble + copy */}
          <div className="flex items-center gap-2">
            <span
              className="hidden rounded-full bg-emerald-900/40 px-3 py-1 text-xs text-emerald-300 md:inline"
              title={FULL_TOKEN_ADDRESS}
            >
              {truncateMiddle(FULL_TOKEN_ADDRESS)}
            </span>
            <button
              onClick={handleCopy}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition
                ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
              aria-live="polite"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <img
            src="/img/burning-bear-frame.jpg"
            className="h-[60vh] w-full object-cover opacity-30"
            alt=""
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-[#0b1712]/30 to-[#0b1712]" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-12 pt-16 sm:pt-24">
          <h1 className="max-w-3xl text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdowns (time-left only) */}
          <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/55">Next buyback in</div>
              <div className="text-3xl font-extrabold text-white/85 sm:text-4xl">
                {targets.buybackAt ? fmtCountdown(nextBuybackMs) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/55">Next burn in</div>
              <div className="text-3xl font-extrabold text-white/85 sm:text-4xl">
                {targets.burnAt ? fmtCountdown(nextBurnMs) : '—'}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Initial Supply" value={fmtInt(INITIAL)} />
            <Stat label="Burned" value={fmtInt(BURNED)} />
            <Stat label="Current Supply" value={fmtInt(CURRENT)} />
            <Stat label="Buyback Spent" value={`${(totalSolSpent || 0).toFixed(2)} SOL`} />
          </div>

          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Buyback Value (USD)" value={fmtMoney(totalUsd)} />
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 pb-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {burnsSorted.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-6 text-white/60">
              No burns posted yet.
            </div>
          )}
          {burnsSorted.map((b) => (
            <BurnCard key={b.id} burn={b} price={priceUsdPerSol ?? 0} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-bold">How It Works</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 text-white/85 md:grid-cols-3">
          <HowCard title="80% → Buy & Burn" body="Creator fees auto-buy $BEAR and burn them live — the campfire never sleeps." />
          <HowCard title="20% → Team + Marketing" body="Fuels growth, creators, memes, and keeping the vibes bright." />
          <HowCard
            title="Transparent"
            body="Every buyback & burn is posted with TX link & timestamp. Public wallets, public camp."
          />
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

function HowCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-white/75">{body}</div>
    </div>
  );
}

function BurnCard({ burn, price }: { burn: Burn; price: number }) {
  const usd = burn.sol && price ? burn.sol * price : undefined;
  const ageMin = Math.max(0, (Date.now() - burn.timestamp) / 60_000);
  const brightness = Math.max(0.65, 1 - ageMin / 180);
  const progress = Math.min(1, ageMin / 10);

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
            <div className="text-sm text-white/60">{fmtWhen(burn.timestamp)}</div>
            {burn.sol !== undefined && (
              <div className="text-sm text-white/70">
                ≈ {burn.sol.toFixed(4)} SOL {usd ? `(${fmtMoney(usd)})` : ''}
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
