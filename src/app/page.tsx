'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

type Burn = {
  id: string;
  amount: number;     // BEAR
  sol?: number;       // optional SOL paid for this burn
  timestamp: number;  // ms epoch
  tx: string;
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol: number;
    priceUsdPerSol?: number; // fallback only
  };
  schedule: {
    burnIntervalMs: number;
    buybackIntervalMs: number;

    lastBurnAt?: number;
    lastBuybackAt?: number;

    nextBurnAt?: number;
    nextBuybackAt?: number;

    nextBurnSpec?: string;     // "in 25m", "21:30", "now", ISO
    nextBuybackSpec?: string;  // same
    timezone?: string;         // optional IANA TZ (else uses user's local)
  };
  ops?: {
    lastClaimAt?: number;
    lastMarketingFundAt?: number;
    marketingWallet?: string;
    notes?: string;
  };
  burns: Burn[];
};

/* =========================
   Small helpers
========================= */
function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtMoney(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtClock(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
function fmtDateLong(ts: number) {
  const d = new Date(ts);
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** friendly time, e.g. "Today 09:42", "Yesterday 18:17", "Sun 08:57, 27 Oct 2025" */
function fmtFriendlyStamp(ts: number, now: number) {
  const d = new Date(ts);
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

  const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const isToday = d >= startOfToday && d < new Date(startOfToday.getTime() + 86400000);
  const isYesterday = d >= startOfYesterday && d < startOfToday;

  if (isToday) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short' })} ${time}, ${d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })}`;
}

/** Parse human-friendly spec → ms epoch.
 * Supports:
 *  - "now"
 *  - "in 25m", "in 1h", "in 1h 15m", "in 90s"
 *  - "21:30" or "21:30:45" (today)
 *  - ISO like "2025-10-23T18:15:00Z"
 */
function parseTimeSpec(
  spec: string,
  now: number,
  tz?: string
): number | null {
  if (!spec) return null;
  const s = spec.trim().toLowerCase();

  if (s === 'now') return now;

  // in Xh Ym Zs
  if (s.startsWith('in ')) {
    const rest = s.slice(3).trim();
    // tokens e.g. ["1h","15m"] or ["25m"] etc
    const tokens = rest.split(/\s+/);
    let totalMs = 0;
    for (const t of tokens) {
      const m = t.match(/^(\d+)(h|m|s)$/);
      if (!m) return null;
      const val = parseInt(m[1], 10);
      if (m[2] === 'h') totalMs += val * 3600000;
      else if (m[2] === 'm') totalMs += val * 60000;
      else if (m[2] === 's') totalMs += val * 1000;
    }
    return now + totalMs;
  }

  // "HH:MM" or "HH:MM:SS" today in local (or optional tz)
  const hhmm = s.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    const sec = hhmm[3] ? parseInt(hhmm[3], 10) : 0;
    const d = new Date(now);
    if (tz) {
      // Interpret the given wall time in requested timezone.
      // We’ll build a Date at that wall time in tz by formatting now into tz date parts.
      const fmtDateParts = new Intl.DateTimeFormat(tz, {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hourCycle: 'h23'
      }).formatToParts(d);
      const year = Number(fmtDateParts.find(p => p.type === 'year')?.value);
      const month = Number(fmtDateParts.find(p => p.type === 'month')?.value);
      const day = Number(fmtDateParts.find(p => p.type === 'day')?.value);
      // Construct an ISO string pretending tz wall time, then let Date parse as UTC and adjust
      const isoLike = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
      const asLocal = new Date(isoLike);
      return asLocal.getTime();
    } else {
      d.setHours(h, m, sec, 0);
      return d.getTime();
    }
  }

  // ISO timestamp
  const asDate = new Date(spec);
  if (!isNaN(asDate.getTime())) return asDate.getTime();

  return null;
}

/** Compute target time using overrides → spec → fixed → last+interval */
function computeTargetTime(opts: {
  spec?: string;
  fixed?: number;
  last?: number;
  interval?: number;
  now: number;
  tz?: string;
  localOverride?: string | null; // from localStorage/admin bar
}) {
  const { spec, fixed, last, interval, now, tz, localOverride } = opts;

  if (localOverride) {
    const t = parseTimeSpec(localOverride, now, tz);
    if (t) return t;
  }
  if (spec) {
    const t = parseTimeSpec(spec, now, tz);
    if (t) return t;
  }
  if (typeof fixed === 'number' && fixed > 0) return fixed;
  if (typeof last === 'number' && last > 0 && interval && interval > 0) {
    return last + interval;
  }
  return now + (interval || 0);
}

function useTicker(ms = 1000) {
  const [now, setNow] = useState<number>(Date.now());
  const ref = useRef<number | null>(null);
  useEffect(() => {
    if (ref.current) window.clearInterval(ref.current);
    ref.current = window.setInterval(() => setNow(Date.now()), ms);
    return () => {
      if (ref.current) window.clearInterval(ref.current);
      ref.current = null;
    };
  }, [ms]);
  return now;
}

function fmtCountdown(target: number, now: number) {
  const diff = Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${String(h)}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${String(m)}m ${String(sec).padStart(2, '0')}s`;
}

/* =========================
   Page
========================= */
export default function Page() {
  const now = useTicker(1000);
  const [state, setState] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);

  // Admin overrides (local only) — appear if URL has ?ops=1
  const [opsMode, setOpsMode] = useState(false);
  const [burnSpecLocal, setBurnSpecLocal] = useState<string>('');
  const [buybackSpecLocal, setBuybackSpecLocal] = useState<string>('');

  useEffect(() => {
    const url = new URL(window.location.href);
    setOpsMode(url.searchParams.get('ops') === '1');
  }, []);

  useEffect(() => {
    // pick up stored overrides
    setBurnSpecLocal(localStorage.getItem('bb_next_burn_spec') || '');
    setBuybackSpecLocal(localStorage.getItem('bb_next_buyback_spec') || '');
  }, []);

  // Fetch JSON (cache-busted)
  useEffect(() => {
    const u = `/data/state.json?ts=${Date.now()}`;
    fetch(u)
      .then(r => r.json())
      .then((j: StateJson) => setState(j))
      .catch(() => setState(null));
  }, []);

  // Fetch live SOL price
  useEffect(() => {
    const tick = () => {
      fetch(`/api/sol-price?ts=${Date.now()}`)
        .then(r => r.json())
        .then((j) => {
          const p = Number(j?.price);
          if (!isNaN(p) && p > 0) setSolUsd(p);
        })
        .catch(() => {});
    };
    tick();
    const id = window.setInterval(tick, 60000);
    return () => window.clearInterval(id);
  }, []);

  const stats = state?.stats;
  const sched = state?.schedule;

  const solUsdEffective = solUsd ?? (stats?.priceUsdPerSol || null);

  const nextBurnAt = useMemo(() => {
    if (!sched) return now + 3600000;
    return computeTargetTime({
      spec: sched.nextBurnSpec,
      fixed: sched.nextBurnAt,
      last: sched.lastBurnAt,
      interval: sched.burnIntervalMs,
      tz: sched.timezone || undefined,
      now,
      localOverride: burnSpecLocal || null,
    });
  }, [sched, now, burnSpecLocal]);

  const nextBuybackAt = useMemo(() => {
    if (!sched) return now + 1200000;
    return computeTargetTime({
      spec: sched.nextBuybackSpec,
      fixed: sched.nextBuybackAt,
      last: sched.lastBuybackAt,
      interval: sched.buybackIntervalMs,
      tz: sched.timezone || undefined,
      now,
      localOverride: buybackSpecLocal || null,
    });
  }, [sched, now, buybackSpecLocal]);

  const burnsSorted = useMemo(
    () => (state?.burns || []).slice().sort((a, b) => b.timestamp - a.timestamp),
    [state]
  );

  const totalBuybackUsd = useMemo(() => {
    if (!stats || !solUsdEffective) return null;
    return stats.buybackSol * solUsdEffective;
  }, [stats, solUsdEffective]);

  function handleCopyCA() {
    navigator.clipboard.writeText(FULL_TOKEN_ADDRESS).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = FULL_TOKEN_ADDRESS;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    });
  }

  if (!state || !stats || !sched) {
    return (
      <main className="text-white">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h1 className="text-2xl font-bold">Loading…</h1>
        </div>
      </main>
    );
  }

  return (
    <main className="text-white">
      {/* Header */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          {/* Left: logo + title (click → top) */}
          <a href="#top" className="flex items-center gap-3">
            <img src="/img/coin-logo.png" alt="Burning Bear" className="h-9 w-9 rounded-full shadow-ember" />
            <div className="leading-tight">
              <div className="text-base font-extrabold">The Burning Bear</div>
              <div className="text-[12px] text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </a>

          {/* Center nav */}
          <nav className="hidden md:flex gap-8 text-base">
            <a href="#log" className="hover:text-amber-300">Live Burns</a>
            <a href="#how" className="hover:text-amber-300">How It Works</a>
            <a href="#ops" className="hover:text-amber-300">Ops Dashboard</a>
          </nav>

          {/* Right: CA */}
          <div className="flex items-center gap-3">
            <span className="hidden md:inline rounded-full bg-emerald-900/40 px-3 py-1.5 text-sm text-emerald-300" title={FULL_TOKEN_ADDRESS}>
              {FULL_TOKEN_ADDRESS.slice(0,6)}…{FULL_TOKEN_ADDRESS.slice(-4)}
            </span>
            <button
              className="rounded-full px-4 py-1.5 text-sm font-semibold bg-[#ffedb3] text-black hover:bg-[#ffe48d]"
              onClick={handleCopyCA}
            >
              Copy CA
            </button>
          </div>
        </div>
      </header>

      {/* Optional admin bar (local overrides) */}
      {opsMode && (
        <div className="bg-amber-900/20 border-b border-amber-500/30">
          <div className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3 md:flex-row md:items-end md:gap-6">
            <div className="flex-1">
              <label className="block text-xs text-white/70 mb-1">Next Burn (type: <code>in 25m</code>, <code>21:30</code>, <code>now</code>, or ISO)</label>
              <input
                className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2"
                placeholder="e.g. in 25m"
                value={burnSpecLocal}
                onChange={(e) => setBurnSpecLocal(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-white/70 mb-1">Next Buyback</label>
              <input
                className="w-full rounded-md bg-black/30 border border-white/15 px-3 py-2"
                placeholder="e.g. 21:30"
                value={buybackSpecLocal}
                onChange={(e) => setBuybackSpecLocal(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md bg-emerald-400 text-black font-semibold px-3 py-2"
                onClick={() => {
                  localStorage.setItem('bb_next_burn_spec', burnSpecLocal.trim());
                  localStorage.setItem('bb_next_buyback_spec', buybackSpecLocal.trim());
                }}
              >
                Save overrides
              </button>
              <button
                className="rounded-md bg-white/10 px-3 py-2"
                onClick={() => {
                  localStorage.removeItem('bb_next_burn_spec');
                  localStorage.removeItem('bb_next_buyback_spec');
                  setBurnSpecLocal('');
                  setBuybackSpecLocal('');
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero */}
      <section id="top" className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <video className="h-[60vh] w-full object-cover" playsInline autoPlay muted loop poster="/img/burning-bear-frame.jpg">
            <source src="/img/burning-bear.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-[#0b1712]/40 to-[#0b1712]" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-16 pt-20 sm:pt-24">
          <h1 className="max-w-3xl text-5xl font-extrabold leading-tight sm:text-6xl md:text-7xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdowns */}
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/55">Next buyback in</div>
              <div className="text-3xl font-extrabold text-white/85 sm:text-4xl">
                {fmtCountdown(nextBuybackAt, now)} <span className="text-white/40 text-base">({fmtClock(nextBuybackAt)})</span>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/55">Next burn in</div>
              <div className="text-3xl font-extrabold text-white/85 sm:text-4xl">
                {fmtCountdown(nextBurnAt, now)} <span className="text-white/40 text-base">({fmtClock(nextBurnAt)})</span>
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Stat label="Initial Supply" value={fmtInt(stats.initialSupply)} />
            <Stat label="Burned" value={fmtInt(stats.burned)} />
            <Stat label="Current Supply" value={fmtInt(stats.currentSupply)} />
          </div>

          {/* Buyback totals */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Stat label="Buyback Spent" value={`${fmtMoney(stats.buybackSol)} SOL`} />
            <Stat label="Buyback Value (USD)" value={`$${fmtMoney(totalBuybackUsd || 0)}`} />
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {burnsSorted.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 text-white/60">
              No burns posted yet.
            </div>
          )}
          {burnsSorted.map((b) => (
            <BurnCard key={b.id} burn={b} now={now} solUsd={solUsdEffective || 0} />
          ))}
        </div>
      </section>

      {/* Ops section anchor */}
      <section id="ops" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl font-bold">Ops Dashboard</h2>
        <p className="mt-1 text-sm text-white/50">Use <code>?ops=1</code> in the URL to reveal quick local overrides for the next times.</p>
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

function BurnCard({ burn, now, solUsd }: { burn: Burn; now: number; solUsd: number }) {
  const progress = 1; // visual accent only
  const when = fmtFriendlyStamp(burn.timestamp, now);
  const usd = burn.sol ? burn.sol * solUsd : null;

  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">🔥</span>
          <div>
            <div className="text-lg font-bold">Burn • {fmtInt(burn.amount)} BEAR</div>
            <div className="text-sm text-white/60">
              {when}
              {usd !== null && (
                <>
                  <span className="mx-2">•</span>
                  ≈ {burn.sol?.toFixed(4)} SOL {usd ? `( $${fmtMoney(usd)} )` : ''}
                </>
              )}
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
