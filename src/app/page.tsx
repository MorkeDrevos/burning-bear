'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config / constants
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

// X (Twitter) link
const X_URL = 'https://x.com/your-handle-or-community'; // ← replace

/* =========================
   Types (matches /public/data/state.json)
========================= */
type Burn = {
  id: string;
  amount: number;
  sol?: number;
  timestamp: number; // ms epoch
  tx: string;
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;
    priceUsdPerSol?: number;
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;
    nextBurnSpec?: string;     // "in 45m" | "21:30"
    nextBuybackSpec?: string;  // "in 12m" | "21:10"
    nextBurnAt?: number;       // ms epoch
    nextBuybackAt?: number;    // ms epoch
    lastBurnAt?: number;
    lastBuybackAt?: number;
  };
  burns?: Burn[];
};

/* =========================
   Utils
========================= */
function truncateMiddle(str: string, left = 6, right = 6) {
  if (!str || str.length <= left + right + 1) return str;
  return `${str.slice(0, left)}…${str.slice(-right)}`;
}
function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtMoney(n?: number) {
  if (!n || !isFinite(n)) return '$0.00';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function fmtWhen(ts: number) {
  const d = new Date(ts);
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
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
// parse "in 12m" or "21:30" → returns ms epoch (now + … or next wallclock time)
function parseSpecToMsNow(spec?: string): number | undefined {
  if (!spec) return undefined;
  const now = Date.now();
  const s = spec.trim().toLowerCase();

  if (s.startsWith('in')) {
    let mins = 0;
    const h = s.match(/(\d+)\s*h/);
    const m = s.match(/(\d+)\s*m/);
    if (h) mins += parseInt(h[1], 10) * 60;
    if (m) mins += parseInt(m[1], 10);
    return mins > 0 ? now + mins * 60_000 : undefined;
  }

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
function isSameUTCDate(a: number, b: number) {
  const A = new Date(a), B = new Date(b);
  return A.getUTCFullYear() === B.getUTCFullYear() &&
         A.getUTCMonth() === B.getUTCMonth() &&
         A.getUTCDate() === B.getUTCDate();
}

/* =========================
   Page
========================= */
export default function Page() {
  const [data, setData] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  // ticking clock for countdowns
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // fetch JSON state
  useEffect(() => {
    let alive = true;
    fetch('/data/state.json', { cache: 'no-store' })
      .then(r => r.json())
      .then((j: StateJson) => alive && setData(j))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // live SOL price (falls back to stats.priceUsdPerSol)
  useEffect(() => {
    let alive = true;
    const fetchPrice = () =>
      fetch('/api/sol-price', { cache: 'no-store' })
        .then(r => r.json())
        .then(o => { if (alive && o && typeof o.usd === 'number' && o.usd > 0) setSolUsd(o.usd); })
        .catch(() => {});
    fetchPrice();
    const id = window.setInterval(fetchPrice, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const priceUsdPerSol = solUsd ?? data?.stats?.priceUsdPerSol ?? null;

  // derived: sorted burns + "today" quick totals
  const { burnsTodayCount, burnsTodayAmount, burnsSorted } = useMemo(() => {
    const burns = (data?.burns ?? []).slice().sort((a, b) => b.timestamp - a.timestamp);
    const today = Date.now();
    const todays = burns.filter(b => isSameUTCDate(b.timestamp, today));
    return {
      burnsSorted: burns,
      burnsTodayCount: todays.length,
      burnsTodayAmount: todays.reduce((acc, b) => acc + b.amount, 0),
    };
  }, [data]);

  // next targets (buyback / burn)
  const targets = useMemo(() => {
    const s = data?.schedule ?? {};
    const bbSpec = parseSpecToMsNow(s.nextBuybackSpec) ?? s.nextBuybackAt;
    const burnSpec = parseSpecToMsNow(s.nextBurnSpec) ?? s.nextBurnAt;

    const bb = bbSpec ?? (s.lastBuybackAt && s.buybackIntervalMs
      ? s.lastBuybackAt + s.buybackIntervalMs
      : undefined);

    const burn = burnSpec ?? (s.lastBurnAt && s.burnIntervalMs
      ? s.lastBurnAt + s.burnIntervalMs
      : undefined);

    return { bb, burn };
  }, [data]);

  const nextBuybackMs = targets.bb ? targets.bb - now : 0;
  const nextBurnMs = targets.burn ? targets.burn - now : 0;

  // base stats
  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED  = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);
  const totalSolSpent = data?.stats?.buybackSol ?? 0;
  const totalUsd = priceUsdPerSol ? totalSolSpent * priceUsdPerSol : undefined;

  // copy CA
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
      {/* ===== Sticky Header ===== */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
          <Link href="#top" className="flex items-center gap-3 md:gap-4">
            <img
              src="/img/coin-logo.png"
              alt={TOKEN_NAME}
              className="h-10 w-10 md:h-12 md:w-12 rounded-full shadow-md"
            />
            <div className="leading-tight">
              <div className="text-base md:text-xl font-extrabold">{TOKEN_NAME}</div>
              <div className="text-[12px] md:text-sm text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex md:gap-8 text-sm md:text-base">
            <a href="#log" className="hover:text-amber-300">Live Burns</a>
            <a href="#how" className="hover:text-amber-300">How It Works</a>
            <a
              href={X_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 hover:text-amber-300"
              aria-label="Open on X"
            >
              <XIcon className="h-4 w-4 md:h-5 md:w-5" />
              <span className="hidden sm:inline">X</span>
            </a>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <span
              className="hidden md:inline rounded-full bg-emerald-900/40 px-4 py-2 text-sm text-emerald-300"
              title={FULL_TOKEN_ADDRESS}
            >
              {truncateMiddle(FULL_TOKEN_ADDRESS)}
            </span>
            <button
              onClick={handleCopy}
              className={`rounded-full px-4 py-2 text-sm md:text-base font-semibold transition
                ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
              aria-live="polite"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero with VIDEO & overlay ===== */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <video
            className="h-[66vh] w-full object-cover"
            playsInline
            autoPlay
            muted
            loop
            poster="/img/burning-bear-frame.jpg"
          >
            <source src="/img/burning-bear.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#0b1712]/35 to-[#0b1712]" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-8 px-4 pb-10 pt-16 sm:pt-24">
          <h1 className="max-w-4xl text-5xl md:text-6xl font-extrabold leading-tight">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

{/* Countdowns only (no date echo) */}
<div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
   
  <div>
    <div className="text-xs uppercase tracking-[0.25em] text-white/55">Next buyback in</div>
    <div className="text-3xl md:text-4xl font-extrabold text-white/85">
      {targets.bb ? fmtCountdown(nextBuybackMs) : '—'}
    </div>
  </div>
  <div>
    <div className="text-xs uppercase tracking-[0.25em] text-white/55">Next burn in</div>
    <div className="text-3xl md:text-4xl font-extrabold text-white/85">
      {targets.burn ? fmtCountdown(nextBurnMs) : '—'}
    </div>
  </div>
</div>

          {/* compact metric strip */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Metric label="Initial Supply" value={fmtInt(INITIAL)} />
            <Metric label="Burned" value={fmtInt(BURNED)} />
            <Metric label="Current Supply" value={fmtInt(CURRENT)} />
            <Metric label="Buyback Spent" value={`${(totalSolSpent).toFixed(2)} SOL`} />
          </div>

          {/* chips row */}
          <div className="flex flex-wrap gap-2">
            <Chip>Today: {burnsTodayCount} burn{burnsTodayCount !== 1 ? 's' : ''}</Chip>
            <Chip>Total Buyback Value: {fmtMoney(totalUsd)}</Chip>
            {priceUsdPerSol ? <Chip>Live SOL: {fmtMoney(priceUsdPerSol)}</Chip> : <Chip>Live SOL: —</Chip>}
          </div>
        </div>
      </section>

      {/* ===== Live Burn Log (timeline style) ===== */}
      <section id="log" className="mx-auto max-w-6xl px-4 pb-14">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Live Burn Log</h2>
          <span className="text-sm text-white/50">TX links open explorer</span>
        </div>

        <div className="relative mt-6">
          {/* timeline spine (desktop) */}
          <div className="pointer-events-none absolute left-4 top-0 hidden h-full w-[2px] bg-white/10 md:block" />
          <div className="space-y-4">
            {burnsSorted.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-6 text-white/60">
                No burns posted yet.
              </div>
            )}
            {burnsSorted.map((b, i) => (
              <TimelineBurn key={b.id} burn={b} price={priceUsdPerSol ?? 0} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ===== How it Works ===== */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-bold">How It Works</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 text-white/85 md:grid-cols-3">
          <HowCard title="80% → Buy & Burn" body="Creator fees auto-buy $BEAR and burn them live — the campfire never sleeps." />
          <HowCard title="20% → Team + Marketing" body="Fuels growth, creators, memes, and keeps the vibes bright." />
          <HowCard title="Transparent" body="Every buyback & burn is posted with TX link & timestamp. Public wallets, public camp." />
        </div>
      </section>

      {/* ===== Footer ===== */}
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
function CountdownTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 px-5 py-4 backdrop-blur">
      <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{label}</div>
      <div className="mt-1 text-3xl font-extrabold text-white/90">{value}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-sm text-white/70">
      {children}
    </span>
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

function TimelineBurn({ burn, price, index }: { burn: Burn; price: number; index: number }) {
  const usd = burn.sol && price ? burn.sol * price : undefined;
  const ageMin = Math.max(0, (Date.now() - burn.timestamp) / 60_000);
  const brightness = Math.max(0.7, 1 - ageMin / 180);
  const progress = Math.min(1, ageMin / 10);

  return (
    <div
      className="relative rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2 md:pl-12"
      style={{ filter: `brightness(${brightness})` }}
    >
      {/* timeline dot (desktop) */}
      <div className="absolute -left-[11px] top-6 hidden h-4 w-4 rounded-full bg-gradient-to-br from-amber-300 to-orange-500 md:block" />
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
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

/** Minimal X (Twitter) icon */
function XIcon({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
      <path d="M18.244 2H21L13.98 10.06 22 22h-6.373l-4.958-6.77L4.96 22H2l7.42-8.45L2 2h6.49l4.38 6.04L18.244 2z" />
    </svg>
  );
}
