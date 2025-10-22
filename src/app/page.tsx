'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

const STATE_POLL_MS = 10_000;   // poll your JSON every 10s
const SOL_PRICE_POLL_MS = 60_000; // refresh SOL price every 60s

/* =========================
   Types (matches state.json)
========================= */
type Burn = {
  id: string;
  amount: number;     // BEAR amount
  sol?: number;       // SOL used (optional)
  timestamp: number;  // ms epoch
  tx: string;
};

type Schedule = {
  burnIntervalMs?: number;
  buybackIntervalMs?: number;
  nextBurnAt?: number;
  nextBuybackAt?: number;
  lastBurnAt?: number;
  lastBuybackAt?: number;
};

type Ops = {
  lastClaimAt?: number;           // ms epoch when you last claimed creator rewards
  lastMarketingFundAt?: number;   // ms epoch when you last sent 20% to marketing wallet
  marketingWallet?: string;       // display only, e.g. your SPL wallet
  notes?: string;                 // free text to show in dashboard
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;        // total SOL used so far (manual or sum)
    priceUsdPerSol?: number;    // fallback price if CG down
  };
  schedule?: Schedule;
  ops?: Ops;
  burns: Burn[];
};

/* =========================
   Utils (formatting)
========================= */
const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function fmtInt(n: number) { return nf0.format(n); }
function fmt2(n: number)  { return nf2.format(n); }

function clamp(n: number, a: number, b: number) { return Math.max(a, Math.min(b, n)); }

function msToMinSec(ms: number) {
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
}

// Human-friendly for cards: “Just now”, “23m ago”, “Today at 09:42”, etc.
function friendlyDate(ts: number, now: number) {
  const d = new Date(ts);
  const date = d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  const diffSec = Math.floor((now - ts) / 1000);
  if (diffSec < 5) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;

  const diffMin = Math.floor(diffSec / 60);

  const midnight = (x: number) => new Date(new Date(x).toDateString()).getTime();
  const isToday = midnight(ts) === midnight(now);
  const isYesterday = midnight(ts) === midnight(now - 86_400_000);

  if (diffMin < 60 && isToday) return `${diffMin}m ago, Today at ${time}`;
  if (isToday) return `Today at ${time}`;
  if (isYesterday) return `Yesterday at ${time}`;

  const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }); // Mon, Tue
  return `${dayName} ${time}, ${date}`;
}

// Short “ago” for dashboard badges: 2m, 14m, 3h, 2d
function shortAgo(ts?: number, now?: number) {
  if (!ts || !now) return '—';
  const diff = Math.max(0, now - ts);
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function resolveNextAt(now: number, kind: 'burn'|'buyback', s?: Schedule) {
  const interval = kind === 'burn' ? s?.burnIntervalMs : s?.buybackIntervalMs;
  const nextAt   = kind === 'burn' ? s?.nextBurnAt     : s?.nextBuybackAt;
  const lastAt   = kind === 'burn' ? s?.lastBurnAt     : s?.lastBuybackAt;

  if (nextAt && nextAt > now) return nextAt;
  if (interval && lastAt)     return lastAt + interval;

  // fallback rolling cadence (10m default)
  const roll = interval ?? 10 * 60 * 1000;
  const rem  = roll - (now % roll);
  return now + rem;
}

function truncateMiddle(str?: string, left = 6, right = 4) {
  if (!str) return '—';
  if (str.length <= left + right + 1) return str;
  return `${str.slice(0, left)}…${str.slice(-right)}`;
}

/* =========================
   Page
========================= */
export default function Page() {
  const [now, setNow] = useState<number>(Date.now());
  const [state, setState] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Tick once a second
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Poll state.json
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch(`/data/state.json?ts=${Date.now()}`, { cache: 'no-store' });
        if (!r.ok) throw new Error('state JSON failed');
        const j: StateJson = await r.json();
        if (!stop) setState(j);
      } catch (e) {
        console.error(e);
      }
    };
    load();
    const t = setInterval(load, STATE_POLL_MS);
    return () => { stop = true; clearInterval(t); };
  }, []);

  // Poll live SOL price (fallback to JSON if needed)
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await fetch(`/api/sol-price?ts=${Date.now()}`, { cache: 'no-store' });
        const j = await r.json();
        if (!stop && typeof j.priceUsdPerSol === 'number') setSolUsd(j.priceUsdPerSol);
      } catch {
        // ignore; UI will fallback to JSON price if present
      }
    };
    load();
    const t = setInterval(load, SOL_PRICE_POLL_MS);
    return () => { stop = true; clearInterval(t); };
  }, []);

  // Derived
  const schedule = state?.schedule;
  const burns = (state?.burns ?? []).slice().sort((a, b) => b.timestamp - a.timestamp);

  const initial = state?.stats?.initialSupply ?? 0;
  const burned  = state?.stats?.burned ?? 0;
  const current = state?.stats?.currentSupply ?? Math.max(0, initial - burned);

  const priceUsdPerSol = solUsd ?? state?.stats?.priceUsdPerSol ?? null;
  const totalBuybackSol =
    typeof state?.stats?.buybackSol === 'number' ? state!.stats!.buybackSol! : 0;
  const totalBuybackUsd = priceUsdPerSol ? totalBuybackSol * priceUsdPerSol : null;

  const nextBurnAt    = resolveNextAt(now, 'burn', schedule);
  const nextBuybackAt = resolveNextAt(now, 'buyback', schedule);
  const nextBurnInMs  = Math.max(0, nextBurnAt - now);
  const nextBuyInMs   = Math.max(0, nextBuybackAt - now);

  // Copy CA
  const handleCopyCA = async () => {
    try {
      await navigator.clipboard.writeText(FULL_TOKEN_ADDRESS);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = FULL_TOKEN_ADDRESS;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  return (
    <main>
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          {/* Left: logo + title */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-3"
            aria-label="Go to top"
          >
            <img
              src="/img/coin-logo.png"
              alt="Burning Bear"
              className="h-8 w-8 rounded-full shadow-ember"
            />
            <div className="hidden sm:block leading-tight text-left">
              <div className="text-sm font-extrabold">The Burning Bear</div>
              <div className="text-[11px] text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </button>

          {/* Center: nav */}
          <nav className="hidden items-center gap-6 text-sm md:flex">
            <a href="#log" className="hover:text-amber-300">Live Burns</a>
            <a href="#how" className="hover:text-amber-300">How It Works</a>
            <a href="#ops" className="hover:text-amber-300">Ops Dashboard</a>
          </nav>

          {/* Right: CA + Copy */}
          <div className="flex items-center gap-2">
            <span
              title={FULL_TOKEN_ADDRESS}
              className="hidden rounded-full bg-emerald-900/40 px-3 py-1 text-xs text-emerald-300 sm:inline"
            >
              {FULL_TOKEN_ADDRESS.slice(0, 6)}…{FULL_TOKEN_ADDRESS.slice(-4)}
            </span>
            <button
              onClick={handleCopyCA}
              className={`rounded-full px-3 py-1 text-sm font-semibold transition
                ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
              aria-live="polite"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero with video + countdowns */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <video
            className="h-[68vh] w-full object-cover"
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

        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-14 pt-20 sm:pt-24 md:px-6">
          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Two countdowns */}
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">Next burn in</div>
              <div className="text-3xl font-extrabold text-white/90 sm:text-4xl">
                {msToMinSec(nextBurnInMs)}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">Next buyback in</div>
              <div className="text-3xl font-extrabold text-white/90 sm:text-4xl">
                {msToMinSec(nextBuyInMs)}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Initial Supply" value={fmtInt(initial)} />
            <Stat label="Burned" value={fmtInt(burned)} />
            <Stat label="Current Supply" value={fmtInt(current)} />
          </div>

          {/* Totals */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat label="Buyback Spent" value={`${fmt2(totalBuybackSol)} SOL`} />
            <Stat label="Buyback Value (USD)" value={totalBuybackUsd != null ? `$${fmt2(totalBuybackUsd)}` : '—'} />
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10 md:px-6">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open the explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {burns.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-6">
              <div className="text-white/60">No burns posted yet.</div>
            </div>
          )}
          {burns.map((b) => {
            const ageMin = Math.max(0, (now - b.timestamp) / 60_000);
            const brightness = clamp(1 - ageMin / 180, 0.65, 1);
            const progress = clamp(ageMin / 10, 0, 1);
            const friendly = friendlyDate(b.timestamp, now);

            const solStr = b.sol != null ? `${fmt2(b.sol)} SOL` : null;
            const usdStr = b.sol != null && priceUsdPerSol ? `$${fmt2(b.sol * priceUsdPerSol)}` : null;

            return (
              <div
                key={b.id}
                className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2"
                style={{ filter: `brightness(${brightness})` }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">🔥</span>
                    <div>
                      <div className="text-lg font-bold">Burn • {fmtInt(b.amount)} BEAR</div>
                      <div className="text-sm text-white/60">{friendly}</div>
                      {(solStr || usdStr) && (
                        <div className="mt-1 text-sm text-white/70">
                          {solStr}{solStr && usdStr ? ' • ' : ''}{usdStr ?? ''}
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

                <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
                    style={{ width: `${Math.floor(progress * 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Manual Cycle Dashboard */}
      <section id="ops" className="mx-auto max-w-6xl px-4 pb-14 md:px-6">
        <h2 className="text-2xl font-bold">Manual Cycle Dashboard</h2>
        <p className="mt-1 text-sm text-white/50">
          For the live show: claim → fund marketing (20%) → buybacks (80%) → burn → update JSON.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {/* Last Claim */}
          <DashCard
            title="Last Reward Claim"
            value={shortAgo(state?.ops?.lastClaimAt, now)}
            sub={state?.ops?.lastClaimAt ? friendlyDate(state!.ops!.lastClaimAt!, now) : '—'}
          />

          {/* Marketing Wallet */}
          <DashCard
            title="Marketing Wallet"
            value={truncateMiddle(state?.ops?.marketingWallet, 8, 6)}
            sub={
              state?.ops?.lastMarketingFundAt
                ? `Funded ${shortAgo(state?.ops?.lastMarketingFundAt, now)} ago`
                : 'Funding not recorded'
            }
          />

          {/* Last Buyback */}
          <DashCard
            title="Last Buyback"
            value={shortAgo(state?.schedule?.lastBuybackAt, now)}
            sub={state?.schedule?.lastBuybackAt ? friendlyDate(state!.schedule!.lastBuybackAt!, now) : '—'}
          />

          {/* Last Burn */}
          <DashCard
            title="Last Burn"
            value={shortAgo(state?.schedule?.lastBurnAt, now)}
            sub={state?.schedule?.lastBurnAt ? friendlyDate(state!.schedule!.lastBurnAt!, now) : '—'}
          />
        </div>

        {/* Notes */}
        {state?.ops?.notes && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-4 text-sm text-white/80">
            <div className="text-[11px] uppercase tracking-wider text-white/55 mb-1">Operator Notes</div>
            {state.ops.notes}
          </div>
        )}
      </section>

      {/* Footer */}
      <footer id="community" className="border-t border-white/10 bg-[#0d1a14]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-white/50 md:px-6">
          Once upon a bear market, one dapper bear decided to fight the winter the only way he knew how, with fire. 🔥
        </div>
      </footer>
    </main>
  );
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

function DashCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{title}</div>
      <div className="mt-1 text-xl font-extrabold">{value}</div>
      {sub && <div className="mt-1 text-xs text-white/50">{sub}</div>}
    </div>
  );
}
