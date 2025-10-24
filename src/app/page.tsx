'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BBURN';
const TOKEN_NAME = 'The Burning Bear';
const FULL_TOKEN_ADDRESS =
  'Soli1111111111111111111111111111111111111111111111111111111111112';

// 🔓 Public, view-only wallets
const BURN_WALLET = 'CYbYmTLvVLp2xPQ5H4UqyMv9UptmzWDLnYExPsh3JRMA';
const TREASURY_WALLET = 'FH2EathAXbSScfmb2Zn4FYVEbjLwGo7QoSNxvNxQZ5qE';
const MARKETING_WALLET = '7k5rwpdSRyutEMek5tXuNuVVKQEQyubKC9VHEZ91SwZV';

// Solana explorer base
const EXPLORER = 'https://explorer.solana.com';

/* =========================
   Types
========================= */
type Burn = {
  id: string;
  amount: number;            // BEAR amount
  sol?: number;              // SOL spent for this burn
  timestamp: number | string; // ms epoch OR ISO string
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
    // either minutes… (editor-friendly)
    burnIntervalMinutes?: number;
    buybackIntervalMinutes?: number;
    // …or milliseconds (legacy)
    burnIntervalMs?: number;
    buybackIntervalMs?: number;
    nextBurnAt?: number;
    nextBuybackAt?: number;
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
function fmtWhen(tsMs: number) {
  const d = new Date(tsMs);
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
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
function toMs(ts: number | string): number {
  return typeof ts === 'number' ? ts : Date.parse(ts);
}

/* =========================
   Small components
========================= */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function StatBig({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-6 backdrop-blur">
      <div className="text-xs uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/75 backdrop-blur">
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

function BurnCard({ burn, price }: { burn: Burn & { timestamp: number }; price: number }) {
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
            <div className="text-lg font-bold">Burn • {fmtInt(burn.amount)} {TOKEN_SYMBOL.replace('$', '')}</div>
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

function WalletCard({
  title,
  address,
  note,
}: {
  title: string;
  address: string;
  note?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = address;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-sm font-semibold">{title}</div>
      {note && <div className="mt-0.5 text-xs text-white/55">{note}</div>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <code className="truncate rounded-md bg-white/5 px-2 py-1 text-[13px] text-white/80">
          {truncateMiddle(address, 8, 8)}
        </code>
        <div className="flex items-center gap-2">
          <a
            href={`${EXPLORER}/address/${address}`}
            target="_blank"
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
          >
            View
          </a>
          <button
            onClick={handleCopy}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Divider() {
  return (
    <div className="relative mt-6 mb-4">
      <div className="absolute -top-[6px] left-0 h-[6px] w-full bg-gradient-to-b from-amber-400/18 to-transparent blur-[6px]" />
      <div className="relative h-[2px] w-full overflow-hidden rounded-full">
        <div className="absolute inset-0 bg-white/10" />
        <div className="absolute inset-0 ember-divider" />
      </div>
      <div className="absolute -bottom-[6px] left-0 h-[6px] w-full bg-gradient-to-t from-amber-400/10 to-transparent blur-[4px]" />
    </div>
  );
}

/* =========================
   Page
========================= */
export default function Page() {
  // --- page state
  const [data, setData] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // Copy handler for Contract Address
  const [copiedCA, setCopiedCA] = useState(false);
  async function handleCopyCA() {
    try {
      await navigator.clipboard.writeText(FULL_TOKEN_ADDRESS);
      setCopiedCA(true);
      setTimeout(() => setCopiedCA(false), 1200);
    } catch (err) {
      console.error('Clipboard copy failed', err);
    }
  }

  // tick each second (drives countdowns)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // load JSON data (cache-busted) and normalize timestamps
  useEffect(() => {
    let alive = true;
    fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: StateJson) => {
        if (!alive) return;

        // Convert minutes → ms if minutes are provided (editor-friendly)
        if (d.schedule) {
          const burnMins = d.schedule.burnIntervalMinutes ?? undefined;
          const buybackMins = d.schedule.buybackIntervalMinutes ?? undefined;
          if (typeof burnMins === 'number') d.schedule.burnIntervalMs = burnMins * 60 * 1000;
          if (typeof buybackMins === 'number') d.schedule.buybackIntervalMs = buybackMins * 60 * 1000;

          // auto-calc future timestamps if not provided
          const now = Date.now();
          if (!d.schedule.nextBurnAt && d.schedule.burnIntervalMs) {
            d.schedule.nextBurnAt = now + d.schedule.burnIntervalMs;
          }
          if (!d.schedule.nextBuybackAt && d.schedule.buybackIntervalMs) {
            d.schedule.nextBuybackAt = now + d.schedule.buybackIntervalMs;
          }
        }

        // normalize burns -> numeric timestamps & drop invalid
        const burns = (d.burns ?? [])
          .map((b: Burn) => ({ ...b, timestamp: toMs(b.timestamp) }))
          .filter((b: Burn & { timestamp: number }) => Number.isFinite(b.timestamp as number));

        setData({ ...d, burns });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // live SOL price (falls back to stats.priceUsdPerSol)
  useEffect(() => {
    let alive = true;
    const fetchPrice = () =>
      fetch('/api/sol-price', { cache: 'no-store' })
        .then((r) => r.json())
        .then((o) => {
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

  // sorted burns (new → old)
  const burnsSorted = useMemo(() => {
    const arr = (data?.burns ?? []) as Array<Burn & { timestamp: number }>;
    return arr.slice().sort((a, b) => a.timestamp - b.timestamp).reverse();
  }, [data]);

  // Next targets (absolute times so everyone sees the same countdown)
  const targets = useMemo(() => {
    const s = data?.schedule ?? {};
    const bb =
      s.nextBuybackAt ??
      (s.lastBuybackAt && s.buybackIntervalMs
        ? s.lastBuybackAt + s.buybackIntervalMs
        : undefined);

    const burn =
      s.nextBurnAt ??
      (s.lastBurnAt && s.burnIntervalMs
        ? s.lastBurnAt + s.burnIntervalMs
        : undefined);

    return { bb, burn };
  }, [data]);

  const nextBuybackMs = targets.bb ? targets.bb - now : 0;
  const nextBurnMs = targets.burn ? targets.burn - now : 0;

  // top stats
  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);
  const totalSolSpent = data?.stats?.buybackSol ?? 0;
  const totalUsd = priceUsdPerSol ? totalSolSpent * priceUsdPerSol : undefined;

  // “Today” and “This Week” derived stats (local time)
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const weekStart = now - 7 * 24 * 60 * 60 * 1000;

  const todayBurnsCount = useMemo(
    () => burnsSorted.filter((b) => (b.timestamp as number) >= todayStart).length,
    [burnsSorted, todayStart]
  );

  const weekStats = useMemo(() => {
    const lastWeek = burnsSorted.filter((b) => (b.timestamp as number) >= weekStart);
    const count = lastWeek.length;
    const sol = lastWeek.reduce((acc, b) => acc + (b.sol ?? 0), 0);
    const usd = priceUsdPerSol ? sol * priceUsdPerSol : undefined;
    const largest = lastWeek.reduce((m, b) => (b.amount > m ? b.amount : m), 0);
    const avgSol = count > 0 ? sol / count : 0;
    return { count, sol, usd, largest, avgSol };
  }, [burnsSorted, weekStart, priceUsdPerSol]);

  return (
    <main id="top">
      {/* ===== Hero (video backdrop removed for brevity) ===== */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
          {/* Logo + Title */}
          <Link href="#top" className="flex items-center gap-3 md:gap-4 min-w-0">
            <img
              src="/img/coin-logo.png"
              alt={TOKEN_NAME}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full border border-amber-300/30 shadow-ember"
            />
            <div className="leading-tight min-w-0">
              <div className="text-base md:text-xl font-extrabold text-amber-200 tracking-wide truncate">
                {TOKEN_NAME}
              </div>
              <div className="text-[12px] md:text-sm text-white/55 truncate">
                {TOKEN_SYMBOL} • Live Burn Camp 🔥
              </div>
            </div>
          </Link>

          {/* Nav */}
          <nav className="hidden items-center gap-10 text-[16px] font-semibold md:flex">
            <a href="#how" className="text-[#ffe48d] hover:text-amber-300 transition">How It Works</a>
            <a href="#week" className="text-[#ffe48d] hover:text-amber-300 transition">Live Burns</a>
            <a href="#wallets" className="text-[#ffe48d] hover:text-amber-300 transition">Campfire Wallets</a>
          </nav>

          {/* Contract copy (header small) */}
          <button
            onClick={handleCopyCA}
            className={`rounded-full px-4 py-2 text-sm md:text-base font-semibold transition
              ${copiedCA ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
            aria-live="polite"
          >
            {copiedCA ? 'Copied!' : 'Copy CA'}
          </button>
        </div>
      </header>

      {/* Hero title + countdowns */}
      <section className="mx-auto max-w-6xl px-4 pt-10 pb-6">
        <h1 className="max-w-4xl text-5xl md:text-6xl font-extrabold leading-tight">
          Meet The Burning Bear {TOKEN_SYMBOL} —{' '}
          <span className="block md:inline">the classiest</span>{' '}
          <span className="block md:inline">arsonist in crypto.</span>
        </h1>

        <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">Next buyback in</div>
            <div className="text-3xl font-extrabold text-white/85 md:text-[36px]">
              {targets.bb ? fmtCountdown(nextBuybackMs) : '—'}
            </div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">Next burn in</div>
            <div className="text-3xl font-extrabold text-white/85 md:text-[36px]">
              {targets.burn ? fmtCountdown(nextBurnMs) : '—'}
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Stat label="Burned So Far" value={fmtInt(BURNED)} />
          <Stat label="Current Supply" value={fmtInt(CURRENT)} />
          <Stat label="Buyback Spent" value={`${(data?.stats?.buybackSol ?? 0).toFixed(2)} SOL`} />
          <Stat label="Total Buyback Value" value={fmtMoney(totalUsd)} />
        </div>

        {/* Pill row */}
        <div className="mt-3 flex flex-wrap gap-3">
          <Pill>Today: {todayBurnsCount} burns</Pill>
          <Pill>Initial Supply: {fmtInt(INITIAL)}</Pill>
          <Pill>Live SOL: {priceUsdPerSol ? fmtMoney(priceUsdPerSol) : '—'}</Pill>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="mx-auto max-w-6xl px-4 scroll-mt-28 md:scroll-mt-32">
        <Divider />
        <h3 className="text-xl font-bold">How It Works</h3>
        <p className="mt-2 max-w-3xl text-white/80">
          Every spark fuels the fire. Whether it’s a trade, a creator reward, or a network fee — every move
          feeds the <span className="font-semibold text-amber-300">{TOKEN_SYMBOL} Campfire Fund</span>,
          powering constant buybacks, burns, and community rewards.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 text-white/85 md:grid-cols-3">
          <HowCard title="50% → Auto-Buy & Burn" body="Half of every fee buys $BBURN and sends it to the burn wallet — shrinking supply with every move. The campfire never sleeps." />
          <HowCard title="30% → Treasury & Buybacks" body="Reserved for strategic buybacks, ecosystem stability, and community-driven events that keep $BBURN’s fire burning long-term." />
          <HowCard title="20% → Team, Creators & Growth" body="Rewards creators, partners, and community builders — spreading the legend of $BBURN while fueling future innovation." />
        </div>
      </section>

      {/* ===== This Week ===== */}
      <section id="week" className="mx-auto max-w-6xl px-4 pt-4 pb-6 scroll-mt-28 md:scroll-mt-32">
        <Divider />
        <h3 className="text-xl font-bold">This Week at the Campfire</h3>
        <p className="mt-1 text-sm text-white/55">Activity in the last 7 days. Auto-updated from the live log.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatBig label="Burns" value={fmtInt(weekStats.count)} />
          <StatBig label="SOL Spent" value={`${weekStats.sol.toFixed(3)} SOL`} />
          <StatBig label="USD Value" value={fmtMoney(weekStats.usd)} />
          <StatBig label="Largest Burn (BEAR)" value={fmtInt(weekStats.largest)} />
        </div>

        <div className="mt-3">
          <Pill>Avg per burn: {weekStats.avgSol ? `${weekStats.avgSol.toFixed(3)} SOL` : '—'}</Pill>
        </div>

        {/* Live Burn Log */}
        <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
          {burnsSorted.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-6 text-white/60">
              No burns posted yet.
            </div>
          )}
          {burnsSorted.map((b) => (
            <BurnCard key={b.id} burn={b as Burn & { timestamp: number }} price={priceUsdPerSol ?? 0} />
          ))}
        </div>
      </section>

      {/* ===== Wallets ===== */}
      <section id="wallets" className="mx-auto max-w-6xl px-4 pt-4 pb-10 scroll-mt-28 md:scroll-mt-32">
        <Divider />
        <h3 className="text-xl font-bold">Campfire Wallets</h3>
        <p className="mt-1 text-sm text-white/55">The campfire burns in full view. Every wallet can be verified on Solana Explorer.</p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <WalletCard title="Burn Wallet" address={BURN_WALLET} note="Destroyed supply lives here forever." />
          <WalletCard title="Treasury / Buybacks" address={TREASURY_WALLET} note="Funds for buybacks and operations." />
          <WalletCard title="Team & Marketing" address={MARKETING_WALLET} note="Growth, creators, promos." />
        </div>
      </section>

      {/* ===== Contract Address bar (above footer) ===== */}
      <section className="mx-auto max-w-6xl px-4 pb-8">
        <Divider />
        <div className="flex flex-col items-center gap-3">
          <div className="text-lg font-semibold text-white/90">Contract Address</div>
          <div className="flex w-full max-w-4xl items-center gap-3 rounded-full border border-white/15 bg-white/[0.04] px-4 py-3 backdrop-blur">
            <code className="block w-full truncate text-[15px] text-white/90">
              {FULL_TOKEN_ADDRESS}
            </code>
            <button
              onClick={handleCopyCA}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold transition ${
                copiedCA ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'
              }`}
              aria-live="polite"
            >
              {copiedCA ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>
      </section>

      {/* ===== Footer (short) ===== */}
      <footer className="border-t border-white/10 bg-[#0d1a14]">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-white/70 space-y-4">
          <p>
            🔥 The Burning Bear isn’t just a meme — it’s a movement. Transparent, alive, and always feeding the flames.
          </p>
          <div className="flex justify-center gap-6 text-white/70 text-base">
            <a href="https://x.com" target="_blank" className="hover:text-amber-300 transition">🕊️ X Community</a>
            <a href="https://www.coingecko.com/" target="_blank" className="hover:text-amber-300 transition">🦎 CoinGecko</a>
            <a href="https://dexscreener.com" target="_blank" className="hover:text-amber-300 transition">🔥 DexScreener</a>
          </div>
          <div className="text-xs text-white/45">
            © {new Date().getFullYear()} The Burning Bear · Built for fun, not financial advice.
          </div>
        </div>
      </footer>
    </main>
  );
}
