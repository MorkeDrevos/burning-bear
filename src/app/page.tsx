'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'Burning Bear';

// 👇 Put your REAL full CA here (no ellipsis)
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

// Buyback cadence (countdown target)
const BURN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Polling
const POLL_JSON_MS = 10_000; // check state.json every 10s
const POLL_SOL_MS = 60_000;  // refresh SOL price every 60s

/* =========================
   Types (matches /public/data/state.json)
========================= */
type Burn = {
  id: string;
  amount: number;      // BEAR amount
  sol?: number;        // optional exact SOL spent for this burn
  timestamp: number;   // ms epoch
  tx: string;          // explorer link
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;       // optional running total in SOL (manual)
    priceSolPerBear?: number;  // optional BEAR→SOL (manual)
    priceUsdPerSol?: number;   // optional SOL→USD (manual fallback)
  };
  burns: Burn[];
};

/* =========================
   Utils
========================= */
function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmt2(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function truncateMiddle(str: string, left = 6, right = 4) {
  if (!str || str.length <= left + right + 1) return str;
  return `${str.slice(0, left)}…${str.slice(-right)}`;
}

// Friendly time (no “hours ago” line shown separately)
function fmtFriendly(ts: number, now: number) {
  const diffMs = now - ts;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const dNow = new Date(now);
  const d = new Date(ts);

  const isSameDay = d.toDateString() === dNow.toDateString();
  if (diffHr < 24 && isSameDay) {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `Today at ${hh}:${mm}`;
  }

  const yest = new Date(dNow);
  yest.setDate(dNow.getDate() - 1);
  const isYesterday = d.toDateString() === yest.toDateString();
  if (isYesterday) {
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `Yesterday at ${hh}:${mm}`;
  }

  const daysDiff = Math.floor(diffMs / 86_400_000);
  if (daysDiff < 7) {
    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
    const hh = d.getHours().toString().padStart(2, '0');
    const mm = d.getMinutes().toString().padStart(2, '0');
    return `${dayName} ${hh}:${mm}`;
  }

  const day = d.getDate().toString().padStart(2, '0');
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return `${day} ${mon} ${year}, ${hh}:${mm}`;
}

// Estimate SOL spent for a burn if not provided
function estimateSolForBurn(b: Burn, priceSolPerBear?: number) {
  if (typeof b.sol === 'number') return b.sol;
  if (priceSolPerBear && b.amount) return b.amount * priceSolPerBear;
  return 0;
}

/* =========================
   Page
========================= */
export default function Page() {
  const [now, setNow] = useState<number>(Date.now());
  const [json, setJson] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // tick
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, []);

  // fetch /data/state.json
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch('/data/state.json', { cache: 'no-store' });
        if (!r.ok) throw new Error('state.json not found');
        const j = (await r.json()) as StateJson;
        if (active) setJson(j);
      } catch {
        // leave as-is on error
      }
    };
    load();
    const id = window.setInterval(load, POLL_JSON_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  // fetch live SOL price (USD)
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const r = await fetch('/api/sol-price', { cache: 'no-store' });
        const j = (await r.json()) as { usd: number | null };
        if (active) setSolUsd(j?.usd ?? null);
      } catch {
        // ignore
      }
    };
    load();
    const id = window.setInterval(load, POLL_SOL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  // derived data
  const {
    initialSupply,
    burned,
    currentSupply,
    priceSolPerBear,
    buybackSolManual,
    lastBurnTs,
    burnsSorted,
  } = useMemo(() => {
    const stats = json?.stats;
    const burns = json?.burns ?? [];
    const sorted = [...burns].sort((a, b) => b.timestamp - a.timestamp);

    return {
      initialSupply: stats?.initialSupply ?? 0,
      burned: stats?.burned ?? 0,
      currentSupply: stats?.currentSupply ?? 0,
      priceSolPerBear: stats?.priceSolPerBear,
      buybackSolManual: stats?.buybackSol,
      lastBurnTs: sorted[0]?.timestamp ?? null,
      burnsSorted: sorted,
    };
  }, [json]);

  // total buyback SOL (prefer exact per-burn → else manual running total → else 0)
  const totalBuybackSol = useMemo(() => {
    if (!json) return 0;
    const haveAnyExact = (json.burns || []).some(b => typeof b.sol === 'number');
    if (haveAnyExact) {
      return (json.burns || []).reduce((acc, b) => acc + estimateSolForBurn(b, json.stats.priceSolPerBear), 0);
    }
    if (typeof buybackSolManual === 'number') return buybackSolManual;
    return 0;
  }, [json, buybackSolManual]);

  const totalBuybackUsd = useMemo(() => {
    const price = solUsd ?? json?.stats.priceUsdPerSol ?? null;
    if (!price) return null;
    return totalBuybackSol * price;
  }, [totalBuybackSol, solUsd, json?.stats.priceUsdPerSol]);

  // Next buyback countdown — anchor to latest burn if present, else rolling cadence
  const nextBuybackIn = useMemo(() => {
    if (!lastBurnTs) {
      const ms = BURN_INTERVAL_MS - (now % BURN_INTERVAL_MS);
      return Math.max(0, ms);
    }
    const target = lastBurnTs + BURN_INTERVAL_MS;
    return Math.max(0, target - now);
  }, [lastBurnTs, now]);

  const nbM = Math.floor(nextBuybackIn / 60_000)
    .toString()
    .padStart(2, '0');
  const nbS = Math.floor((nextBuybackIn % 60_000) / 1000)
    .toString()
    .padStart(2, '0');

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
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          {/* Left: logo + title (logo clickable to top) */}
          <div className="flex items-center gap-3">
            <a href="#top" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
              <img
                src="/img/coin-logo.png"
                alt="Burning Bear"
                className="h-9 w-9 rounded-full shadow-ember cursor-pointer"
              />
            </a>
            <div className="leading-tight">
              <div className="text-base font-extrabold">The Burning Bear</div>
              <div className="text-[12px] text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </div>

          {/* Center: nav */}
          <nav className="hidden md:flex gap-8 text-base">
            <a href="#log" className="hover:text-amber-300">Live Burns</a>
            <a href="#how" className="hover:text-amber-300">How It Works</a>
            <a href="#community" className="hover:text-amber-300">Community</a>
          </nav>

          {/* Right: CA + Copy */}
          <div className="flex items-center gap-3">
            <span
              className="hidden md:inline rounded-full bg-emerald-900/40 px-3 py-1.5 text-sm text-emerald-300"
              title={FULL_TOKEN_ADDRESS}
            >
              {truncateMiddle(FULL_TOKEN_ADDRESS)}
            </span>
            <button
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition
                ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
              onClick={handleCopyCA}
              aria-live="polite"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero with video */}
      <section id="top" className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <video
            className="h-[70vh] w-full object-cover"
            playsInline
            autoPlay
            muted
            loop
            poster="/img/burning-bear-frame.jpg"
          >
            <source src="/img/burning-bear.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-[#0b1712]/40 to-[#0b1712]" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 pt-20 sm:pt-24">
          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdown toned down */}
          <div className="mt-2 text-sm uppercase tracking-[0.25em] text-white/55">Next buyback in</div>
          <div className="text-4xl font-extrabold text-white/85 sm:text-5xl">
            {nbM}m {nbS}s
          </div>

          {/* Top stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Initial Supply" value={fmtInt(initialSupply)} />
            <Stat label="Burned" value={fmtInt(burned)} />
            <Stat label="Current Supply" value={fmtInt(currentSupply)} />
          </div>

          {/* Buyback spent (SOL / USD) */}
          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat label="Buyback Spent" value={`${fmt2(totalBuybackSol)} SOL`} />
            <Stat label="Buyback Value (USD)" value={totalBuybackUsd != null ? `$${fmt2(totalBuybackUsd)}` : '—'} />
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open the explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {(burnsSorted || []).map((b) => {
            const solForThis = estimateSolForBurn(b, priceSolPerBear);
            const usd = (solUsd ?? json?.stats.priceUsdPerSol) ? solForThis * (solUsd ?? json?.stats.priceUsdPerSol!) : null;
            return (
              <BurnCard
                key={b.id}
                burn={b}
                now={now}
                solForThis={solForThis}
                usdForThis={usd}
              />
            );
          })}
          {(!burnsSorted || burnsSorted.length === 0) && (
            <div className="text-white/50">No burns posted yet.</div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ul className="mt-4 space-y-2 text-white/80">
          <li>80% → Buy & Burn — creator fees auto-buy {TOKEN_SYMBOL} and burn them live.</li>
          <li>20% → Team + Marketing — keeps the vibes bright.</li>
          <li>Transparent — every burn is posted with TX link & timestamp.</li>
        </ul>
      </section>

      {/* Footer */}
      <footer id="community" className="border-t border-white/10 bg-[#0d1a14]">
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

function BurnCard({
  burn,
  now,
  solForThis,
  usdForThis,
}: {
  burn: Burn;
  now: number;
  solForThis: number;
  usdForThis: number | null;
}) {
  const ageMs = Math.max(0, now - burn.timestamp);
  const ageMin = ageMs / 60_000;
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
            <div className="text-sm text-white/60">{fmtFriendly(burn.timestamp, now)}</div>
            <div className="mt-1 text-sm text-white/70">
              ≈ {fmt2(solForThis)} SOL{usdForThis != null ? ` • $${fmt2(usdForThis)}` : ''}
            </div>
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
