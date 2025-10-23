'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';
const FULL_TOKEN_ADDRESS = 'CYbYmTLvVLp2xPQ5H4UqyMv9UptmzWDLnYExPsh3JRMA';

// 🔓 Public, view-only wallets
const BURN_WALLET = 'CYbYmTLvVLp2xPQ5H4UqyMv9UptmzWDLnYExPsh3JRMA';
const TREASURY_WALLET = 'FH2EathAXbSScfmb2Zn4FYVEbjLwGo7QoSNxvNxQZ5qE';
const MARKETING_WALLET = '7k5rwpdSRyutEMek5tXuNuVVKQEQyubKC9VHEZ91SwZV';

const EXPLORER = 'https://explorer.solana.com';

/* =========================
   Types
========================= */
type Burn = {
  id: string;
  amount: number;
  sol?: number;
  timestamp: number | string;
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
const truncateMiddle = (str: string, left = 6, right = 6) =>
  !str || str.length <= left + right + 1 ? str : `${str.slice(0, left)}…${str.slice(-right)}`;

const fmtInt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtMoney = (n?: number) =>
  n == null || !isFinite(n) ? '$0.00' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtWhen = (tsMs: number) =>
  new Date(tsMs).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

const fmtCountdown = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
               : `${m}m ${s.toString().padStart(2, '0')}s`;
};

const toMs = (ts: number | string) => (typeof ts === 'number' ? ts : Date.parse(ts));

/* =========================
   Page
========================= */
export default function Page() {
  const [data, setData] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  // tick each second
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // load JSON data (cache-busted) and normalize timestamps
  useEffect(() => {
    let alive = true;
    fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: StateJson) => {
        if (!alive) return;
        const burns = (j.burns ?? [])
          .map((b) => ({ ...b, timestamp: toMs(b.timestamp) }))
          .filter((b) => Number.isFinite(b.timestamp as number));
        setData({ ...j, burns });
      })
      .catch(() => {});
    return () => { alive = false; };
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
    return () => { alive = false; clearInterval(id); };
  }, []);

  const priceUsdPerSol = solUsd ?? data?.stats?.priceUsdPerSol ?? 0;

  // sorted burns (new → old)
  const burnsSorted = useMemo(() => {
    const arr = (data?.burns ?? []) as Array<Burn & { timestamp: number }>;
    return arr.slice().sort((a, b) => b.timestamp - a.timestamp);
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

  // Auto-advance (loop) when a countdown hits 0
  useEffect(() => {
    if (!data?.schedule) return;
    setData((prev) => {
      if (!prev?.schedule) return prev;
      const { buybackIntervalMs = 0, burnIntervalMs = 0 } = prev.schedule;
      let { nextBuybackAt, nextBurnAt } = prev.schedule;

      const advance = (t?: number, i?: number) => {
        if (!t || !i || i <= 0) return t;
        while (t <= Date.now()) t += i;
        return t;
      };

      const bbDue = nextBuybackAt && nextBuybackAt - Date.now() <= 0;
      const burnDue = nextBurnAt && nextBurnAt - Date.now() <= 0;

      if (!bbDue && !burnDue) return prev;

      return {
        ...prev,
        schedule: {
          ...prev.schedule,
          nextBuybackAt: bbDue ? advance(nextBuybackAt, buybackIntervalMs) : nextBuybackAt,
          nextBurnAt: burnDue ? advance(nextBurnAt, burnIntervalMs) : nextBurnAt,
        },
      };
    });
  }, [now, data?.schedule]);

  // Stats
  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);
  const totalSolSpent = data?.stats?.buybackSol ?? 0;
  const totalUsd = totalSolSpent * priceUsdPerSol;

  // “Today” and “This Week” derived stats
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
    const usd = priceUsdPerSol ? sol * priceUsdPerSol : 0;
    const largest = lastWeek.reduce((m, b) => (b.amount > m ? b.amount : m), 0);
    const avgSol = count > 0 ? sol / count : 0;
    return { count, sol, usd, largest, avgSol };
  }, [burnsSorted, weekStart, priceUsdPerSol]);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(FULL_TOKEN_ADDRESS); } catch {}
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main id="top">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/90 backdrop-blur-md shadow-lg">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
          {/* Left: Logo + Title */}
          <Link href="#top" className="flex items-center gap-3 md:gap-4 min-w-0">
            <img
              src="/img/coin-logo.png"
              alt={TOKEN_NAME}
              className="h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg border border-amber-300/30"
            />
            <div className="leading-tight min-w-0">
              <div className="text-base md:text-xl font-extrabold text-amber-200 tracking-wide truncate">
                {TOKEN_NAME}
              </div>
              <div className="text-[12px] md:text-sm text-white/55 truncate">
                {TOKEN_SYMBOL} • Live Burn Camp
              </div>
            </div>
          </Link>

          {/* Center: Desktop Nav */}
          <nav className="hidden md:flex items-center gap-8 text-[15px] font-semibold">
            <a href="#how" className="text-[#ffe48d] hover:text-amber-300 transition">How It Works</a>
            <a href="#log" className="text-[#ffe48d] hover:text-amber-300 transition">Live Burns</a>
            <a href="#wallets" className="text-[#ffe48d] hover:text-amber-300 transition">Campfire Wallets</a>
            <a
              href="https://x.com/i/communities/1980944446871966021"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ffe48d] hover:text-amber-300 transition"
            >
              X Community
            </a>
          </nav>

          {/* Right: Copy CA + Mobile Menu */}
          <div className="flex items-center gap-2 md:gap-3">
            <span
              className="hidden lg:inline rounded-full bg-emerald-900/40 px-4 py-2 text-sm text-emerald-300 border border-emerald-500/20"
              title={FULL_TOKEN_ADDRESS}
            >
              {truncateMiddle(FULL_TOKEN_ADDRESS)}
            </span>
            <button
              onClick={handleCopy}
              className={`rounded-full px-4 py-2 text-sm md:text-base font-semibold transition ${
                copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'
              }`}
              aria-live="polite"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
            <MobileMenu />
          </div>
        </div>
      </header>

      {/* ===== Content Wrapper: global vertical rhythm ===== */}
      <div className="space-y-14 md:space-y-20">
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

          <div className="mx-auto grid max-w-6xl gap-5 md:gap-6 px-4 pb-10 pt-14 sm:pt-20">
            <h1 className="max-w-4xl text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-1">
              Meet The Burning Bear — the classiest arsonist in crypto.
            </h1>

            {/* Countdowns */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <Countdown label="Next buyback in" value={fmtCountdown(nextBuybackMs)} />
              <Countdown label="Next burn in" value={fmtCountdown(nextBurnMs)} />
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-1 gap-4 md:gap-5 sm:grid-cols-4">
              <Stat label="Burned So Far" value={fmtInt(BURNED)} />
              <Stat label="Current Supply" value={fmtInt(CURRENT)} />
              <Stat label="Buyback Spent" value={`${(data?.stats?.buybackSol ?? 0).toFixed(2)} SOL`} />
              <Stat label="Total Buyback Value" value={fmtMoney(totalUsd)} />
            </div>

            {/* Pills */}
            <div className="flex flex-wrap gap-2.5 md:gap-3">
              <Pill>Today: {todayBurnsCount} burns</Pill>
              <Pill>Initial Supply: {fmtInt(INITIAL)}</Pill>
              <Pill>Live SOL: {fmtMoney(priceUsdPerSol)}</Pill>
            </div>
          </div>
        </section>

        {/* ===== The 50/30/20 Campfire Split ===== */}
        <section id="how" className="mx-auto max-w-6xl px-4">
          <h3 className="text-xl font-bold tracking-tight">The 50/30/20 Campfire Split</h3>
          <div className="mt-4 grid grid-cols-1 gap-4 md:gap-5 md:grid-cols-3">
            <HowCard
              title="50% → Auto-Buy & Burn"
              body="Every fee fuels the fire — half of all activity automatically buys $BEAR and sends it to the burn wallet. The campfire never sleeps."
            />
            <HowCard
              title="30% → Treasury & Buybacks"
              body="Funds managed transparently for future burns, community events and buybacks that support long-term price health."
            />
            <HowCard
              title="20% → Team & Marketing"
              body="For growth, creators, and spreading the $BEAR legend across crypto — keeping the fire visible across Solana."
            />
          </div>
        </section>

        {/* ===== This Week at the Campfire ===== */}
        <section className="mx-auto max-w-6xl px-4" id="log">
          <h3 className="text-xl font-bold tracking-tight">This Week at the Campfire</h3>
          <p className="mt-1 text-sm text-white/55 leading-relaxed">
            Activity in the last 7 days. Auto-updated from the live logs.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <StatBig label="Burns" value={fmtInt(weekStats.count)} />
            <StatBig label="SOL Spent" value={`${weekStats.sol.toFixed(3)} SOL`} />
            <StatBig label="USD Value" value={fmtMoney(weekStats.usd)} />
            <StatBig label="Largest Burn (BEAR)" value={fmtInt(weekStats.largest)} />
          </div>

          <div className="mt-3">
            <Pill>Avg per burn: {weekStats.avgSol ? `${weekStats.avgSol.toFixed(3)} SOL` : '—'}</Pill>
          </div>

          {/* Live log cards */}
          <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
            {burnsSorted.length === 0 && (
              <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 text-white/60">
                No burns posted yet.
              </div>
            )}
            {burnsSorted.map((b) => (
              <BurnCard key={b.id} burn={b as Burn & { timestamp: number }} price={priceUsdPerSol} />
            ))}
          </div>
        </section>

        {/* ===== Campfire Wallets ===== */}
        <section id="wallets" className="mx-auto max-w-6xl px-4">
          <h3 className="text-xl font-bold tracking-tight">Campfire Wallets</h3>
          <p className="mt-1 text-sm text-white/55 leading-relaxed">
            The campfire burns in full view. Every wallet can be verified on Solana Explorer.
          </p>

          <div className="mt-5 grid grid-cols-1 gap-4 md:gap-5 md:grid-cols-3">
            <WalletCard
              title="Burn Wallet"
              address={BURN_WALLET}
              note="Destroyed supply lives here forever."
            />
            <WalletCard
              title="Treasury & Buybacks"
              address={TREASURY_WALLET}
              note="Funds for buybacks and operations."
            />
            <WalletCard
              title="Team & Marketing"
              address={MARKETING_WALLET}
              note="Growth, creators, promos."
            />
          </div>
        </section>
      </div>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/10 bg-[#0d1a14] relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-12 text-center text-sm text-white/60 space-y-4 md:space-y-5">

          <p className="text-white/80 text-base font-medium">
            🔥 The Burning Bear isn’t just a meme — it’s a movement. <br />
            Built on the <span className="text-[#ffe48d] font-semibold">50/30/20 Campfire Split</span> — transparent, alive and always feeding the flames.
          </p>

          {/* Socials (labeled so they work even without icon fonts) */}
          <div className="flex flex-wrap justify-center gap-6 text-white/70 text-sm">
            <a
              href="https://x.com/i/communities/1980944446871966021"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-300 transition"
              title="Join the X Community"
            >
              🕊 X Community
            </a>
            <a
              href="https://www.coingecko.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-300 transition"
              title="View on CoinGecko"
            >
              🦎 CoinGecko
            </a>
            <a
              href="https://dexscreener.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-300 transition"
              title="View on DexScreener"
            >
              🔥 DexScreener
            </a>
          </div>

          <div className="text-xs text-white/40 pt-2">
            <p>© {new Date().getFullYear()} The Burning Bear · Built for fun, not financial advice.</p>
            <p>Stay warm, stay transparent, and keep the fire burning. 🔥</p>
          </div>
        </div>
      </footer>
    </main>
  );
}

/* =========================
   Components
========================= */
function Countdown({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{label}</div>
      <div className="text-3xl font-extrabold text-white/85 md:text-[36px]">{value}</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-4 md:p-5 backdrop-blur-sm">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function StatBig({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 md:p-6 backdrop-blur-sm">
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
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-4 md:p-5 backdrop-blur-sm">
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
      className="rounded-3xl border border-white/10 bg-[#0f1f19] p-4 md:p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2"
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

function WalletCard({ title, address, note }: { title: string; address: string; note?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(address); } catch {}
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-4 md:p-5 backdrop-blur-sm">
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

function MobileMenu() {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Menu"
        className="ml-1 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-white/80"
      >
        ☰
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-40 border-b border-white/10 bg-[#0d1a14]/95 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2 text-[15px] font-semibold">
            <a href="#how" className="py-2 text-[#ffe48d]" onClick={() => setOpen(false)}>How It Works</a>
            <a href="#log" className="py-2 text-[#ffe48d]" onClick={() => setOpen(false)}>Live Burns</a>
            <a href="#wallets" className="py-2 text-[#ffe48d]" onClick={() => setOpen(false)}>Campfire Wallets</a>
            <a
              href="https://x.com/i/communities/1980944446871966021"
              target="_blank"
              rel="noopener noreferrer"
              className="py-2 text-[#ffe48d]"
              onClick={() => setOpen(false)}
            >
              X Community
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
