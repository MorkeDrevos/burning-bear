'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

import TreasuryLockCard from './components/TreasuryLockCard';
import CopyButton from './components/CopyButton';
import BonusBanner from './components/BonusBanner';

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

// ✅ Add this new constant here
const TREASURY_LOCK_URL =
  'https://lock.jup.ag/escrow/7ZXVVqndPktLXQ5FsmLMniwhUGvNFVJyKgVKR8tVpx77';

// Add below EXPLORER or near other constants
const JUP_URL = `https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=BXvBhz6Va2Ed8HnzMDChzHCTqKXLvJpGadfLhvK5pump`;

// ===== Giveaway Tease Config =====
const SHOW_GIVEAWAY = true;                 // toggle on/off
const GIVEAWAY_TITLE = "Campfire Bonus Round 1";
const GIVEAWAY_SUB = "Stay near the flames 🔥 Exclusive rewards for $BBURN holders soon.";
const GIVEAWAY_LINK_TEXT = "Follow updates";
const GIVEAWAY_LINK_URL = "https://x.com/burningbearcamp";

// Optional: hide after a point in time (ms since epoch). Set to null to disable.
const GIVEAWAY_HIDE_AFTER = null as number | null;
// e.g. schedule: Date.parse("2025-10-30T18:00:00Z")

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
    // allow either minutes or ms (or both)
    burnIntervalMinutes?: number;
    buybackIntervalMinutes?: number;

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

  const broadcast = useBroadcast();

  // 🔥 Burn overlay trigger state (visual only)
  const [showBurnMoment, setShowBurnMoment] = useState(false);

  // Hide overlay after 4.5s
  useEffect(() => {
    if (!showBurnMoment) return;
    const t = window.setTimeout(() => setShowBurnMoment(false), 4500);
    return () => window.clearTimeout(t);
  }, [showBurnMoment]);

  // Prevent double triggers when countdown hovers near zero
  const lastTriggerRef = useRef<number>(0);

  // Tick each second (drives countdowns)
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load JSON data (cache-busted), normalize, and persist a last-good copy
useEffect(() => {
  let alive = true;

  (async () => {
    try {
      const res = await fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`state.json HTTP ${res.status}`);
      const d = await res.json();

      if (!alive || !d) return;

      // --- schedule normalization ---
      const s = { ...(d.schedule ?? {}) } as any;
      const burnMins    = typeof s.burnIntervalMinutes === 'number' ? s.burnIntervalMinutes : 60;
      const buybackMins = typeof s.buybackIntervalMinutes === 'number' ? s.buybackIntervalMinutes : 20;

      if (s.burnIntervalMs == null && burnMins != null)    s.burnIntervalMs = burnMins * 60_000;
      if (s.buybackIntervalMs == null && buybackMins != null) s.buybackIntervalMs = buybackMins * 60_000;

      const nowTs = Date.now();
      if (s.nextBurnAt == null && s.burnIntervalMs)    s.nextBurnAt = nowTs + s.burnIntervalMs;
      if (s.nextBuybackAt == null && s.buybackIntervalMs) s.nextBuybackAt = nowTs + s.buybackIntervalMs;

      // --- burns normalization ---
      const burns = (d?.burns ?? [])
        .map((b: any) => ({ ...b, timestamp: typeof b.timestamp === 'number' ? b.timestamp : Date.parse(b.timestamp) }))
        .filter((b: any) => Number.isFinite(b.timestamp));

      const nextState: StateJson = { ...d, schedule: s, burns };

      setData(nextState);

      // persist last good copy for offline/404 fallback
      try { sessionStorage.setItem('bburn_last_state', JSON.stringify(nextState)); } catch {}
    } catch (err) {
      console.error('Failed to load /data/state.json:', err);

      // try fallback to last good state
      try {
        const cached = sessionStorage.getItem('bburn_last_state');
        if (cached) setData(JSON.parse(cached));
      } catch {}
    }
  })();

  return () => { alive = false; };
}, []);

  // Live SOL price (falls back to stats.priceUsdPerSol)
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

  const priceUsdPerSol = solUsd ?? data?.stats?.priceUsdPerSol ?? 0;

  // Sorted burns (new → old)
  const burnsSorted = useMemo(() => {
    const arr = (data?.burns ?? []) as Array<Burn & { timestamp: number }>;
    return arr.slice().sort((a, b) => b.timestamp - a.timestamp);
  }, [data]);

  // Shared, absolute countdown targets
  const targets = useMemo(() => {
    const s = data?.schedule ?? {};
    const bb =
      s.nextBuybackAt ??
      (s.lastBuybackAt && s.buybackIntervalMs ? s.lastBuybackAt + s.buybackIntervalMs : undefined);
    const burn =
      s.nextBurnAt ??
      (s.lastBurnAt && s.burnIntervalMs ? s.lastBurnAt + s.burnIntervalMs : undefined);
    return { bb, burn };
  }, [data]);

  // Buyback countdown (safe fallback = +∞ so it never shows as "0")
  const nextBuybackMs =
    typeof targets?.bb === 'number' && isFinite(targets.bb) ? targets.bb - now : Number.POSITIVE_INFINITY;

  // Burn countdown (safe fallback = +∞)
  const burnAt =
    typeof targets?.burn === 'number' && isFinite(targets.burn) ? targets.burn : null;
  let nextBurnMs = burnAt !== null ? burnAt - now : Number.POSITIVE_INFINITY;

// Test hook (only triggers if you open the page with #testburn)
if (typeof window !== 'undefined' && window.location.hash === '#testburn') {
  nextBurnMs = 500; // 0.5s for manual testing only
}

// ========= Toggle (near other config at top) =========
const ENABLE_BURN_OVERLAY = false; // set false to disable the banner entirely

// ========= Fire overlay once when countdown crosses ~0 (no sound) =========
const prevMsRef = useRef<number | null>(null);

useEffect(() => {
  if (!ENABLE_BURN_OVERLAY) return;

  // Not a number or not yet initialized
  if (!Number.isFinite(nextBurnMs)) return;

  // Support manual testing: if URL has #testburn, allow tiny negative drift
  const forceTest =
    typeof window !== 'undefined' && window.location.hash === '#testburn';

  const prev = prevMsRef.current;
  prevMsRef.current = nextBurnMs;

  // Show in the last 0.8s, allow short negative grace for timer drift
  const THRESHOLD = 800;   // ms before zero
  const NEG_GRACE = forceTest ? 3500 : 2500;

  // Only trigger once when we cross from >THRESHOLD down into the window
  const crossed =
    (prev == null || prev > THRESHOLD) &&
    nextBurnMs <= THRESHOLD &&
    nextBurnMs >= -NEG_GRACE;

  if (!crossed) return;

  // Prevent double-flash if React re-renders around zero
  const nowTs = Date.now();
  const COOLDOWN = 10_000; // ms
  const last = lastTriggerRef.current || 0;

  if (nowTs - last < COOLDOWN || showBurnMoment) return;

  lastTriggerRef.current = nowTs;
  setShowBurnMoment(true);
}, [nextBurnMs, showBurnMoment]);

  // Auto-loop: seed if missing and roll forward with a small buffer
useEffect(() => {
  setData((prev) => {
    if (!prev?.schedule) return prev;

    const s = prev.schedule as any;
    const nowTs = Date.now();

    // accept minutes or ms
    const toMs = (v?: number) => (typeof v === 'number' ? (v >= 10_000 ? v : v * 60_000) : undefined);

    const burnI = s.burnIntervalMs ?? toMs(s.burnIntervalMinutes);
    const buyI  = s.buybackIntervalMs ?? toMs(s.buybackIntervalMinutes);
    if (!burnI && !buyI) return prev;

    // seed if missing
    let nextBurnAt    = s.nextBurnAt    ?? (burnI ? nowTs + burnI : undefined);
    let nextBuybackAt = s.nextBuybackAt ?? (buyI  ? nowTs + buyI  : undefined);

    // only advance after a tiny buffer past the target (handles sleeping tabs)
    const BUFFER = 15_000; // 15s

    if (nextBurnAt && burnI && nowTs > nextBurnAt + BUFFER) {
      const k = Math.ceil((nowTs - (nextBurnAt + BUFFER)) / burnI);
      nextBurnAt = nextBurnAt + k * burnI;
    }
    if (nextBuybackAt && buyI && nowTs > nextBuybackAt + BUFFER) {
      const k = Math.ceil((nowTs - (nextBuybackAt + BUFFER)) / buyI);
      nextBuybackAt = nextBuybackAt + k * buyI;
    }

    // no change? keep previous object to avoid re-render churn
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

  // ...rest of your component (render) continues below
 
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

  return (
    <main id="top">
      {/* ===== Header ===== */}
      <header className="sticky top-0 z-[90] w-full border-b border-white/10 bg-[#0d1a14]/90 backdrop-blur-md shadow-lg">
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
  <a href="#roadmap" className="text-[#ffe48d] hover:text-amber-300 transition">Roadmap</a>
</nav>

          {/* Right: Copy CA + Mobile Menu */}
<div className="flex items-center gap-2 md:gap-3">
  {/* removed CA chip + Copy CA */}
  <a
  href="https://x.com/burningbearcamp"
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
    <div className="relative w-full rounded-2xl bg-black/25 backdrop-blur-sm px-5 py-6 md:px-7 md:py-7 shadow-[0_0_40px_rgba(255,170,60,0.12)]">
      {/* Headline */}
      <h1 className="max-w-4xl text-5xl md:text-6xl font-extrabold leading-tight text-amber-50 drop-shadow-[0_0_12px_rgba(255,184,76,0.25)]">
        Meet The Burning Bear – Solana’s deflation engine
      </h1>

      {/* Countdowns */}
      <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
        {/* <Countdown label="Next buyback in" value={fmtCountdown(nextBuybackMs)} /> */}
        <Countdown
  label="Next burn in"
  ms={Number.isFinite(nextBurnMs) ? nextBurnMs : undefined}
  variant="segments"
/>
      </div>

     {/* Stats */}
<div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-4">
  <Stat label="Burned So Far"       value={fmtInt(BURNED)}                               highlight={showBurnMoment} />
  <Stat label="Current Supply"      value={fmtInt(CURRENT)}                              highlight={showBurnMoment} />
  <Stat label="Buyback Spent"       value={`${(data?.stats?.buybackSol ?? 0).toFixed(2)} SOL`} highlight={showBurnMoment} />
  <Stat label="Total Buyback Value" value={fmtMoney(totalUsd)}                           highlight={showBurnMoment} />
</div>

      {/* Pills */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        {/* Left: existing pills */}
        <div className="flex flex-wrap items-center gap-3">
          <a href="#log">
            <Pill className="cursor-pointer bg-orange-500/20 text-orange-400 font-semibold hover:bg-orange-500/25">
              🔥 Total Burns: {data?.burns?.length ?? 0}
            </Pill>
          </a>
          <Pill>Initial Supply: {fmtInt(INITIAL)}</Pill>
          <Pill>SOL: {fmtMoney(priceUsdPerSol)}</Pill>
        </div>

        {/* Right: Powered by Solana (replaces old Treasury pill) */}
<div
  className="inline-flex items-center gap-2 text-amber-200 font-semibold sm:ml-auto select-none"
  aria-label="Powered by the Solana blockchain"
>
  <SolanaMark className="h-4 w-4 text-amber-200" />
  <span>Powered by the Solana blockchain</span>
</div>
      </div>

      </div> {/* end translucent stats panel */}

</div> {/* end max-w container */}
</section> {/* close the HERO section */}


{/* Burn overlay */}
<BurnMoment
  show={showBurnMoment}
  onDone={() => setShowBurnMoment(false)}
  durationMs={4500}
/>


{/* ↓↓↓ Contract + Treasury strip (with more spacing above) ↓↓↓ */}
<section className="bg-[#0d1411] border-t border-white/5 pt-8 pb-5">
  <div className="mx-auto flex flex-wrap items-center justify-center gap-5 text-[16px] md:text-[17px] text-white/90 font-medium px-4 max-w-6xl">

    {/* $BBURN + CA + Copy */}
    <div className="inline-flex items-center gap-2">
      <span className="font-semibold text-amber-100">$BBURN</span>
      <code
        className="font-mono text-[15px] text-white/70"
        title={FULL_TOKEN_ADDRESS}
      >
        {truncateMiddle(FULL_TOKEN_ADDRESS, 6, 6)}
      </code>
      {/* CopyButton with hover tooltip */}
<div className="relative group">
  <CopyButton
    value={FULL_TOKEN_ADDRESS}
    label="Copy contract address"
    className="h-8 w-8 rounded-md bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
  />
  <span className="absolute left-1/2 -bottom-7 -translate-x-1/2 text-xs text-amber-200 bg-black/60 px-2 py-[2px] rounded opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
    Copy CA
  </span>
</div>
    </div>

    {/* Divider */}
    <span className="opacity-50 text-[18px]">|</span>

    {/* Treasury vault scroll link */}
<a
  href="#vault"
  className="group inline-flex items-center gap-2 text-[15px] md:text-[16px] text-white/90 hover:text-amber-200 transition tracking-wide"
>
  <span role="img" aria-label="lock" className="text-[20px]">🔒</span>
  <span className="font-semibold">BBURN Treasury Vault Lock</span>
  <span className="inline-flex items-center gap-1 text-white/80 group-hover:text-amber-200 transition text-[17px] md:text-[16px]">
    – View details
    <svg
      viewBox="0 0 24 24"
      className="h-[16px] w-[16px] translate-x-0 transition-transform duration-200 group-hover:translate-x-0.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  </span>
</a>

  </div>
</section>
{/* ↑↑↑ End Contract + Treasury strip */}

{/* ===== Live Burn Log — marquee + full-click cards ===== */}
<section
  id="log"
  className="w-full px-4 sm:px-6 lg:px-8 mt-6 scroll-mt-24 md:scroll-mt-28"
>
  <div className="flex items-baseline justify-between max-w-7xl mx-auto">
    <h2 className="text-2xl font-bold">Live Burn Log 🔥</h2>

    {/* ⚡ Boosted badge (linked to DexScreener) */}
    {false && ( 
      <a
      href="https://dexscreener.com/solana/9hvastjudavgznn4iauw6cb2nqxniesw7vr2pu6x32cq"
      target="_blank"
      rel="noopener noreferrer"
      title="View live pair on DexScreener"
      className="boosted-badge flex items-center gap-2 self-start -translate-y-1.5
                 bg-gradient-to-r from-amber-600/20 to-amber-400/10
                 px-3 py-[5px] rounded-lg border border-amber-500/20
                 text-amber-200 font-semibold text-sm tracking-wide
                 shadow-[0_0_10px_rgba(255,184,76,0.25)]
                 hover:bg-amber-500/15 hover:text-amber-100
                 transition-all duration-200"
    >
      <span className="text-lg leading-none">⚡</span>
      <span>Boosted 10x</span>
    </a>
    )}
  </div>

{/* Build items: newest first, duplicate for seamless loop */}
{(() => {
  const visible = (burnsSorted ?? []).slice(
    0,
    Math.max(4, Math.min(6, (burnsSorted ?? []).length))
  );
  const items = visible.length > 1 ? [...visible, ...visible] : visible;
  const dur = Math.max(18, visible.length * 6); // seconds

  return (
    <div className="mt-6 relative overflow-hidden auto-marquee">
      <div
        className="marquee-track flex gap-6 will-change-transform px-1"
        style={{ animationDuration: `${dur}s` as React.CSSProperties['animationDuration'] }}
      >
        {items.map((b, i) => (
          <a
            key={`${b.id}-${i}`}
            href={b.tx}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`View TX for burn of ${b.amount.toLocaleString()} BBURN`}
            className="group block flex-shrink-0 w-[520px] sm:w-[560px] md:w-[580px] lg:w-[600px]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70 rounded-3xl"
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
          </a>
        ))}
      </div>

      {/* subtle fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#0d1a14] to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#0d1a14] to-transparent" />
    </div>
  );
})()}
  
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

{/* ===== Meet + Why (merged, single section) ===== */}
<section id="bear" className="relative w-full overflow-hidden py-20 md:py-24">
  {/* Warm lighter background & soft fade */}
  <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0f1a15] via-[#16231d] to-[#0f1a15]" />
  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[180px] bg-gradient-to-t from-black/20 via-transparent to-transparent" />

  <div className="mx-auto max-w-6xl px-4">
    {/* Bear image */}
    <div className="mx-auto mb-8 w-[260px] md:w-[320px] relative">
      <img
        src="/img/burning_bear_BBURN_v2.gif"
        alt="The Burning Bear"
        className="w-full h-auto rounded-2xl shadow-ember"
      />
      <div className="pointer-events-none absolute inset-0 rounded-2xl bg-amber-500/10 blur-[60px]" />
    </div>

    {/* Title */}
    <h2 className="text-4xl md:text-5xl font-extrabold text-amber-300 text-center">
      Meet The Burning Bear
    </h2>

    {/* Story */}
    <div className="mx-auto mt-6 max-w-3xl text-white/80 leading-relaxed text-lg space-y-5 text-center">
      <p>
        Long before the campfire roared across Solana, a quiet bear walked the forests of forgotten chains,
        collecting embers from every spark of belief. He wasn’t the kind that sleeps through winters.
        He was the kind that builds warmth for everyone who dares to dream.
      </p>
      <p>
        When markets turned cold and others ran, he stayed, feeding the flame, reminding us that even
        in a bearish world, the fire can rise. Each burn he makes is a heartbeat of the community:
        a symbol of resilience, humor and transparency.
      </p>
      <p className="text-amber-200 font-semibold tracking-wide">
        The Burning Bear doesn’t burn alone — he keeps the fire alive for everyone who believes.
        <br />
        <span className="text-amber-100/90">Every spark counts. Every burn means something. 🔥</span>
      </p>
    </div>

    {/* Divider */}
    <div className="mx-auto mt-10 h-[3px] w-24 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-amber-400 opacity-80" />

    {/* Why card (inside same section/background) */}
    {/* Why section — full-width translucent card, centered text */}
<div className="mt-16 w-full px-0">
  <h3 className="text-2xl md:text-3xl font-bold text-amber-300 text-center mb-8">
    Why The Burning Bear Exists
  </h3>

  <div className="w-full border-t border-b border-white/10 bg-white/[0.04] backdrop-blur-md py-10 px-4 md:px-0">
    <div className="mx-auto max-w-4xl text-center text-white/80 leading-relaxed text-lg space-y-5">

      <p>
        <span className="font-semibold text-amber-200">The Burning Bear</span> was designed to be <span className="font-semibold">Solana’s deflation engine</span>.
        He isn’t another dog or cat meme — he’s a symbol of value built through <span className="font-semibold">scarcity, not dilution</span>.
        While governments print money and weaken purchasing power, we do the opposite.
      </p>

      <p>
        <span className="font-semibold">Buybacks, burns and rewards</span> literally fuel the fire. With every burn, the ecosystem strengthens
        and holders benefit — because a token is only as strong as the people who stand behind it.
      </p>

      <p>
        We’re building a legacy with <span className="font-semibold">organic growth, transparency,
        traceable flows and long-term intent</span>.
      </p>

      <p className="text-amber-200 font-semibold">
        And yes… the bear is just getting started. Big things are coming. 🔥
      </p>
    </div>
  </div>

  <div className="mt-6 flex justify-center">
    <span className="inline-flex items-center rounded-2xl border border-white/15 bg-white/5 px-4 py-[7px] text-[15px] leading-none text-white/75">
      TL;DR: Scarcity &gt; Dilution • Real buybacks • Real burns • Real rewards
    </span>
  </div>
</div>
  </div>
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

{/* ===== Roadmap — The Deflation Engine (fixed width, no bleed) ===== */}
<section
  id="roadmap"
  className="py-16 md:py-24 scroll-mt-[88px] md:scroll-mt-[100px] lg:scroll-mt-[116px]"
>
  {/* one container controls width */}
  <div className="mx-auto w-full max-w-6xl px-4">
    <h3 className="text-2xl md:text-3xl font-bold text-amber-300">
      Roadmap — The Deflation Engine
    </h3>
    <p className="mt-2 text-white/65 max-w-4xl md:max-w-5xl">
  Real burns, transparency, hype momentum. A clear path from first spark to a cultural deflation brand on Solana.
</p>

    <div className="mt-10 space-y-10">
      {[
        {
          icon: "🪓",
          title: "Phase 1 – The Ignition",
          goal: "Establish credibility and prove the deflation concept is real, not talk.",
          items: [
            "Launch site + live burn tracker",
            "Transparent burns (Solscan links)",
            "Dexscreener + Birdeye presence",
            "Early community on X",
            "Holder & wallet transparency",
          ],
          outcome: "🔥 Outcome: BBURN is known as “the real burning token.”",
        },
        {
          icon: "⚡",
          title: "Phase 2 — The Expansion",
          goal: "Scale momentum with disciplined, data-led growth.",
          items: [
            "Scheduled auto-burn loops (3 daily)",
            "“Campfire Bonus” rounds & incentives",
            "Strategic collabs (quality Solana projects)",
            "Visibility flywheel: Dexscreener/Birdeye + creators",
            "Treasury-lock proofs & weekly summaries",
          ],
          outcome:
            "🔥 Outcome: Consistent burns, rising liquidity & holder growth.",
        },
        {
          icon: "🧱",
          title: "Phase 3 – The Campfire Network",
          goal: "Build ecosystem credibility + longevity.",
          items: [
            "Holder dashboard & burn leaderboard",
            "NFT badges & top-holder ranks",
            "Real-time Burn Log API",
            "Phase 3 site refresh",
            "Community contests & airdrops",
          ],
          outcome:
            "🔥 Outcome: From meme → movement — the culture of burning & proof of supply.",
        },
        {
          icon: "🐻",
          title: "Phase 4 – The Eternal Flame",
          goal: "Long-term sustainability and symbolic permanence.",
          items: [
            "Perpetual burn vault (treasury-funded)",
            "Cross-project “Burn Alliance”",
            "Exchange / aggregator listings",
            "Merch + IRL campaigns",
            "DAO voting on next burn cycles",
          ],
          outcome:
            "🔥 Outcome: BBURN becomes the first cultural deflation brand on Solana.",
        },
      ].map((phase, i) => (
        <div
          key={i}
          className="
            w-full overflow-hidden
            rounded-2xl border border-white/10
            bg-gradient-to-b from-[#101c16] via-[#14251d] to-[#101c16]
            backdrop-blur-md p-8 md:p-10
            hover:border-white/20 hover:bg-white/[0.055] transition-colors
          "
        >
          <div className="mb-3 flex items-center gap-3">
            <span className="text-2xl">{phase.icon}</span>
            <h4 className="text-xl md:text-2xl font-semibold text-amber-200">
              {phase.title}
            </h4>
          </div>

          <ul className="mb-4 grid grid-cols-1 gap-1.5 text-sm text-white/75 md:grid-cols-2">
            <li>• Goal: {phase.goal}</li>
            {phase.items.map((it, j) => (
              <li key={j}>• {it}</li>
            ))}
          </ul>

          <div className="inline-flex items-center rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-1 text-sm font-semibold text-amber-200">
            {phase.outcome}
          </div>
        </div>
      ))}
    </div>
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

{/* ===== Treasury Vault Lock ===== */}
<section
  id="vault"
  className="scroll-mt-[88px] md:scroll-mt-[104px] lg:scroll-mt-[120px] mx-auto max-w-6xl px-4 mt-10"
>
  <h3 className="mb-4 text-2xl font-bold text-amber-300">Treasury Vault Lock</h3>

<TreasuryLockCard
  tokenSymbol="BBURN"
  lockedAmount={30_000_000}
  lockedAtISO="2025-10-28T12:00:00Z"
  unlockAtISO="2026-04-28T00:00:00Z"
  escrowUrl={TREASURY_LOCK_URL}
  escrowAddress="7ZXVVqndPktLXQ5FsmLMniwhUGvNFVJyKgVKR8tVpx77"
  recipientAddress="FH2EathAXbSScfmb2Zn4FYVEbjLwGo7QoSNxvNxQZ5qE"
/>

  {/* Optional: small subtext */}
  <p className="mt-3 text-sm text-white/55">
    Multisig escrow on Jupiter Lock. All details are verifiable on-chain.
  </p>
</section>

    {/* ===== Contract Address (blended) ===== */}
<section className="mx-auto max-w-5xl px-4 pt-16 pb-20 text-center">
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

      {/* ← This replaces BOTH of your old copy buttons */}
      <CopyButton
        value={FULL_TOKEN_ADDRESS}
        className="h-9 w-9 rounded-lg bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
        label="Copy contract address"
      />
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
              href="https://x.com/burningbearcamp"
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

{/* Sticky Buy button (bottom-right) – hide during broadcast */}
{!broadcast.on && (
  <a
    href={JUP_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Buy $BBURN on Jupiter"
    className="
      fixed z-50
      right-6 bottom-[calc(1.25rem+env(safe-area-inset-bottom,0))]
      inline-flex items-center gap-2.5
      rounded-full px-5 py-3 font-semibold
      text-[#120d05]
      bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-400
      ring-1 ring-amber-200/40 shadow-xl
      hover:scale-[1.04] hover:brightness-110 active:scale-[0.98]
      transition-transform duration-150
    "
    style={{
      boxShadow:
        '0 0 0 10px rgba(16,12,8,0.35), 0 10px 25px rgba(255,190,70,0.35), 0 0 40px rgba(255,180,60,0.25)',
    }}
  >
    <JupiterMark className="h-6 w-6 text-amber-900/80" />
    <span>Buy $BBURN on Jupiter</span>
  </a>
)}

{/* --- Broadcast overlays (top-most) --- */}
{broadcast.on && <LiveBug />}

{broadcast.on && <BonusBanner msToBurn={nextBurnMs} />}

{broadcast.on && Boolean(broadcast.params.get('lower')) && (
  <LowerThird
    title={(broadcast.params.get('lower') || '').split('|')[0] || 'Live Campfire'}
    subtitle={(broadcast.params.get('lower') || '').split('|')[1] || undefined}
  />
)}

{broadcast.on && Boolean(broadcast.params.get('reward')) && (
  <RewardPill
    msToBurn={nextBurnMs}
    potBBURN={Number(broadcast.params.get('reward')) || 0}
  />
)}

{broadcast.on && Boolean(broadcast.params.get('now')) && (
  <NowPlaying
    track={(broadcast.params.get('now') || '').split('|')[0]}
    artist={(broadcast.params.get('now') || '').split('|')[1]}
  />
)}

{broadcast.on && Boolean(broadcast.params.get('ticker')) && (
  <NewsTicker items={(broadcast.params.get('ticker') || '').split(';')} />
)}

</main>
);
}

/* =========================
   Components
========================= */
/* =========================
   Countdown (no h/m/s labels)
========================= */
type CountdownProps = {
  label: React.ReactNode;
  value?: string;          // for 'plain' or 'glow'
  ms?: number;             // for 'segments' (pass the raw ms)
  variant?: 'plain' | 'glow' | 'segments';
};

function Countdown({ label, value, ms, variant = 'plain' }: CountdownProps) {
  const hasFiniteMs = typeof ms === 'number' && Number.isFinite(ms);

  const segs = hasFiniteMs
    ? (() => {
        const t = Math.max(0, Math.floor(ms! / 1000));
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
      <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">
        {label}
      </div>

      {variant === 'segments' ? (
        segs ? (
          <div className="mt-2 flex items-center gap-[4px] md:gap-[6px]">
            <SegmentBox>{segs.h}</SegmentBox><Colon />
            <SegmentBox>{segs.m}</SegmentBox><Colon />
            <SegmentBox>{segs.s}</SegmentBox>
          </div>
        ) : (
          // Placeholder when no valid countdown target yet
          <div className="mt-2 flex items-center gap-[4px] md:gap-[6px] opacity-70">
            <SegmentBox>--</SegmentBox><Colon />
            <SegmentBox>--</SegmentBox><Colon />
            <SegmentBox>--</SegmentBox>
          </div>
        )
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

/* =========================
   Broadcast UI — Live TV vibe
   (Lowered overlays + bigger reward pill)
========================= */

const OVERLAY_TOP = 10;         // px from very top (under navbar/H1 area)
const TICKER_GAP  = 56;         // px the LowerThird sits above bottom ticker

function LiveBug({ className = "" }: { className?: string }) {
  return (
    <div
      className={"pointer-events-none fixed left-4 z-[80] " + className}
      style={{ top: `calc(var(--safe-top, 0px) + ${OVERLAY_TOP}px)` }}
    >
      <div className="inline-flex items-center gap-2 rounded-lg bg-red-600/90 px-3 py-1.5 shadow-lg">
        <span className="h-2.5 w-2.5 rounded-full bg-white animate-[blink_1.2s_infinite]" />
        <span className="text-xs font-extrabold tracking-widest text-white">LIVE</span>
        <span className="text-xs font-semibold text-white/90">• ON AIR</span>
      </div>
    </div>
  );
}

function LowerThird({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div
      className="pointer-events-none fixed left-4 z-[86] max-w-[60vw]"
      style={{ bottom: `calc(var(--safe-bottom, 0px) + ${TICKER_GAP}px)` }} // sits above ticker
    >
      <div className="rounded-2xl border border-amber-400/25 bg-black/55 backdrop-blur-md px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div className="text-amber-200 font-extrabold text-lg leading-tight">{title}</div>
        {subtitle ? <div className="text-white/75 text-sm mt-0.5">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function NowPlaying({ track, artist }: { track: string; artist?: string }) {
  return (
    <div
      className="pointer-events-none fixed right-4 z-[80]"
      style={{ top: `calc(var(--safe-top, 0px) + ${OVERLAY_TOP}px)` }}
    >
      <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 backdrop-blur px-3 py-1.5">
        <span className="h-[10px] w-[10px] rounded-[2px] bg-amber-300 animate-[levels_1.6s_ease-in-out_infinite]" />
        <div className="text-[12px] text-white/85">
          <span className="font-semibold text-amber-100">Now Playing:</span> {track}
          {artist ? <span className="text-white/65"> — {artist}</span> : null}
        </div>
      </div>
    </div>
  );
}

function RewardPill({ msToBurn, potBBURN }: { msToBurn: number; potBBURN: number }) {
  const soon = msToBurn >= 0 && msToBurn <= 5 * 60_000;
  return (
    <div
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[82]"
      style={{ top: `calc(var(--safe-top, 0px) + ${OVERLAY_TOP - 6}px)` }}
    >
      <div
        className={[
          "rounded-full border backdrop-blur shadow-lg",
          "px-6 py-3 text-amber-100 text-base sm:text-lg",
          "border-amber-400/25 bg-amber-500/10",
          soon ? "animate-[warmPulse_2.4s_ease-in-out_infinite]" : ""
        ].join(" ")}  // ✅ fixed join syntax — no trailing > or missing paren
      >
        <span className="font-semibold">🔥🔥🔥 Campfire Reward:</span>{" "}
        <span className="font-extrabold">{potBBURN.toLocaleString()} BBURN</span>
      </div>
    </div>
  );
}

function NewsTicker({ items }: { items: string[] }) {
  const loop = items.length ? [...items, ...items] : [];
  const dur = Math.max(20, items.length * 7);

  // pixels of empty space before the first visible item
  const leading = 56; // tweak 40–80 to taste

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-[84]"
      style={{ bottom: 'var(--safe-bottom, 0px)' }}
    >
      <div className="mx-auto max-w-6xl px-3">
        <div className="relative rounded-xl border border-white/10 bg-black/45 backdrop-blur overflow-hidden">
          <div
            className="whitespace-nowrap will-change-transform animate-[ticker_linear_infinite] leading-[1] py-2"
            style={{
              animationDuration: `${dur}s` as any,
              // soft edge fade
              maskImage:
                'linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)',
            }}
          >
            {/* left buffer so the first item doesn't start on the border */}
            <span style={{ display: 'inline-block', width: leading }} />

            {loop.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-5 text-[13px] text-white/85 align-middle"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 inline-block" />
                <span>{t}</span>
              </span>
            ))}

            {/* optional trailing spacer to smooth the wrap */}
            <span style={{ display: 'inline-block', width: leading }} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Segment Box (simple)
========================= */
function SegmentBox({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-xl
                 border border-white/10 bg-white/[0.08] backdrop-blur
                 px-3.5 py-2 text-[24px] md:text-[28px] font-extrabold tracking-tight
                 leading-none text-white/90 shadow-[0_0_18px_rgba(0,0,0,0.30)]"
    >
      {children}
    </span>
  );
}

/* =========================
   Colon Separator
========================= */
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

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 md:p-6 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div
        className={`mt-1 text-2xl font-extrabold ${
          highlight
            ? 'animate-pulse-fast text-amber-300 drop-shadow-[0_0_8px_rgba(255,184,76,0.45)]'
            : ''
        }`}
      >
        {value}
      </div>
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

function WalletCard({
  title,
  address,
  note,
}: {
  title: string;
  address: string;
  note?: string;
}) {
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

          {/* Icon-only copy button that flips to a check */}
          <CopyButton
            value={address}
            label="Copy wallet address"
            className="h-8 w-8 rounded-[10px] bg-white/5 ring-1 ring-white/10 hover:bg-white/10"
          />
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
  className="
  ml-1 text-amber-200/80 text-[22px]
  hover:text-amber-100 hover:drop-shadow-[0_0_6px_rgba(255,200,100,0.6)]
  transition active:scale-95
"
>
  ☰
</button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 border-b border-white/10 bg-[#0d1a14]/95 backdrop-blur">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-2 text-[15px] font-semibold">
            <a href="#how" className="py-2 text-[#ffe48d]" onClick={() => setOpen(false)}>How It Works</a>
            <a href="#log" className="py-2 text-[#ffe48d]" onClick={() => setOpen(false)}>Live Burns</a>
            <a href="#wallets" className="py-2 text-[#ffe48d]" onClick={() => setOpen(false)}>Campfire Wallets</a>

            {/* ✅ Add this new line */}
            <a href="#roadmap" className="py-2 text-[#ffe48d]" onClick={() => setOpen(false)}>Roadmap</a>
          </div>
        </div>
      )}
    </div>
  );
}

function HalloweenBar() {
  return (
    <div
      className="
        z-20 w-full bg-gradient-to-r from-[#2b1a0f]/95 via-[#150e08]/90 to-[#2b1a0f]/95
        border-b border-amber-500/30 backdrop-blur
        text-amber-100 flex items-center justify-center gap-3 py-3
        shadow-[0_0_25px_rgba(255,140,0,0.25)]
      "
    >
      <span className="flex items-center gap-3 text-[16px] sm:text-[17px] font-semibold">
        <span className="animate-pulse text-[18px]">🎃🎃🎃</span>
        <span className="text-amber-300 drop-shadow-[0_0_5px_rgba(255,200,0,0.3)]">
          Halloween Burn-a-thon
        </span>
        <span className="opacity-70">•</span>
        <span className="opacity-90 text-[15px]">extra burns, surprise drops</span>
      </span>
    </div>
  );
}

function SolanaMark({ className = "" }: { className?: string }) {
  // Monochrome version (fits your warm palette). Swap to gradient version below if you prefer.
  return (
    <svg
      viewBox="0 0 398 311"
      role="img"
      aria-label="Solana"
      className={className}
    >
      <defs>
        <linearGradient id="s" x1="0" x2="1" y1="0" y2="1">
          {/* very subtle purple-green; kept muted so it doesn’t clash */}
          <stop offset="0%" stopColor="#bca8ff" />
          <stop offset="100%" stopColor="#a8ffdf" />
        </linearGradient>
      </defs>
      {/* Use fill="currentColor" for monochrome via Tailwind text-* utilities */}
      <g fill="currentColor">
        <path d="M64 0h318c10 0 18 11 9 19l-68 60a20 20 0 0 1-13 5H0L64 0Z" />
        <path d="M64 156h318c10 0 18 11 9 19l-68 60a20 20 0 0 1-13 5H0l64-84Z" />
        <path d="M0 233h318c5 0 9 2 13 5l68 60c9 8 1 19-9 19H64L0 233Z" />
      </g>
    </svg>
  );
}

function JupiterMark({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} role="img" aria-label="Jupiter">
      <defs>
        <linearGradient id="j" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#F2B33A" />
          <stop offset="100%" stopColor="#FAD96E" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="16" fill="url(#j)" />
      <path
        d="M7.5 17.25c5.8-1.95 10.9-1.95 16.7 0"
        stroke="#5b3a0a"
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M9 12.5c4.8-1.4 9.2-1.4 14 0"
        stroke="#5b3a0a"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity=".9"
      />
      <path
        d="M9 21.5c4.8 1.4 9.2 1.4 14 0"
        stroke="#5b3a0a"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        opacity=".9"
      />
    </svg>
  );
}

function useBroadcast() {
  const [on, setOn] = React.useState(false);
  const [params, setParams] = React.useState<URLSearchParams>(new URLSearchParams());
  const onRef = React.useRef(false);

  React.useEffect(() => {
    const applySafeAreas = () => {
  const header = document.querySelector('header') as HTMLElement | null;
  const safeTop = (header?.getBoundingClientRect().height ?? 0) + 10;

  const buyBtn = document.querySelector(
    'a[aria-label="Buy $BBURN on Jupiter"]'
  ) as HTMLElement | null;
  // clamp to avoid oversized bottom bars on small screens / zoom
  const btnH = buyBtn?.getBoundingClientRect().height ?? 0;
  const safeBottom = Math.min(btnH + 18, 88);  // ← clamp to 88px max

  document.documentElement.style.setProperty('--safe-top', `${safeTop}px`);
  document.documentElement.style.setProperty('--safe-bottom', `${safeBottom}px`);
};

    const clearSafeAreas = () => {
      document.documentElement.style.removeProperty('--safe-top');
      document.documentElement.style.removeProperty('--safe-bottom');
    };

    const parse = () => {
      const h = window.location.hash || '';
      const isBroadcast = h.startsWith('#broadcast');
      const qs = new URLSearchParams(h.split('?')[1] || '');

      setOn(isBroadcast);
      onRef.current = isBroadcast;
      setParams(qs);

      if (isBroadcast) {
        // wait a tick so header/buy button are measured correctly
        requestAnimationFrame(applySafeAreas);
      } else {
        clearSafeAreas();
      }
    };

    const onResize = () => {
      if (onRef.current) applySafeAreas();
    };

    parse();
    window.addEventListener('hashchange', parse);
    window.addEventListener('resize', onResize);

    // also observe header/buy button size changes
    const ro = new ResizeObserver(() => onResize());
    const header = document.querySelector('header') as HTMLElement | null;
    const buyBtn = document.querySelector(
      'a[aria-label="Buy $BBURN on Jupiter"]'
    ) as HTMLElement | null;
    if (header) ro.observe(header);
    if (buyBtn) ro.observe(buyBtn);

    return () => {
      window.removeEventListener('hashchange', parse);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      clearSafeAreas();
    };
  }, []);

  return { on, params };
}

/* =========================
   BurnMoment overlay
========================= */
function BurnMoment({
  show,
  onDone,
  sound,                 // optional: pass a URL string to enable audio
  durationMs = 4500,
}: {
  show: boolean;
  onDone?: () => void;
  sound?: string;
  durationMs?: number;
}) {
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  React.useEffect(() => {
    if (!show) return;

    const t = window.setTimeout(() => onDone?.(), durationMs);

    // play sound only if provided
    if (sound && audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }

    return () => window.clearTimeout(t);
  }, [show, durationMs, onDone, sound]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[60] pointer-events-none bg-black/40 animate-[fadeIn_300ms_ease-out_forwards]"
      aria-hidden="true"
    >
      {/* radial fire glow */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_60%,rgba(255,160,60,0.30),rgba(0,0,0,0.0))]" />

      {/* vertical vignette */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-transparent" />

      {/* ember particles */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 36 }).map((_, i) => (
          <span
            key={i}
            className="absolute block h-[3px] w-[3px] rounded-full bg-amber-300/90"
            style={{
              left: `${Math.random() * 100}%`,
              bottom: `-10px`,
              opacity: 0.9,
              animation: `rise ${3 + Math.random() * 3}s linear ${Math.random() * 1.5}s forwards`,
              boxShadow:
                '0 0 6px rgba(255,180,80,.9), 0 0 12px rgba(255,160,60,.5)',
            }}
          />
        ))}
      </div>

      {/* center label */}
      <div className="absolute inset-0 grid place-items-center">
        <div className="px-5 py-3 rounded-2xl border border-amber-400/30 bg-amber-500/10 backdrop-blur-md text-amber-100 font-extrabold text-2xl md:text-3xl tracking-wide shadow-[0_0_40px_rgba(255,170,60,.25)] animate-[pop_260ms_ease-out]">
          🔥 Burn Executed — Supply Down
        </div>
      </div>

      {/* subtle bottom flame sweep */}
      <div className="absolute -bottom-20 left-0 right-0 h-60 bg-[radial-gradient(120%_100%_at_50%_100%,rgba(255,180,80,.35),rgba(0,0,0,0))] animate-[glow_1.6s_ease-in-out_infinite_alternate]" />

      {/* only render audio if provided */}
      {sound ? <audio ref={audioRef} src={sound} preload="auto" /> : null}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes pop {
          0%   { transform: scale(0.92); opacity: 0; }
          100% { transform: scale(1);    opacity: 1; }
        }
        @keyframes rise {
          0%   { transform: translateY(0) translateX(0)   scale(1);   opacity: .9; }
          70%  { opacity: .9; }
          100% { transform: translateY(-110vh) translateX(12px) scale(.6); opacity: 0; }
        }
        @keyframes glow {
          from { filter: blur(20px) brightness(1); }
          to   { filter: blur(26px) brightness(1.25); }
        }
      `}</style>
    </div>
  );
}
