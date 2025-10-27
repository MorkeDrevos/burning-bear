'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BBURN';
const TOKEN_NAME = 'The Burning Bear';
const FULL_TOKEN_ADDRESS = 'BXvBhz6Va2Ed8HnzMDChzHCTqKXLvJpGadfLhvK5pump';

// 🔓 Public, view-only wallets
const BURN_WALLET = '2nkSpJx9S7U13ujrSibYLpBHeBWbvRkHBF8bkqwS9xMS';
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
    .then((d) => {
      if (!alive) return;

      // Convert schedule: minutes → milliseconds (works with burnIntervalMinutes / buybackIntervalMinutes)
      if (d.schedule) {
        const burnMins = d.schedule.burnIntervalMinutes ?? 60;
        const buybackMins = d.schedule.buybackIntervalMinutes ?? 20;

        d.schedule.burnIntervalMs = burnMins * 60 * 1000;
        d.schedule.buybackIntervalMs = buybackMins * 60 * 1000;

        // If next times are missing, seed them from now + minutes
        const now = Date.now();
        if (!d.schedule.nextBurnAt) d.schedule.nextBurnAt = now + burnMins * 60 * 1000;
        if (!d.schedule.nextBuybackAt) d.schedule.nextBuybackAt = now + buybackMins * 60 * 1000;
      }

      // Normalize burns (make timestamps numeric) and drop invalid rows
      const burns = (d?.burns ?? [])
        .map((b: any) => ({ ...b, timestamp: toMs(b.timestamp) }))
        .filter((b: any) => Number.isFinite(b.timestamp as number));

      setData({ ...d, burns });
    })
    .catch(() => {
      alive = false;
    });

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

 // Auto-loop: seed if missing and roll forward with a small buffer
useEffect(() => {
  setData((prev) => {
    if (!prev?.schedule) return prev;

    const s = prev.schedule as any;
    const nowTs = Date.now();

    // accept minutes or ms
    const toMs = (v?: number) =>
      typeof v === 'number' ? (v >= 10_000 ? v : v * 60_000) : undefined;

    const burnI = s.burnIntervalMs ?? toMs(s.burnIntervalMinutes);
    const buyI  = s.buybackIntervalMs ?? toMs(s.buybackIntervalMinutes);
    if (!burnI && !buyI) return prev;

    // seed if missing
    let nextBurnAt     = s.nextBurnAt     ?? (burnI ? nowTs + burnI : undefined);
    let nextBuybackAt  = s.nextBuybackAt  ?? (buyI  ? nowTs + buyI  : undefined);

    // only advance after a tiny buffer past the target
    const BUFFER = 15_000; // 15s

    if (nextBurnAt && burnI && nowTs > nextBurnAt + BUFFER) {
      const k = Math.ceil((nowTs - (nextBurnAt + BUFFER)) / burnI);
      nextBurnAt = nextBurnAt + k * burnI;
    }
    if (nextBuybackAt && buyI && nowTs > nextBuybackAt + BUFFER) {
      const k = Math.ceil((nowTs - (nextBuybackAt + BUFFER)) / buyI);
      nextBuybackAt = nextBuybackAt + k * buyI;
    }

    // no change? keep previous object
    if (nextBurnAt === s.nextBurnAt && nextBuybackAt === s.nextBuybackAt) return prev;

    return {
      ...prev,
      schedule: {
        ...s,
        burnIntervalMs: burnI ?? s.burnIntervalMs,
        buybackIntervalMs: buyI ?? s.buybackIntervalMs,
        nextBurnAt,
        nextBuybackAt,
      },
    };
  });
}, [now]);
 
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
  {/* removed CA chip + Copy CA */}
  <a
  href="https://x.com/i/communities/1980944446871966021"
  target="_blank"
  rel="noopener noreferrer"
  className="inline-flex items-center gap-2 text-sm font-semibold text-white/80
             underline decoration-white/20 underline-offset-[6px]
             hover:text-amber-100 hover:decoration-amber-300/50 transition-colors duration-200
             focus:outline-none focus:ring-2 focus:ring-amber-300/25 rounded-sm"
>
  <span className="text-[15px] leading-none">𝕏</span>
  <span>Community</span>
</a>
  <MobileMenu />
</div>
        </div>
      </header>

      {/* ===== HERO with video + translucent text panel ===== */}
<section className="relative">
  {/* Background video + vignette */}
  <div className="absolute inset-0 -z-10 overflow-hidden hero-vignette">
    <video
      className="h-[66vh] w-full object-cover hero-zoom"
      playsInline
      autoPlay
      muted
      loop
      poster="/img/burning-bear-frame.jpg"
    >
      <source src="/img/burning-bear.mp4" type="video/mp4" />
    </video>
    {/* Dark gradient for legibility */}
    <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#0b1712]/35 to-[#0b1712]" />
  </div>

  <div className="mx-auto max-w-6xl px-4 pb-12 pt-14 sm:pt-20 relative">
    {/* subtle fire glow behind hero box */}
    <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-amber-600/10 via-transparent to-transparent blur-[120px]" />

    {/* ember particle layer (very lightweight) */}
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {[...Array(10)].map((_, i) => (
        <span
          key={i}
          className="ember-dot"
          style={{
            left: `${Math.random() * 100}%`,
            bottom: `${Math.random() * 40}%`,
            animationDelay: `${Math.random() * 5}s`,
            ['--drift-x' as any]: `${Math.random() * 40 - 20}px`,
            ['--rise' as any]: `${5 + Math.random() * 4}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>

    {/* translucent stats panel */}
    <div className="w-full rounded-2xl bg-black/25 backdrop-blur-sm px-5 py-6 md:px-7 md:py-7 shadow-[0_0_40px_rgba(255,170,60,0.12)]">
      {/* Headline */}
      <h1 className="max-w-4xl text-5xl md:text-6xl font-extrabold leading-tight text-amber-50 drop-shadow-[0_0_12px_rgba(255,184,76,0.25)]">
        Meet The Burning Bear – the classiest arsonist in crypto.
      </h1>

      {/* Countdowns */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
       {/*  <Countdown label="Next buyback in" value={fmtCountdown(nextBuybackMs)} />*/}
        <Countdown label="Next burn in" ms={nextBurnMs} variant="segments" />
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
        <Stat label="Burned So Far" value={fmtInt(BURNED)} />
        <Stat label="Current Supply" value={fmtInt(CURRENT)} />
        <Stat label="Buyback Spent" value={`${(data?.stats?.buybackSol ?? 0).toFixed(2)} SOL`} />
        <Stat label="Total Buyback Value" value={fmtMoney(totalUsd)} />
      </div>

{/* Pills */}
<div className="mt-5 flex flex-wrap gap-3">
  <a href="#log">
    <Pill className="cursor-pointer bg-orange-500/20 text-orange-400 font-semibold hover:bg-orange-500/25">
      🔥 Total Burns: {data?.burns?.length ?? 0}
    </Pill>
  </a>

  <Pill>Initial Supply: {fmtInt(INITIAL)}</Pill>
  <Pill>SOL: {fmtMoney(priceUsdPerSol)}</Pill>
</div>
    </div>
  </div>
</section>

      {/* Contract Address Pill — Cleaned */}
<div className="mt-6 flex justify-center">
  <div className="inline-flex items-center gap-3 bg-[#0f1f19]/60 px-4 py-2 rounded-xl backdrop-blur-sm">
    {/* Copy Icon */}
    <button
      onClick={handleCopy}
      aria-label="Copy contract address"
      className="text-white/60 hover:text-amber-200 transition"
      title={copied ? 'Copied!' : 'Copy'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        className="h-4 w-4"
      >
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    </button>

    {/* Token + Address */}
    <span className="text-sm font-semibold text-white/75">{TOKEN_SYMBOL}</span>
    <span className="text-white/50">•</span>
    <code
      className="font-mono text-[13px] text-white/70"
      title={FULL_TOKEN_ADDRESS}
    >
      {truncateMiddle(FULL_TOKEN_ADDRESS, 6, 6)}
    </code>

    {/* Copy Button */}
    <button
      onClick={handleCopy}
      className={`ml-2 rounded-md px-3 py-1 text-[12px] font-semibold transition
        ${copied
          ? 'bg-[#ffedb3] text-black'
          : 'bg-amber-300/10 text-amber-200 hover:bg-amber-300/20'}`}
    >
      {copied ? 'Copied!' : 'Copy CA'}
    </button>
  </div>
</div>

{/* ===== Live Burn Log — marquee + full-click cards ===== */}
<section
  id="log"
  className="w-full px-4 sm:px-6 lg:px-8 mt-6 scroll-mt-24 md:scroll-mt-28"
>
  <div className="flex items-baseline justify-between max-w-7xl mx-auto">
    <h2 className="text-2xl font-bold">Live Burn Log 🔥</h2>
    <p className="text-sm text-white/50">TX links open explorer.</p>
  </div>

  {/* Marquee wrapper */}
  <div className="mt-6 relative overflow-hidden auto-marquee">
    {/* Track (duplicated items for seamless loop) */}
    <div className="marquee-track flex gap-6 will-change-transform px-1">
      {[...burnsSorted.slice(0, 6), ...burnsSorted.slice(0, 6)].map((b, i) => (
        <Link
          key={`${b.id}-${i}`}
          href={b.tx}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`View TX for burn of ${b.amount.toLocaleString()} BBURN`}
          className="group block flex-shrink-0 w-[520px] sm:w-[560px] md:w-[580px] lg:w-[600px] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 rounded-3xl"
        >
          {/* Card */}
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 md:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.25)] transition-transform">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-gradient-to-b from-[#2b1a0f] to-[#3a2012] border border-amber-900/40">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6">
                    <defs>
                      <linearGradient id="flameGrad" x1="0" x2="0" y1="0" y2="1">
                        <stop offset="0%" stopColor="#ffb347" />
                        <stop offset="55%" stopColor="#ff6a00" />
                        <stop offset="100%" stopColor="#c95500" />
                      </linearGradient>
                    </defs>
                    <path
                      fill="url(#flameGrad)"
                      d="M12 2c2 2 3 4 3 6 0 1.6-.8 3-1.7 3.7 1.1-.3 2.4-1.3 3-2.9 .9 2.8-.8 7.7-4.3 9-3.9 1.4-6.8-2-5.8-6.4C7.2 6.3 10.6 3 12 2z"
                    />
                  </svg>
                </span>

                <div>
                  <div className="text-lg font-bold">
                    Burn • {b.amount.toLocaleString()} BBURN
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

                  {typeof b.sol === 'number' && (
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
              {/* tiny hint that it's clickable */}
              <span className="text-sm font-semibold text-amber-300/80 opacity-80 group-hover:opacity-100">
                View TX →
              </span>
            </div>

            <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                style={{ width: '100%' }}
              />
            </div>
          </div>
          {/* /Card */}
        </Link>
      ))}
    </div>
  </div>
</section>

{/* ===== How It Works ===== */}
<section
  id="how"
  className="mx-auto max-w-6xl px-4 pt-12 pb-16 md:pt-14 md:pb-20 scroll-mt-[88px] md:scroll-mt-[100px] lg:scroll-mt-[116px]"
>
  <h3 className="text-2xl font-bold text-amber-300 mb-4">How It Works</h3>
  <p className="text-white/70 max-w-3xl">
    Every spark fuels the fire. Whether it’s a trade, a creator reward, or a network fee — every move
    feeds the <span className="text-amber-300 font-semibold">BBURN Campfire Fund</span>, powering constant
    buybacks, burns, and community rewards. The more the ecosystem moves, the hotter the fire burns.
  </p>

  <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
    <HowCard
      title="50% → Auto-Buy & Burn"
      body="Half of every fee automatically buys $BBURN and sends it to the official burn wallet, where tokens are permanently destroyed on-chain."
    />
    <HowCard
      title="30% → Treasury & Buybacks"
      body="Reserved for strategic buybacks, ecosystem stability, and community-driven events that keep $BBURN’s fire burning long-term."
    />
    <HowCard
      title="20% → Team, Creators & Growth"
      body="Rewards creators, partners, and community builders — spreading the legend of $BBURN across Solana while fueling future innovation."
    />
  </div>
</section>    

{/* ===== Meet the Burning Bear ===== */}
  <section id="bear" className="relative w-full overflow-hidden pt-16 pb-16 md:pt-20 md:pb-20 text-center">
  {/* full-width dark background */}
  <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0d1a14] via-[#141f1a] to-[#0d1a14]" />
  <div className="absolute inset-x-0 bottom-0 h-[40vh] bg-gradient-to-t from-amber-600/10 via-amber-400/5 to-transparent blur-[80px]" />

  {/* Animated Bear GIF */}
  <div className="mx-auto mb-8 w-[260px] md:w-[320px] relative">
    <img
  src="/img/burning_bear_BBURN_v2.gif"
  alt="The Burning Bear"
  className="w-full h-auto rounded-2xl bear-breathe shadow-ember"
/>
    <div className="pointer-events-none absolute inset-0 rounded-2xl bg-amber-500/10 blur-[60px] animate-pulse" />
  </div>

  {/* Title */}
  <h2 className="text-4xl md:text-5xl font-extrabold text-amber-300 drop-shadow-[0_0_10px_rgba(255,184,76,0.25)]">
    Meet The Burning Bear
  </h2>

  {/* Underline */}
  <div className="mx-auto mt-3 mb-6 h-[3px] w-24 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 drop-shadow-[0_0_6px_rgba(255,184,76,0.35)]" />

  {/* Story */}
  <div className="mx-auto max-w-3xl text-white/80 leading-relaxed text-lg space-y-5">
    <p>
      Long before the campfire roared across Solana, a quiet bear walked the forests of forgotten
      chains, collecting embers from every spark of belief. He wasn’t the kind that sleeps through
      winters. He was the kind that builds warmth for everyone who dares to dream.
    </p>
    <p>
      When markets turned cold and others ran, he stayed, feeding the flame, reminding us that even
      in a bearish world, the fire can rise. Each burn he makes is a heartbeat of the community: a
      symbol of resilience, humor and transparency.
    </p>
    <p className="text-amber-200 font-semibold tracking-wide">
      The Burning Bear doesn’t burn alone, he keeps the fire alive for everyone who believes.<br />
      <span className="text-amber-100/90">
        Every spark counts. Every burn means something. 🔥
      </span>
    </p>
  </div>

  {/* Soft base glow */}
  <div className="pointer-events-none absolute left-1/2 top-full mt-12 -translate-x-1/2 h-64 w-64 rounded-full bg-amber-400/10 blur-[90px]" />
</section>

{/* ===== This Week at the Campfire ===== */}
  <section id="week" className="mx-auto max-w-6xl px-4 pt-12 pb-10 md:pt-20 md:pb-14">
  <h3 className="text-2xl font-bold text-amber-300 mb-4">
    This Week at the Campfire
  </h3>
  <p className="text-white/60">
    Activity in the last 7 days. Auto-updated from the live logs.
  </p>

  <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    <StatBig label="Burns" value={fmtInt(weekStats.count)} />
    <StatBig label="SOL Spent" value={`${weekStats.sol.toFixed(3)} SOL`} />
    <StatBig label="USD Value" value={fmtMoney(weekStats.usd)} />
    <StatBig label="Largest Burn (BBURN)" value={fmtInt(weekStats.largest)} />
  </div>

  <div className="mt-4">
    <Pill>
      Avg per burn: {weekStats.avgSol ? `${weekStats.avgSol.toFixed(3)} SOL` : '—'}
    </Pill>
  </div>
</section>

{/* ===== Campfire Wallets ===== */}
<section id="wallets" className="scroll-mt-28 md:scroll-mt-32 lg:scroll-mt-36 mx-auto max-w-6xl px-4 py-10">
  <h3 className="text-2xl font-bold text-amber-300 mb-4">Campfire Wallets</h3>
  <p className="text-white/60">
    The campfire burns in full view. Every wallet can be verified on Solana Explorer.
  </p>

  <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
    <WalletCard
  title="Official Burn Wallet"
  address={BURN_WALLET}
  note="All $BBURN sent here are burned forever."
/>
    <WalletCard
  title="Treasury & Buybacks"
  address={TREASURY_WALLET}
  note="Funds for buybacks and operations."
/>
    <WalletCard
  title="Team & Marketing"
  address={MARKETING_WALLET}
  note="Supports growth, creators and partnerships. "
/>
  </div>
</section>

    {/* ===== Contract Address (blended) ===== */}
<section className="mx-auto max-w-5xl px-4 pt-8 pb-20 text-center">
  <h3 className="text-lg font-semibold text-amber-300 mb-3">
    Contract Address
  </h3>

  <div
    className="mx-auto flex max-w-3xl items-center justify-between gap-3
               rounded-xl border border-white/[0.08] bg-white/[0.03]
               px-4 py-3 backdrop-blur-sm shadow-[0_0_20px_rgba(255,184,76,0.04)]"
  >
    {/* Address */}
    <code
      className="flex-1 font-mono text-[15px] text-white/90 text-left truncate select-text"
      title={FULL_TOKEN_ADDRESS}
    >
      {FULL_TOKEN_ADDRESS}
    </code>

    {/* Buttons */}
    <div className="flex items-center gap-2">
      <a
        href={`${EXPLORER}/address/${FULL_TOKEN_ADDRESS}`}
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-lg border border-white/10 bg-white/[0.06]
                   px-3 py-1.5 text-sm font-medium text-white/80
                   hover:bg-white/[0.1] hover:text-white/90 transition"
      >
        View
      </a>
      <button
        onClick={handleCopy}
        className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition
          ${copied
            ? 'bg-[#ffedb3] text-black shadow-[0_0_8px_rgba(255,184,76,0.35)]'
            : 'bg-[#ffedb3]/90 text-black hover:bg-[#ffe48d]'
          }`}
      >
        {copied ? 'Copied!' : 'Copy'}
      </button>
    </div>
  </div>

  <p className="mt-3 text-sm text-white/45">
    Always verify this address on Solana Explorer before interacting.
  </p>
</section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/10 bg-[#0d1a14] relative">
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
        <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-white/60 space-y-4">
          <p className="text-white/80 text-base font-medium">
            🔥 The Burning Bear isn’t just a meme - it’s a movement. <br />
            Built on the <span className="text-[#ffe48d] font-semibold">50/30/20 Campfire Split</span> - transparent, alive and always feeding the flames.
          </p>

          <div className="flex justify-center gap-8 text-white/70 text-sm pt-2">
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
              href="https://www.geckoterminal.com/solana/pools/9hVAstjuDaVGznN4iAUW6cb2nQxNieSW7vR2pu6x32CQ"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-300 transition"
              title="View on CoinGecko"
            >
              🦎 <span className="align-middle">CoinGecko</span>
            </a>
            <a
              href="https://dexscreener.com/solana/9hvastjudavgznn4iauw6cb2nqxniesw7vr2pu6x32cq"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-amber-300 transition"
              title="View on DexScreener"
            >
              🔥 <span className="align-middle">DexScreener</span>
            </a>
          </div>

          <div className="text-xs text-white/40 pt-2">
            <p>© {new Date().getFullYear()} The Burning Bear $BBURN · Built for fun, not financial advice.</p>
            <p>Stay warm, stay transparent, and keep the fire burning. </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
/* =========================
   Components
========================= */
// At the bottom of page.tsx (where your components live)
type CountdownProps = {
  label: React.ReactNode;
  value?: string;          // for 'plain' or 'glow'
  ms?: number;             // for 'segments' (pass the raw ms)
  variant?: 'plain' | 'glow' | 'segments';
};

function Countdown({ label, value, ms, variant = 'plain' }: CountdownProps) {
  // Small formatter when using the 'segments' style
  const segs =
    typeof ms === 'number'
      ? (() => {
          const t = Math.max(0, Math.floor(ms / 1000));
          const h = Math.floor(t / 3600);
          const m = Math.floor((t % 3600) / 60);
          const s = t % 60;
          return {
            h: String(h),
            m: m.toString().padStart(2, '0'),
            s: s.toString().padStart(2, '0'),
          };
        })()
      : null;

  return (
    <div>
      {/* Label */}
      <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">
        {label}
      </div>

      {/* Value */}
      {variant === 'segments' && segs ? (
        <div className="mt-2 flex items-center gap-[4px] md:gap-[6px]">
<div className="mt-2 flex items-center gap-1.5 md:gap-2">
  <SegmentBox label="h">{segs.h}</SegmentBox>
  <Colon />
  <SegmentBox label="m">{segs.m}</SegmentBox>
  <Colon />
  <SegmentBox label="s">{segs.s}</SegmentBox>
</div>
        </div>
      ) : variant === 'glow' ? (
        <div
          className="mt-1 text-3xl font-extrabold bg-gradient-to-r from-amber-200 via-amber-100 to-white bg-clip-text text-transparent md:text-[36px]"
          style={{ textShadow: '0 0 12px rgba(255,184,76,0.25)' }}
        >
          {value}
        </div>
      ) : (
        <div className="mt-1 text-3xl font-extrabold text-white/85 md:text-[36px]">
          {value}
        </div>
      )}
    </div>
  );
}

function SegmentBox({
  children,
  label,
}: {
  children: React.ReactNode;
  label?: string;
}) {
  return (
    <span className="relative inline-flex items-center justify-center rounded-xl
                     border border-white/10 bg-white/[0.08] backdrop-blur
                     px-4 py-2.5 text-[28px] md:text-[34px] font-extrabold tracking-tight
                     leading-none text-white/90 shadow-[0_0_18px_rgba(0,0,0,0.30)]">
      {children}
      {label && (
        <span
          className="absolute bottom-[4px] right-[10px] md:bottom-[5px] md:right-[12px]
                     text-[11px] md:text-[12px] font-semibold text-amber-200/85
                     drop-shadow-[0_0_4px_rgba(0,0,0,0.35)]"
        >
          {label}
        </span>
      )}
    </span>
  );
}

function Colon({ soon = false }: { soon?: boolean }) {
  return (
    <span
      className="px-0.5 text-amber-200 colon-pulse colon-glow"
      style={{ ['--colon-speed' as any]: soon ? '1.1s' : '2.6s' }}
    >
      :
    </span>
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

function Pill({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={
        `inline-flex items-center rounded-2xl border border-white/15 bg-white/5
         px-4 py-[7px] text-[15px] leading-none text-white/75 backdrop-blur
         ${className}`
      }
    >
      {children}
    </span>
  );
}

function HowCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-5 md:p-6">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-white/75">{body}</div>
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
      <div className="text-base md:text-lg font-semibold">{title}</div>
      {note && <div className="mt-1 text-sm text-white/65">{note}</div>}
      <div className="mt-3 flex items-center justify-between gap-3">
        <code className="truncate rounded-md bg-white/5 px-2 py-1 text-sm md:text-[15px] text-white/85">
          {truncateMiddle(address, 8, 8)}
        </code>
        <div className="flex items-center gap-2">
          <a
            href={`${EXPLORER}/address/${address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-[10px] border border-white/12 bg-white/[0.06] px-3.5 py-1.5 text-sm font-medium text-white/85 hover:bg-white/[0.10] transition"
          >
            View
          </a>
          <button
            onClick={handleCopy}
            className={`rounded-[10px] px-3.5 py-1.5 text-sm font-semibold text-black transition
              ${copied ? 'bg-[#ffedb3] ring-2 ring-amber-300/40' : 'bg-[#ffedb3] hover:bg-[#ffe48d]'}`}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
      </div>
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
