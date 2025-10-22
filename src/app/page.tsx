'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const FULL_TOKEN_ADDRESS =
  '4NGbC4RRrUjS78ooSN53Up7gSg4dGrj6F6dxpMWHbonk'; // <-- put your real one
const BURN_INTERVAL_MS = 10 * 60 * 1000; // next buyback/burn cadence (10m)

/* =========================
   Types
========================= */
type Burn = {
  id: string;
  amount: number;      // BEAR amount (integer)
  sol?: number;        // optional SOL spent for this burn/buyback
  timestamp: number;   // ms epoch
  tx: string;          // explorer link
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;     // total SOL spent (optional)
    priceSolPerBear?: number;// optional: SOL per BEAR if you prefer to pass it
    priceUsdPerSol?: number; // optional: USD per SOL (fallback only)
  };
  burns: Burn[];
};

/* =========================
   Helpers
========================= */
function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtUsd(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

// Friendly time: Today 09:31 / Yesterday 14:07 / 09:03 · 22 Oct 2025
function fmtFriendly(ts: number, now: number) {
  const d = new Date(ts);
  const dn = new Date(now);

  const hh = pad2(d.getHours());
  const mm = pad2(d.getMinutes());

  const isSameDay =
    d.getFullYear() === dn.getFullYear() &&
    d.getMonth() === dn.getMonth() &&
    d.getDate() === dn.getDate();

  // Yesterday?
  const y = new Date(dn);
  y.setDate(dn.getDate() - 1);
  const isYesterday =
    d.getFullYear() === y.getFullYear() &&
    d.getMonth() === y.getMonth() &&
    d.getDate() === y.getDate();

  if (isSameDay) return `Today ${hh}:${mm}`;
  if (isYesterday) return `Yesterday ${hh}:${mm}`;

  const day = pad2(d.getDate());
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  return `${hh}:${mm} · ${day} ${mon} ${year}`;
}

function truncateMiddle(str: string, left = 6, right = 4) {
  if (!str || str.length <= left + right + 1) return str;
  return `${str.slice(0, left)}…${str.slice(-right)}`;
}

/* =========================
   Page
========================= */
export default function Page() {
  const [now, setNow] = useState<number>(Date.now());
  const [copied, setCopied] = useState(false);
  const [data, setData] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);

  const tickId = useRef<number | null>(null);
  const refreshId = useRef<number | null>(null);

  // Copy CA
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

  // Live ticking clock + periodic refresh
  useEffect(() => {
    if (tickId.current) window.clearInterval(tickId.current);
    tickId.current = window.setInterval(() => setNow(Date.now()), 1_000);

    const fetchAll = async () => {
      // bust cache on state.json
      const res = await fetch(`/data/state.json?ts=${Date.now()}`, { cache: 'no-store' });
      const j: StateJson = await res.json();
      setData(j);

      // live SOL price via API route (falls back to JSON if it fails)
      try {
        const p = await fetch(`/api/sol-price?ts=${Date.now()}`, { cache: 'no-store' });
        const pj = await p.json();
        if (pj && typeof pj.usd === 'number') setSolUsd(pj.usd);
        else if (j?.stats?.priceUsdPerSol) setSolUsd(j.stats.priceUsdPerSol);
      } catch {
        if (j?.stats?.priceUsdPerSol) setSolUsd(j.stats.priceUsdPerSol);
      }
    };

    fetchAll();

    if (refreshId.current) window.clearInterval(refreshId.current);
    refreshId.current = window.setInterval(fetchAll, 60_000); // refresh every 60s

    return () => {
      if (tickId.current) window.clearInterval(tickId.current);
      if (refreshId.current) window.clearInterval(refreshId.current);
      tickId.current = null;
      refreshId.current = null;
    };
  }, []);

  // Next burn timer
  const nextBurnIn = BURN_INTERVAL_MS - (now % BURN_INTERVAL_MS);
  const mins = pad2(Math.floor(nextBurnIn / 60_000));
  const secs = pad2(Math.floor((nextBurnIn % 60_000) / 1000));

  // Stats
  const initial = data?.stats?.initialSupply ?? 0;
  const burned = data?.stats?.burned ?? 0;
  const current = data?.stats?.currentSupply ?? Math.max(0, initial - burned);

  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          {/* Left: Logo + title (logo is a link-to-top) */}
          <div className="flex items-center gap-3">
            <a href="#top" aria-label="Scroll to top" className="inline-flex">
              <Image
                src="/img/coin-logo.png"
                alt="Burning Bear"
                width={40}
                height={40}
                className="rounded-full shadow-ember"
              />
            </a>
            <div className="leading-tight">
              <div className="text-base font-extrabold">
                <a href="#top" className="hover:text-amber-300">The Burning Bear</a>
              </div>
              <div className="text-[12px] text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </div>

          {/* Center nav */}
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

      <div id="top" />

      {/* Hero with video */}
      <section className="relative">
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

          <div className="mt-2 text-sm uppercase tracking-[0.25em] text-white/55">Next burn in</div>
          <div className="text-4xl font-extrabold text-white/85 sm:text-5xl">
            {mins}m {secs}s
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Initial Supply" value={fmtInt(initial)} />
            <Stat label="Burned" value={fmtInt(burned)} />
            <Stat label="Current Supply" value={fmtInt(current)} />
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open the chain explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {(data?.burns ?? [])
            .slice() // avoid mutating original
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((b) => (
              <BurnCard
                key={b.id}
                burn={b}
                friendlyTime={fmtFriendly(b.timestamp, now)}
                solUsd={solUsd ?? data?.stats?.priceUsdPerSol ?? null}
              />
            ))}
          {(!data || (data.burns ?? []).length === 0) && (
            <div className="rounded-xl border border-white/10 bg-[#0f1f19]/60 p-5 text-white/60">
              No burns posted yet.
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">How it works</h2>
        <ul className="mt-4 space-y-2 text-white/80">
          <li>80% → Buy & Burn — creator fees auto-buy {TOKEN_SYMBOL} and burn live.</li>
          <li>20% → Team + Marketing — fuels growth, creators, and community.</li>
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
  friendlyTime,
  solUsd,
}: {
  burn: Burn;
  friendlyTime: string;
  solUsd: number | null;
}) {
  // If per-burn SOL is present, great; otherwise compute SOL estimate only if you have priceSolPerBear in state.json
  const solLine = typeof burn.sol === 'number' ? burn.sol : null;
  const usdLine = solLine && solUsd ? solLine * solUsd : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">🔥</span>
          <div>
            <div className="text-lg font-bold">Burn • {fmtInt(burn.amount)} BEAR</div>
            <div className="text-sm text-white/60">{friendlyTime}</div>
            {solLine !== null && (
              <div className="mt-1 text-sm text-white/70">
                ≈ {solLine.toFixed(4)} SOL{usdLine ? ` • ${fmtUsd(usdLine)}` : ''}
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
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
