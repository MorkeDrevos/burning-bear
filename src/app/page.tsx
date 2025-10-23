'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

type Burn = {
  id: string;
  amount: number;
  sol?: number;
  timestamp: number; // ms epoch (UTC)
  tx: string;
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;
    priceUsdPerSol?: number; // fallback if live price fails
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;

    // easiest: “in 12m”, “in 45m”, or “21:30”
    nextBurnSpec?: string;
    nextBuybackSpec?: string;

    // alternatively: exact epoch times or last+interval
    nextBurnAt?: number;
    nextBuybackAt?: number;
    lastBurnAt?: number;
    lastBuybackAt?: number;
  };
  burns?: Burn[];
};

/* =========================
   Helpers
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
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}m ${r.toString().padStart(2, '0')}s`;
}
function parseSpecToMsNow(spec?: string): number | undefined {
  if (!spec) return;
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
  return;
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

  // tick
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // load JSON state
  useEffect(() => {
    let alive = true;
    fetch('/data/state.json', { cache: 'no-store' })
      .then(r => r.json())
      .then((j: StateJson) => alive && setData(j))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // live SOL price (falls back to stats.priceUsdPerSol)
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/sol-price', { cache: 'no-store' })
        .then(r => r.json())
        .then(o => {
          if (!alive) return;
          if (o && typeof o.usd === 'number' && o.usd > 0) setSolUsd(o.usd);
        })
        .catch(() => {});
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const priceUsdPerSol = solUsd ?? data?.stats?.priceUsdPerSol ?? null;

  const burnsSorted = useMemo(
    () => (data?.burns ?? []).slice().sort((a, b) => b.timestamp - a.timestamp),
    [data]
  );

  // countdown targets
  const targets = useMemo(() => {
    const s = data?.schedule ?? {};
    const bb =
      parseSpecToMsNow(s.nextBuybackSpec) ??
      s.nextBuybackAt ??
      (s.lastBuybackAt && s.buybackIntervalMs
        ? s.lastBuybackAt + s.buybackIntervalMs
        : undefined);

    const burn =
      parseSpecToMsNow(s.nextBurnSpec) ??
      s.nextBurnAt ??
      (s.lastBurnAt && s.burnIntervalMs
        ? s.lastBurnAt + s.burnIntervalMs
        : undefined);

    return { bb, burn };
  }, [data]);

  const nextBuybackMs = targets.bb ? targets.bb - now : 0;
  const nextBurnMs = targets.burn ? targets.burn - now : 0;

  // headline stats
  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);
  const totalSolSpent = data?.stats?.buybackSol ?? 0;
  const totalUsd = priceUsdPerSol ? totalSolSpent * priceUsdPerSol : undefined;

  // hero mini-stats
  const todayCount = useMemo(() => {
    if (!burnsSorted.length) return 0;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return burnsSorted.filter(b => b.timestamp >= start.getTime()).length;
  }, [burnsSorted]);

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
    copyTimer.current = window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main id="top">
      {/* ===== Sticky Header (bigger logo, amber nav, elegant CA) ===== */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
          <Link href="#top" className="flex items-center gap-3 md:gap-4">
            <img
              src="/img/coin-logo.png"
              alt={TOKEN_NAME}
              className="h-11 w-11 md:h-12 md:w-12 rounded-full shadow-md"
            />
            <div className="leading-tight">
              <div className="text-lg md:text-xl font-extrabold tracking-tight">
                {TOKEN_NAME}
              </div>
              <div className="text-[12px] md:text-sm text-white/55">
                {TOKEN_SYMBOL} • Live Burn Camp
              </div>
            </div>
          </Link>

          <nav className="hidden items-center gap-7 md:flex text-[15px] md:text-base">
            <a href="#log" className="text-amber-200/90 hover:text-amber-200">
              Live Burns
            </a>
            <a href="#how" className="text-amber-200/90 hover:text-amber-200">
              How It Works
            </a>
          </nav>

          <div className="flex items-center gap-2 md:gap-3">
            <span
              className="hidden md:inline rounded-full border border-emerald-400/25 bg-emerald-900/30 px-3.5 py-1.5 text-[13px] text-emerald-200/90"
              title={FULL_TOKEN_ADDRESS}
            >
              {truncateMiddle(FULL_TOKEN_ADDRESS)}
            </span>
            <button
              onClick={handleCopy}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition
                ${
                  copied
                    ? 'border-emerald-300 bg-emerald-300 text-black'
                    : 'border-amber-200/50 bg-amber-100/90 text-black hover:bg-amber-200'
                }`}
              aria-live="polite"
            >
              {copied ? 'Copied' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* ===== Hero with video background ===== */}
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

        <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:pt-24">
          <h1 className="max-w-4xl text-5xl md:text-6xl font-extrabold leading-[1.05]">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Compact, bold countdowns (no boxes) */}
          <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="text-[12px] tracking-[0.3em] uppercase text-white/65">
                Next buyback in
              </div>
              <div className="mt-1 text-[40px] md:text-[48px] font-extrabold">
                {targets.bb ? fmtCountdown(nextBuybackMs) : '—'}
              </div>
            </div>
            <div>
              <div className="text-[12px] tracking-[0.3em] uppercase text-white/65">
                Next burn in
              </div>
              <div className="mt-1 text-[40px] md:text-[48px] font-extrabold">
                {targets.burn ? fmtCountdown(nextBurnMs) : '—'}
              </div>
            </div>
          </div>

          {/* Stat cards row (like your shot) */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Initial supply" value={fmtInt(INITIAL)} />
            <Stat label="Burned" value={fmtInt(BURNED)} />
            <Stat label="Current supply" value={fmtInt(CURRENT)} />
            <Stat label="Buyback spent" value={`${(data?.stats?.buybackSol ?? 0).toFixed(2)} SOL`} />
          </div>

          {/* Soft pills row (like your previous design) */}
          <div className="mt-4 flex flex-wrap gap-3">
            <Pill>{`Today: ${todayCount} burn${todayCount === 1 ? '' : 's'}`}</Pill>
            <Pill>{`Total Buyback Value: ${fmtMoney(totalUsd)}`}</Pill>
            <Pill>{`Live SOL: ${fmtMoney(priceUsdPerSol ?? undefined)}`}</Pill>
          </div>
        </div>
      </section>

      {/* ===== Live Burn Log ===== */}
      <section id="log" className="mx-auto max-w-6xl px-4 pb-12">
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

      {/* ===== How it works ===== */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-bold">How It Works</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 text-white/85 md:grid-cols-3">
          <HowCard
            title="80% → Buy & Burn"
            body="Creator fees auto-buy $BEAR and burn them live — the campfire never sleeps."
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

      {/* Footer */}
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

// stat card (glass, like screenshot)
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[#101d17]/75 p-5 backdrop-blur">
      <div className="text-[11px] uppercase tracking-[0.18em] text-white/60">{label}</div>
      <div className="mt-1 text-[26px] font-extrabold">{value}</div>
    </div>
  );
}

// small translucent pill chip
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-[15px] text-white/90 backdrop-blur">
      {children}
    </div>
  );
}

function HowCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-[#101d17]/75 p-5 backdrop-blur">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-white/75">{body}</div>
    </div>
  );
}

// burn card (no yellow timeline dots)
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
          {/* flame badge kept subtle */}
          <span className="inline-grid h-11 w-11 place-items-center rounded-full bg-orange-200/85 text-xl">
            🔥
          </span>
          <div>
            <div className="text-lg font-bold">
              Burn • {fmtInt(burn.amount)} BEAR
            </div>
            <div className="text-sm text-white/65">{fmtWhen(burn.timestamp)}</div>
            {burn.sol !== undefined && (
              <div className="text-sm text-white/75">
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
