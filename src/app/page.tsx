'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'Burning Bear';
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

const BURN_INTERVAL_MS = 10 * 60 * 1000; // 10 min

/* =========================
   Types for JSON
========================= */
type Burn = {
  id: string;
  amount: number;   // BEAR amount (optional if you only track SOL)
  sol?: number;     // SOL spent for the burn/buyback
  timestamp: number;
  tx: string;
};

type StateJSON = {
  stats?: {
    initialSupply?: number;
    burned?: number;
    currentSupply?: number;
    buybackSol?: number;       // total SOL bought/burned
    priceSolPerBear?: number;  // optional
    priceUsdPerSol?: number;   // fallback USD price
  };
  burns?: Burn[];
};

/* =========================
   Utils
========================= */
function fmtInt(n: number | undefined | null) {
  if (!Number.isFinite(n as number)) return '—';
  return (n as number).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtExact(ts: number) {
  const d = new Date(ts);
  const day = d.getDate().toString().padStart(2, '0');
  const mon = d.toLocaleString('en-US', { month: 'short' });
  const year = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const ss = d.getSeconds().toString().padStart(2, '0');
  return `${hh}:${mm}:${ss} · ${day} ${mon} ${year}`;
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

  // JSON state
  const [data, setData] = useState<StateJSON | null>(null);
  const [loadingState, setLoadingState] = useState<boolean>(true);

  // Live SOL→USD
  const [liveUsdPerSol, setLiveUsdPerSol] = useState<number | null>(null);

  // Copy CA UX
  const [copied, setCopied] = useState(false);

  // tick every second for countdown
  const intervalId = useRef<number | null>(null);

  useEffect(() => {
    if (intervalId.current) window.clearInterval(intervalId.current);
    intervalId.current = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (intervalId.current) window.clearInterval(intervalId.current);
      intervalId.current = null;
    };
  }, []);

  // load /public/data/state.json every 30s
  useEffect(() => {
    let cancelled = false;

    async function loadState() {
      try {
        const r = await fetch('/data/state.json', { cache: 'no-store' });
        const j: StateJSON = await r.json();
        if (!cancelled) {
          setData(j);
          setLoadingState(false);
        }
      } catch {
        if (!cancelled) setLoadingState(false);
      }
    }
    loadState();
    const id = setInterval(loadState, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // fetch live price every 60s
  useEffect(() => {
    let cancelled = false;
    async function loadPrice() {
      try {
        const r = await fetch('/api/sol-price', { cache: 'no-store' });
        const j = await r.json();
        if (!cancelled && Number.isFinite(j?.usd)) setLiveUsdPerSol(j.usd);
      } catch {
        // ignore; will fall back to JSON
      }
    }
    loadPrice();
    const id = setInterval(loadPrice, 60_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // next burn countdown
  const nextBurnIn = BURN_INTERVAL_MS - (now % BURN_INTERVAL_MS);
  const mins = Math.floor(nextBurnIn / 60_000).toString().padStart(2, '0');
  const secs = Math.floor((nextBurnIn % 60_000) / 1000).toString().padStart(2, '0');

  // from JSON
  const INITIAL_SUPPLY = Number(data?.stats?.initialSupply) || 0;
  const BURNED = Number(data?.stats?.burned) || 0;
  const CURRENT_SUPPLY = Number(data?.stats?.currentSupply) || (INITIAL_SUPPLY - BURNED);
  const TOTAL_SOL = Number(data?.stats?.buybackSol) || 0;

  // price choice (prefer live)
  const jsonUsdPerSol = Number(data?.stats?.priceUsdPerSol) || null;
  const usdPerSol = liveUsdPerSol ?? jsonUsdPerSol ?? null;
  const totalUsd = usdPerSol ? TOTAL_SOL * usdPerSol : null;

  // UX: copy full CA
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
    setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          {/* Left: Logo + Title (logo is a back-to-top link) */}
          <div className="flex items-center gap-3">
            <a href="#top" onClick={(e)=>{ e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
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

      {/* Anchor for logo click */}
      <span id="top" />

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

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Initial Supply" value={fmtInt(INITIAL_SUPPLY)} />
            <Stat label="Burned" value={fmtInt(BURNED)} />
            <Stat label="Current Supply" value={fmtInt(CURRENT_SUPPLY)} />
          </div>

          {/* Buyback totals */}
          <div className="mt-2 text-white/80">
            <div className="text-sm">
              Buyback Spent (SOL): <span className="font-semibold">{TOTAL_SOL.toFixed(4)}</span>
              {usdPerSol && (
                <>
                  {' '}• <span className="font-semibold">
                    ≈ ${ (totalUsd!).toLocaleString('en-US', { maximumFractionDigits: 2 }) }
                  </span>
                </>
              )}
            </div>
            {!usdPerSol && (
              <div className="text-xs text-white/40">
                (Waiting for live SOL price… will fall back to state.json if provided)
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {!loadingState && (data?.burns?.length ?? 0) === 0 && (
            <div className="text-white/60">No burns posted yet.</div>
          )}

          {(data?.burns ?? [])
            .slice()
            .sort((a, b) => b.timestamp - a.timestamp)
            .map((b) => (
              <BurnCard key={b.id} burn={b} usdPerSol={usdPerSol} priceSolPerBear={data?.stats?.priceSolPerBear} />
            ))}
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
  usdPerSol,
  priceSolPerBear,
}: {
  burn: Burn;
  usdPerSol: number | null;
  priceSolPerBear?: number;
}) {
  const sol =
    (Number.isFinite(burn.sol as number) && (burn.sol as number) > 0
      ? (burn.sol as number)
      : ((Number(priceSolPerBear) > 0 && Number(burn.amount) > 0)
          ? Number(burn.amount) * Number(priceSolPerBear)
          : 0));

  const usd = usdPerSol ? sol * usdPerSol : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">🔥</span>
          <div>
            <div className="text-lg font-bold">Burn • {fmtInt(burn.amount)} BEAR</div>

            {/* Exact timestamp — NO "hours ago" */}
            <div className="text-sm text-white/60">{fmtExact(burn.timestamp)}</div>

            {/* SOL + USD */}
            <div className="text-sm text-white/60 mt-1">
              {sol ? <>≈ {sol.toFixed(4)} SOL</> : '—'}
              {usd ? <> • ≈ ${usd.toFixed(2)}</> : null}
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
          style={{ width: '100%' }}
        />
      </div>
    </div>
  );
}
