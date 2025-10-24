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
  amount: number;            // BEAR
  sol?: number;              // SOL spent for this burn
  timestamp: number | string; // ms since epoch OR ISO string
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

const fmtInt = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });

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
   Reveal helper (fade-up on scroll)
========================= */
function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [show, setShow] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShow(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={
        `transform transition-all duration-600 ease-out will-change-transform ` +
        `${show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'} ` +
        className
      }
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
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

  // Shared, absolute countdown targets
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

      const jumpForward = (t?: number, i?: number) => {
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
          nextBuybackAt: bbDue ? jumpForward(nextBuybackAt, buybackIntervalMs) : nextBuybackAt,
          nextBurnAt: burnDue ? jumpForward(nextBurnAt, burnIntervalMs) : nextBurnAt,
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

  // Today + This week stats
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
    const usd = sol * priceUsdPerSol;
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

      {/* ===== HERO with video + translucent text panel ===== */}
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

        <div className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:pt-20">
          <div className="inline-block rounded-2xl bg-black/25 backdrop-blur-sm px-4 py-5 md:px-6 md:py-6">
            <h1 className="max-w-4xl text-5xl md:text-6xl font-extrabold leading-tight">
              Meet The Burning Bear — the classiest arsonist in crypto.
            </h1>

            {/* Countdowns */}
            <div className="mt-4 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <Countdown label="Next buyback in" value={fmtCountdown(nextBuybackMs)} />
              <Countdown label="Next burn in" value={fmtCountdown(nextBurnMs)} />
            </div>

            {/* Stats */}
            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-4">
              <Stat label="Burned So Far" value={fmtInt(BURNED)} />
              <Stat label="Current Supply" value={fmtInt(CURRENT)} />
              <Stat label="Buyback Spent" value={`${(data?.stats?.buybackSol ?? 0).toFixed(2)} SOL`} />
              <Stat label="Total Buyback Value" value={fmtMoney(totalUsd)} />
            </div>

            {/* Pills */}
            <div className="mt-3 flex flex-wrap gap-3">
              <Pill>Today: {todayBurnsCount} burns</Pill>
              <Pill>Initial Supply: {fmtInt(INITIAL)}</Pill>
              <Pill>SOL: {fmtMoney(priceUsdPerSol)}</Pill>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Live Burn Log — single horizontal scroll line ===== */}
      <section id="log" className="w-full px-4 sm:px-6 lg:px-8 mt-6">
        <div className="flex items-baseline justify-between max-w-7xl mx-auto">
          <h2 className="text-2xl font-bold">Live Burn Log</h2>
          <p className="text-sm text-white/50">TX links open explorer.</p>
        </div>

        {/* Horizontal scroll container */}
        <div className="mt-6 overflow-x-auto pb-4">
          <div className="flex gap-6 min-w-full px-1">
            {burnsSorted.slice(0, 6).map((b) => (
              <div
                key={b.id}
                className="flex-shrink-0 w-[520px] sm:w-[560px] md:w-[580px] lg:w-[600px]"
              >
                <div
                  className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.25)] flex flex-col justify-between transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(255,183,77,0.12)] hover:border-amber-300/30"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">
                        🔥
                      </span>
                      <div>
                        <div className="text-lg font-bold">
                          Burn • {b.amount.toLocaleString()} BEAR
                        </div>
                        <div className="text-sm text-white/60">
                          {new Date(b.timestamp).toLocaleString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                          })}
                        </div>
                        {b.sol !== undefined && (
                          <div className="text-sm text-white/70">
                            ≈ {b.sol.toFixed(4)} SOL (
                            {(b.sol * priceUsdPerSol).toLocaleString('en-US', {
                              style: 'currency',
                              currency: 'USD',
                            })}
                            )
                          </div>
                        )}
                      </div>
                    </div>
                    <Link
                      href={b.tx}
                      target="_blank"
                      className="mt-1 text-right text-sm font-semibold text-amber-300 underline-offset-2 hover:underline"
                    >
                      TX
                    </Link>
                  </div>

                  <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
                    <div className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500" style={{ width: '100%' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== How It Works ===== */}
<section id="how" className="mx-auto max-w-6xl px-4 pt-14 relative">
  <h3 className="text-xl font-bold tracking-tight mb-5">How It Works</h3>

  {/* Paragraph + Coin */}
  <div className="relative mx-auto max-w-6xl">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-8 mb-10">
      {/* Left: Text */}
      <p className="text-white/75 leading-relaxed text-[15.5px] md:text-[16px] max-w-3xl md:pr-28">
        Every spark — whether it’s a trade, a creator reward, or a network fee — feeds the
        <span className="text-[#ffe48d] font-semibold"> $BEAR</span> fire.
        These flames merge into the
        <span className="text-[#ffe48d] font-semibold transition duration-300 hover:text-amber-300">
          {" "}Campfire Fund
        </span>, driving constant buybacks, burns, and creator support.
        The more the ecosystem moves, the hotter it burns. 🔥
      </p>

      {/* Right: Coin */}
      <div
        className="
          relative md:absolute md:right-2 lg:right-6 xl:right-10
          md:top-[-6px] lg:top-[-10px]
          self-center md:self-auto
          pointer-events-none
        "
        style={{ zIndex: 1 }}
      >
        <div className="absolute inset-0 rounded-full blur-2xl bg-amber-400/20 opacity-0 animate-coinGlow" />
        <img
          src="/img/coin-logo.png"
          alt="$BEAR Coin"
          className="relative w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 opacity-0 animate-fadeInCoin"
        />
      </div>
    </div>
  </div>

  {/* Cards */}
  <div className="grid grid-cols-1 gap-5 md:grid-cols-3 items-stretch">
    <Reveal delay={0}>
      <HowCard
        title="50% → Auto-Buy & Burn"
        body="Half of every fee automatically buys $BEAR and sends it to the burn wallet — shrinking supply with every move. The campfire never sleeps."
      />
    </Reveal>
    <Reveal delay={120}>
      <HowCard
        title="30% → Treasury & Buybacks"
        body="Reserved transparently for strategic buybacks, ecosystem stability, and community-driven events that keep $BEAR’s fire burning long-term."
      />
    </Reveal>
    <Reveal delay={240}>
      <HowCard
        title="20% → Team, Creators & Growth"
        body="Rewards creators, partners, and community builders — spreading the legend of $BEAR across Solana while fueling future innovation."
      />
    </Reveal>
  </div>

  {/* Animations */}
  <style jsx>{`
    @keyframes fadeInCoin {
      from { opacity: 0; transform: translateY(10px) scale(0.98); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }

    @keyframes slowSpin {
      from { transform: rotateY(0deg); }
      to   { transform: rotateY(360deg); }
    }

    @keyframes coinGlow {
      0%,100% { opacity: 0.25; transform: scale(1); }
      50%     { opacity: 0.7; transform: scale(1.2); }
    }

    .animate-fadeInCoin {
      animation: fadeInCoin 1.4s ease-out 0.4s forwards, slowSpin 18s linear 1.8s infinite;
      transform-style: preserve-3d;
    }

    .animate-coinGlow {
      animation: coinGlow 4.5s ease-in-out 2.2s infinite;
    }
  `}</style>
</section>

      {/* ===== Campfire Wallets ===== */}
      <section id="wallets" className="mx-auto max-w-6xl px-4 pt-14 pb-16">
        <h3 className="text-xl font-bold tracking-tight">Campfire Wallets</h3>
        <p className="mt-1 text-sm text-white/55">The campfire burns in full view. Every wallet can be verified on Solana Explorer.</p>

        <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">
          <WalletCard title="Burn Wallet" address={BURN_WALLET} note="Destroyed supply lives here forever." />
          <WalletCard title="Treasury & Buybacks" address={TREASURY_WALLET} note="Funds for buybacks and operations." />
          <WalletCard title="Team & Marketing" address={MARKETING_WALLET} note="Growth, creators, promos." />
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/10 bg-[#0d1a14] relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-white/60 space-y-4">
          <p className="text-white/80 text-base font-medium">
            🔥 The Burning Bear isn’t just a meme — it’s a movement. <br />
            Built on the <span className="text-[#ffe48d] font-semibold">50/30/20 Campfire Split</span> — transparent, alive and always feeding the flames.
          </p>

          <div className="flex justify-center gap-8 text-white/70 text-lg pt-2">
            <a
              href="https://x.com/i/communities/1980944446871966021"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-300 transition"
              title="Join the X Community"
            >
              🕊️ <span className="align-middle">X Community</span>
            </a>
            <a
              href="https://www.coingecko.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-300 transition"
              title="View on CoinGecko"
            >
              🦎 <span className="align-middle">CoinGecko</span>
            </a>
            <a
              href="https://dexscreener.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-300 transition"
              title="View on DexScreener"
            >
              🔥 <span className="align-middle">DexScreener</span>
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
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 md:p-6 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function StatBig({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-6 md:p-7 backdrop-blur">
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
    <div className="flex flex-col justify-between h-full rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 md:p-6 transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_10px_24px_rgba(255,183,77,0.10)] hover:border-amber-300/25">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-white/75">{body}</div>
    </div>
  );
}

function BurnCard({ burn, price }: { burn: Burn & { timestamp: number }; price: number }) {
  const usd = burn.sol && price ? burn.sol * price : undefined;
  const ageMin = Math.max(0, (Date.now() - burn.timestamp) / 60_000);
  const brightness = Math.max(0.68, 1 - ageMin / 180);
  const progress = Math.min(1, ageMin / 10);

  return (
    <div
      className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-[2px] hover:shadow-[0_10px_30px_rgba(255,183,77,0.12)] hover:border-amber-300/30 ring-emerald-500/0"
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

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
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
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 md:p-6 backdrop-blur">
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
        onClick={() => setOpen((v) => !v)}
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
          </div>
        </div>
      )}
    </div>
  );
}
