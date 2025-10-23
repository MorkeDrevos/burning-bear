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

/** Where we load your manual state from */
const STATE_URL = '/data/state.json';

/** Optional live price API (falls back to stats.priceUsdPerSol) */
const SOL_PRICE_API = '/api/sol-price';

/* =========================
   Types matching your JSON
========================= */
type Burn = {
  id: string;
  amount: number;
  /** optional SOL spent for this burn */
  sol?: number;
  /** can be ms epoch OR a date string; we normalize it */
  timestamp: number | string;
  tx: string;
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply?: number; // optional; when absent we compute initial - burned
    buybackSol?: number;
    priceUsdPerSol?: number;
  };
  schedule?: {
    /** optional fixed cadence (ms) for fallback */
    burnIntervalMs?: number;
    buybackIntervalMs?: number;

    /** Easiest way for you: "in 12m", "in 1h 15m", or "21:30" */
    nextBurnSpec?: string;
    nextBuybackSpec?: string;

    /** Or set fixed times (ms epoch OR date string) */
    nextBurnAt?: number | string;
    nextBuybackAt?: number | string;

    /** Fallback: we can compute last + interval if set */
    lastBurnAt?: number | string;
    lastBuybackAt?: number | string;
  };
  burns?: Burn[];
};

/* =========================
   Tiny helpers
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
  const m = Math.floor(t / 60);
  const s = t % 60;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}

/** Accepts a spec like "in 12m", "in 1h 30m", or "21:30" (today/tomorrow, local). */
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
    if (d.getTime() <= now) d.setDate(d.getDate() + 1); // if passed, schedule for tomorrow
    return d.getTime();
  }
  return undefined;
}

/** Accepts a number (ms), ISO string, or local "YYYY-MM-DD HH:MM" and returns ms epoch. */
function parseAnyTs(v?: number | string): number | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v !== 'string') return undefined;

  const s = v.trim();
  // numeric string
  if (/^\d+$/.test(s)) return Number(s);

  // ISO or parseable by Date
  const iso = Date.parse(s);
  if (!Number.isNaN(iso)) return iso;

  // "YYYY-MM-DD HH:MM" in local time
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})$/);
  if (m) {
    const [, yy, MM, dd, HH, mm] = m.map(Number);
    const d = new Date(yy, MM - 1, dd, HH, mm, 0, 0);
    return d.getTime();
  }
  return undefined;
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

  // 1) ticking clock
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // 2) load your JSON (manual data)
  useEffect(() => {
    let alive = true;
    fetch(STATE_URL, { cache: 'no-store' })
      .then(r => r.json())
      .then((j: StateJson) => alive && setData(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // 3) live SOL price (fallback to stats.priceUsdPerSol)
  useEffect(() => {
    let alive = true;
    const fetchPrice = () =>
      fetch(SOL_PRICE_API, { cache: 'no-store' })
        .then(r => r.json())
        .then(o => {
          if (!alive) return;
          if (o && typeof o.usd === 'number' && o.usd > 0) setSolUsd(o.usd);
        })
        .catch(() => {});
    fetchPrice();
    const id = window.setInterval(fetchPrice, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const priceUsdPerSol = solUsd ?? data?.stats?.priceUsdPerSol ?? null;

  // Normalize burn timestamps so you can paste strings or numbers
  const burnsNormalized: Burn[] = useMemo(() => {
    const src = data?.burns ?? [];
    return src
      .map(b => ({
        ...b,
        timestamp: parseAnyTs(b.timestamp) ?? Date.now(),
      }))
      .sort((a, b) => (b.timestamp as number) - (a.timestamp as number));
  }, [data]);

  // figure out next targets
  const { nextBuybackAt, nextBurnAt } = useMemo(() => {
    const s = data?.schedule ?? {};

    const nbSpec = parseSpecToMsNow(s.nextBuybackSpec);
    const nbAt = parseAnyTs(s.nextBuybackAt);
    const lbAt = parseAnyTs(s.lastBuybackAt);

    const burnSpec = parseSpecToMsNow(s.nextBurnSpec);
    const burnAt = parseAnyTs(s.nextBurnAt);
    const lastBurn = parseAnyTs(s.lastBurnAt);

    const bb =
      nbSpec ??
      nbAt ??
      (lbAt && s.buybackIntervalMs ? lbAt + s.buybackIntervalMs : undefined);

    const bn =
      burnSpec ??
      burnAt ??
      (lastBurn && s.burnIntervalMs ? lastBurn + s.burnIntervalMs : undefined);

    return { nextBuybackAt: bb, nextBurnAt: bn };
  }, [data]);

  const nextBuybackMs = nextBuybackAt ? nextBuybackAt - now : 0;
  const nextBurnMs = nextBurnAt ? nextBurnAt - now : 0;

  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED = data?.stats?.burned ?? 0;
  const CURRENT =
    data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);

  const totalSolSpent = data?.stats?.buybackSol ?? 0;
  const totalUsd = priceUsdPerSol ? totalSolSpent * priceUsdPerSol : undefined;

  // mini strip: "Today" + "Total Buyback Value" + "Live SOL"
  const strip = useMemo(() => {
    const today = new Date(now);
    const y = today.getFullYear(),
      m = today.getMonth(),
      d = today.getDate();
    const start = new Date(y, m, d).getTime();
    const end = new Date(y, m, d + 1).getTime();

    const burnsToday = burnsNormalized.filter(
      b =>
        (b.timestamp as number) >= start &&
        (b.timestamp as number) < end,
    ).length;

    // (current behavior) total USD = stats.buybackSol * livePrice
    const livePrice = priceUsdPerSol ?? 0;
    const totalBuybackUsd = (data?.stats?.buybackSol ?? 0) * livePrice;

    // if you want "sum of burns shown" instead, swap the line above for:
    // const totalBuybackUsd = burnsNormalized.reduce((acc, b) => acc + (b.sol ?? 0) * livePrice, 0);

    return {
      burnsToday,
      totalBuybackUsd,
      livePrice,
    };
  }, [now, burnsNormalized, priceUsdPerSol, data?.stats?.buybackSol]);

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
      {/* ===== Sticky Header (bigger, no Twitter link) ===== */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
          <Link href="#top" className="flex items-center gap-3 md:gap-4">
            <img
              src="/img/coin-logo.png"
              alt={TOKEN_NAME}
              className="h-10 w-10 md:h-12 md:w-12 rounded-full shadow-md"
            />
            <div className="leading-tight">
              <div className="text-base md:text-xl font-extrabold">
                {TOKEN_NAME}
              </div>
              <div className="text-[12px] md:text-sm text-white/55">
                {TOKEN_SYMBOL} • Live Burn Camp
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-8 md:flex text-sm md:text-base">
            <a href="#log" className="hover:text-amber-300">
              Live Burns
            </a>
            <a href="#how" className="hover:text-amber-300">
              How It Works
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <span
              className="hidden md:inline rounded-full bg-emerald-900/40 px-4 py-2 text-sm text-emerald-300"
              title={FULL_TOKEN_ADDRESS}
            >
              {truncateMiddle(FULL_TOKEN_ADDRESS)}
            </span>
            <button
              onClick={handleCopy}
              className={`rounded-full px-4 py-2 text-sm md:text-base font-semibold transition
                ${
                  copied
                    ? 'bg-emerald-400 text-black'
                    : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'
                }`}
              aria-live="polite"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero with VIDEO and gradient overlay ===== */}
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

        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-16 sm:pt-24">
          <h1 className="max-w-4xl text-5xl md:text-6xl font-extrabold leading-tight">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdowns (smaller, no boxes) */}
          <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/60">
                Next buyback in
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white/85 leading-none">
                {nextBuybackAt ? fmtCountdown(nextBuybackMs) : '—'}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/60">
                Next burn in
              </div>
              <div className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white/85 leading-none">
                {nextBurnAt ? fmtCountdown(nextBurnMs) : '—'}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Initial Supply" value={fmtInt(INITIAL)} />
            <Stat label="Burned" value={fmtInt(BURNED)} />
            <Stat label="Current Supply" value={fmtInt(CURRENT)} />
            <Stat
              label="Buyback Spent"
              value={`${(data?.stats?.buybackSol ?? 0).toFixed(2)} SOL`}
            />
          </div>

          {/* Mini strip: Today / Total Buyback Value / Live SOL */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Pill>
              <span className="text-white/60">Today:</span>{' '}
              {strip.burnsToday} burn{strip.burnsToday === 1 ? '' : 's'}
            </Pill>
            <Pill>
              <span className="text-white/60">Total Buyback Value:</span>{' '}
              {fmtMoney(strip.totalBuybackUsd)}
            </Pill>
            <Pill>
              <span className="text-white/60">Live SOL:</span>{' '}
              {strip.livePrice ? `$${strip.livePrice.toFixed(2)}` : '—'}
            </Pill>
          </div>
        </div>
      </section>

      {/* ===== Live Burn Log ===== */}
      <section id="log" className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {burnsNormalized.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-6 text-white/60">
              No burns posted yet.
            </div>
          )}
          {burnsNormalized.map(b => (
            <BurnCard key={b.id} burn={b} price={priceUsdPerSol ?? 0} />
          ))}
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-bold">How It Works</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 text-white/85 md:grid-cols-3">
          <HowCard
            title="80% → Buy & Burn"
            body={`Creator fees auto-buy ${TOKEN_SYMBOL} and burn them live — the campfire never sleeps.`}
          />
          <HowCard
            title="20% → Team + Marketing"
            body="Fuels growth, creators, memes, and keeping the vibes bright."
          />
          <HowCard
            title="Transparent"
            body="Every buyback & burn is posted with TX link & timestamp. Public wallets, public camp."
          />
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/10 bg-[#0d1a14]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-white/50">
          Once upon a bear market, one dapper bear decided to fight the winter
          the only way he knew how, with fire. 🔥
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
      <div className="text-[11px] uppercase tracking-wider text-white/55">
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/75">
      {children}
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
  const ts = burn.timestamp as number;
  const usd = burn.sol && price ? burn.sol * price : undefined;

  // fade slightly with age + subtle progress bar
  const ageMin = Math.max(0, (Date.now() - ts) / 60_000);
  const brightness = Math.max(0.7, 1 - ageMin / 180);
  const progress = Math.min(1, ageMin / 10);

  return (
    <div
      className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2"
      style={{ filter: `brightness(${brightness})` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {/* simple flame badge (no yellow dots / timeline bullets) */}
          <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">
            🔥
          </span>
          <div>
            <div className="text-lg font-bold">
              Burn • {fmtInt(burn.amount)} BEAR
            </div>
            <div className="text-sm text-white/60">{fmtWhen(ts)}</div>
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
