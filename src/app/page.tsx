// src/app/page.tsx
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';

// Full CA (no ellipsis)
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

// Public wallets (edit as needed)
const BURN_WALLET = 'AsH1VTFtR…NfF4m3Lh';
const TREASURY_WALLET = 'E8HkxwBy…EhH88DSH';
const MARKETING_WALLET = 'HLrvEbkD…UMjD6r0P';

// Explorer base (Solana)
const EXPLORER = 'https://explorer.solana.com';

/* =========================
   Types
========================= */
type Burn = {
  id: string;
  amount: number; // BEAR (integer)
  sol?: number;   // optional SOL value for the burn
  timestamp: number; // ms since epoch (UTC)
  tx: string;     // explorer link
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;     // total SOL spent
    priceUsdPerSol?: number; // fallback price if API down
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;

    // human “in 12m” | “21:30” (local wall clock)
    nextBurnSpec?: string;
    nextBuybackSpec?: string;

    // exact wall-clock ms (if you prefer)
    nextBurnAt?: number;
    nextBuybackAt?: number;

    // fallbacks (last + interval)
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
  if (n === undefined || !isFinite(n)) return '$0.00';
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
// parse "in 12m" or "21:30" (local time)
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
const startOfLocalDay = (ts: number) => {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/* =========================
   Page
========================= */
export default function Page() {
  const [data, setData] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  // ticking clock
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

  // live SOL price (60s)
  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/sol-price', { cache: 'no-store' })
        .then(r => r.json())
        .then(o => alive && typeof o?.usd === 'number' && o.usd > 0 && setSolUsd(o.usd))
        .catch(() => {});
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // price priority: API -> fallback from JSON
  const priceUsdPerSol = solUsd ?? data?.stats?.priceUsdPerSol ?? null;

  // burns sorted newest → oldest
  const burnsSorted = useMemo(
    () => (data?.burns ?? []).slice().sort((a, b) => b.timestamp - a.timestamp),
    [data]
  );

  // schedule targets
  const targets = useMemo(() => {
    const s = data?.schedule ?? {};
    const nb = parseSpecToMsNow(s.nextBuybackSpec) ?? s.nextBuybackAt;
    const buyback =
      nb ?? (s.lastBuybackAt && s.buybackIntervalMs ? s.lastBuybackAt + s.buybackIntervalMs : undefined);

    const nburn = parseSpecToMsNow(s.nextBurnSpec) ?? s.nextBurnAt;
    const burn =
      nburn ?? (s.lastBurnAt && s.burnIntervalMs ? s.lastBurnAt + s.burnIntervalMs : undefined);

    return { buyback, burn };
  }, [data]);

  const nextBuybackMs = targets.buyback ? targets.buyback - now : 0;
  const nextBurnMs = targets.burn ? targets.burn - now : 0;

  // headline stats
  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);

  const totalSolSpent = data?.stats?.buybackSol ?? 0;
  const totalUsd = priceUsdPerSol ? totalSolSpent * priceUsdPerSol : undefined;

  // Info chips below the stat cards
  const todayBurns = useMemo(() => {
    const list = burnsSorted;
    if (!list.length) return 0;
    const sod = startOfLocalDay(now);
    return list.filter(b => b.timestamp >= sod).length;
  }, [burnsSorted, now]);

  // week window (last 7 *local* days)
  const week = useMemo(() => {
    const end = now;
    const start = startOfLocalDay(end) - 6 * 24 * 60 * 60 * 1000;
    const list = burnsSorted.filter(b => b.timestamp >= start && b.timestamp <= end);
    const sol = list.reduce((acc, b) => acc + (b.sol ?? 0), 0);
    const usd = priceUsdPerSol ? sol * priceUsdPerSol : 0;
    const largest = list.reduce((mx, b) => Math.max(mx, b.amount), 0);
    return {
      count: list.length,
      sol,
      usd,
      largest,
      avg: list.length ? sol / list.length : 0,
    };
  }, [burnsSorted, now, priceUsdPerSol]);

  // copy CA
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
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main id="top">
      {/* ===== Sticky Header ===== */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
          {/* Brand */}
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

          {/* Nav */}
          <nav className="hidden items-center gap-8 md:flex text-sm md:text-base">
            <a href="#log" className="hover:text-amber-300">Live Burns</a>
            <a href="#how" className="hover:text-amber-300">How It Works</a>
          </nav>

          {/* CA chip */}
          <div className="flex items-center gap-2 md:gap-3">
            <span
              className="hidden lg:inline rounded-full bg-white/[0.06] px-4 py-2 text-sm text-white/75 ring-1 ring-white/10"
              title={FULL_TOKEN_ADDRESS}
            >
              {truncateMiddle(FULL_TOKEN_ADDRESS, 8, 8)}
            </span>
            <button
              onClick={handleCopyCA}
              className={`rounded-full px-4 py-2 text-sm md:text-base font-semibold transition
                ${copied
                  ? 'bg-emerald-400 text-black'
                  : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`
              }
              aria-live="polite"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* === Page content stack === */}
      <div className="space-y-16 md:space-y-20">
        {/* ===== Hero with video ===== */}
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
            <h1 className="max-w-5xl text-5xl md:text-6xl font-extrabold leading-tight">
              Meet The Burning Bear — the classiest arsonist in crypto.
            </h1>

            {/* Countdowns (no frames; large, airy) */}
            <div className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-white/60">Next buyback in</div>
                <div className="text-4xl md:text-5xl font-extrabold text-white/85">
                  {targets.buyback ? fmtCountdown(nextBuybackMs) : '—'}
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.25em] text-white/60">Next burn in</div>
                <div className="text-4xl md:text-5xl font-extrabold text-white/85">
                  {targets.burn ? fmtCountdown(nextBurnMs) : '—'}
                </div>
              </div>
            </div>

            {/* Stat cards */}
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
              <Stat label="Initial Supply" value={fmtInt(INITIAL)} />
              <Stat label="Burned" value={fmtInt(BURNED)} />
              <Stat label="Current Supply" value={fmtInt(CURRENT)} />
              <Stat label="Buyback Spent" value={`${(totalSolSpent).toFixed(2)} SOL`} />
            </div>

            {/* Info chips */}
            <div className="mt-3 flex flex-wrap gap-3">
              <Pill>Today: {todayBurns} {todayBurns === 1 ? 'burn' : 'burns'}</Pill>
              <Pill>Total Buyback Value: {fmtMoney(totalUsd)}</Pill>
              <Pill>Live SOL: {fmtMoney(priceUsdPerSol ?? 0)}</Pill>
            </div>
          </div>
        </section>

        {/* ===== Live Burn Log ===== */}
        <section id="log" className="mx-auto max-w-6xl px-4">
          <div className="flex items-baseline justify-between">
            <h2 className="text-2xl md:text-3xl font-bold">Live Burn Log</h2>
            <p className="text-sm text-white/60">TX links open explorer.</p>
          </div>

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

        {/* ===== Transparent Wallets ===== */}
        <section className="mx-auto max-w-6xl px-4">
          <h3 className="text-xl md:text-2xl font-semibold">Transparent Wallets</h3>
          <p className="mt-1 text-sm text-white/60">
            Verify everything on Solana Explorer — all wallets are public and view-only.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <WalletCard
              title="Burn Wallet"
              note="Destroyed supply lives here forever."
              address={BURN_WALLET}
            />
            <WalletCard
              title="Treasury / Buybacks"
              note="Funds for buybacks and operations."
              address={TREASURY_WALLET}
            />
            <WalletCard
              title="Marketing"
              note="Growth, creators, promos."
              address={MARKETING_WALLET}
            />
          </div>
        </section>

        {/* ===== This Week at the Campfire ===== */}
        <section className="mx-auto max-w-6xl px-4">
          <h3 className="text-xl md:text-2xl font-semibold">This Week at the Campfire</h3>
          <p className="mt-1 text-sm text-white/60">
            Activity in the last 7 days. Auto-updated from the live log.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <WeekStat label="Burns" value={fmtInt(week.count)} />
            <WeekStat label="SOL Spent" value={`${(week.sol || 0).toFixed(3)} SOL`} />
            <WeekStat label="USD Value" value={fmtMoney(week.usd || 0)} />
            <WeekStat label="Largest Burn (BEAR)" value={fmtInt(week.largest || 0)} />
          </div>
        </section>

        {/* ===== How it Works ===== */}
        <section id="how" className="mx-auto max-w-6xl px-4">
          <h2 className="text-2xl font-bold">How It Works</h2>
          <div className="mt-4 grid grid-cols-1 gap-4 text-white/85 md:grid-cols-3">
            <HowCard title="80% → Buy & Burn" body="Creator fees auto-buy $BEAR and burn them live — the campfire never sleeps." />
            <HowCard title="20% → Team + Marketing" body="Fuels growth, creators, memes, and keeping the vibes bright." />
            <HowCard title="Transparent" body="Every buyback & burn is posted with TX link & timestamp. Public wallets, public camp." />
          </div>
        </section>

        {/* ===== Footer ===== */}
        <footer className="bg-[#0d1a14]">
          <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="mx-auto max-w-6xl px-4 py-10 grid gap-10 md:grid-cols-[1.6fr_1fr_1.2fr] items-start">
            {/* Brand / tagline */}
            <div className="flex items-start gap-4">
              <img
                src="/img/coin-logo.png"
                alt="Burning Bear"
                className="h-10 w-10 md:h-12 md:w-12 rounded-full shadow-md"
              />
              <div>
                <div className="text-lg md:text-xl font-extrabold">The Burning Bear</div>
                <p className="mt-1 text-sm text-white/60">
                  We’re transparent. We’re active. And we’re alive. 🔥
                </p>
              </div>
            </div>

            {/* Quick links */}
            <nav className="grid gap-2 text-sm">
              <a href="#log" className="text-white/80 hover:text-amber-300 transition">Live Burns</a>
              <a href="#how" className="text-white/80 hover:text-amber-300 transition">How It Works</a>
              <a
                href={EXPLORER}
                target="_blank"
                rel="noopener noreferrer"
                className="text-white/80 hover:text-amber-300 transition"
              >
                Explorer
              </a>
            </nav>

            {/* Contract chip */}
            <ContractChip
              label="Contract Address"
              address={FULL_TOKEN_ADDRESS}
              explorer={`${EXPLORER}/address/${FULL_TOKEN_ADDRESS}`}
            />
          </div>
          <div className="border-t border-white/10">
            <div className="mx-auto max-w-6xl px-4 py-4 text-center text-xs text-white/45">
              © {new Date().getFullYear()} The Burning Bear — all burns on-chain.
            </div>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* =========================
   Components
========================= */

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-sm text-white/85 backdrop-blur">
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function WeekStat({ label, value }: { label: string; value: string }) {
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

function WalletCard({ title, note, address }: { title: string; note: string; address: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch {}
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-4 backdrop-blur">
      <div className="text-sm font-semibold">{title}</div>
      <div className="mt-1 text-xs text-white/60">{note}</div>

      <div className="mt-3 flex items-center gap-2">
        <code className="truncate rounded-md bg-white/5 px-3 py-2 text-[13px] text-white/80">
          {truncateMiddle(address, 8, 8)}
        </code>
        <a
          href={`${EXPLORER}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/80 hover:text-amber-300 hover:border-amber-300 transition"
        >
          View
        </a>
        <button
          onClick={handleCopy}
          className={`rounded-full px-3 py-2 text-sm font-medium transition
            ${copied ? 'bg-emerald-400 text-black' : 'border border-white/10 text-white/80 hover:text-amber-300 hover:border-amber-300'}`}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}

function ContractChip({
  label,
  address,
  explorer,
}: {
  label: string;
  address: string;
  explorer: string;
}) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  };
  const short = truncateMiddle(address, 9, 7);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur">
      <div className="text-xs uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <code className="truncate rounded-md bg-white/5 px-3 py-2 text-[13px] text-white/80">
          {short}
        </code>
        <div className="flex items-center gap-2">
          <a
            href={explorer}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-white/10 px-3 py-2 text-sm text-white/80 hover:text-amber-300 hover:border-amber-300 transition"
          >
            View
          </a>
          <button
            onClick={handleCopy}
            className={`rounded-full px-3 py-2 text-sm font-medium transition
              ${copied ? 'bg-emerald-400 text-black' : 'border border-white/10 text-white/80 hover:text-amber-300 hover:border-amber-300'}`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
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
