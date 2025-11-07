'use client';

import React, { useEffect, useMemo, useState } from 'react';

type StateJson = {
  schedule?: {
    nextBurnAt?: number;         // ms epoch
    burnIntervalMinutes?: number;
    buybackIntervalMinutes?: number;
  };
};

function useQuery() {
  const [q, setQ] = useState<URLSearchParams>(new URLSearchParams());
  useEffect(() => {
    setQ(new URLSearchParams(window.location.search));
  }, []);
  return q;
}

function fmtNumber(n: number) {
  return n.toLocaleString(undefined);
}

function msToParts(ms: number) {
  const clamped = Math.max(0, ms);
  const s = Math.floor(clamped / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, s: sec };
}

export default function OverlayPage() {
  const qs = useQuery();

  // ------- Query params with sensible defaults -------
  const title    = qs.get('title')   ?? 'Campfire Bonus — Round 1';
  const symbol   = qs.get('symbol')  ?? '$BBURN';
  const prizeRaw = qs.get('prize')   ?? '1000000';            // number (tokens)
  const prize    = useMemo(() => Number(prizeRaw) || 1000000, [prizeRaw]);

  // rules (pipe or \n separated)
  const rulesParam = qs.get('rules')
    ?? 'Buy before the timer ends to be eligible|One wallet is drawn live|Claim within 5 minutes on X or Telegram';
  const rules = useMemo(
    () => rulesParam.split(/\||\n/).map(s => s.trim()).filter(Boolean),
    [rulesParam]
  );

  // Force transparent background for OBS? (overlay on top of your site)
  const transparent = (qs.get('transparent') ?? '0') === '1';

  // Optional badge/ticker lines
  const strap1 = qs.get('strap1') ?? '🎥 Live Draw Every Burn';
  const strap2 = qs.get('strap2') ?? 'Follow @burningbearcamp';
  const strap3 = qs.get('strap3') ?? 'Next burn approaching…';

  // Deadline logic: URL override → state.json → 10 min from now fallback
  const [stateNextBurnAt, setStateNextBurnAt] = useState<number | null>(null);
  const deadlineParam = qs.get('deadline'); // ISO 8601 like 2025-11-07T21:00:00Z

  useEffect(() => {
    let alive = true;
    fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: StateJson) => {
        if (!alive) return;
        const ts = d?.schedule?.nextBurnAt;
        if (typeof ts === 'number' && ts > Date.now() - 10_000) {
          setStateNextBurnAt(ts);
        } else {
          setStateNextBurnAt(null);
        }
      })
      .catch(() => setStateNextBurnAt(null));
    return () => { alive = false; };
  }, []);

  const deadlineMs = useMemo(() => {
    if (deadlineParam) {
      const t = Date.parse(deadlineParam);
      if (!Number.isNaN(t)) return t;
    }
    if (stateNextBurnAt) return stateNextBurnAt;
    // fallback: 10 minutes from now
    return Date.now() + 10 * 60 * 1000;
  }, [deadlineParam, stateNextBurnAt]);

  const [now, setNow] = useState<number>(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, deadlineMs - now);
  const { d, h, m, s } = msToParts(remaining);

  return (
    <div
      className={[
        'min-h-screen w-full',
        'flex flex-col items-center justify-between',
        'px-6 py-5 md:px-10 md:py-8',
        transparent ? 'bg-transparent' : 'bg-[#0b0b0f]'
      ].join(' ')}
      style={{
        backgroundImage: transparent ? 'none' : 'radial-gradient(1200px 600px at 50% -20%, rgba(255,140,66,.08), transparent)',
      }}
    >
      {/* TOP: Jackpot + Rules */}
      <section className="w-full max-w-6xl">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5 md:p-7">
          {/* Jackpot Banner */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="text-2xl md:text-3xl font-black tracking-tight text-amber-200">
                {title}
              </div>
              <div className="mt-1 text-sm md:text-base text-amber-300/80">
                Win a live on-stream jackpot — claim fast or it rolls to the next round.
              </div>
            </div>

            <div className="text-right">
              <div className="text-[34px] md:text-[46px] leading-none font-black text-amber-300 drop-shadow">
                {fmtNumber(prize)} <span className="text-amber-200">{symbol}</span>
              </div>
              <div className="mt-1 text-xs md:text-sm text-amber-300/70">
                Jackpot revealed at the next burn
              </div>
            </div>
          </div>

          {/* Rules Row */}
          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
            {rules.map((r, i) => (
              <div
                key={i}
                className="rounded-xl border border-amber-400/15 bg-black/20 px-4 py-3 text-amber-100 text-sm md:text-[15px] leading-snug"
              >
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/30 text-amber-300 text-xs font-semibold">
                  {i + 1}
                </span>
                {r}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MIDDLE: Countdown */}
      <section className="w-full max-w-6xl mt-6">
        <div className="rounded-2xl border border-amber-400/20 bg-amber-500/5 p-5 md:p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="text-amber-200 text-lg md:text-xl font-semibold">
              Next burn in
            </div>

            <div className="flex items-center gap-2 md:gap-3">
              {/* Big timer blocks */}
              {[
                { label: 'D', val: d },
                { label: 'H', val: h },
                { label: 'M', val: m },
                { label: 'S', val: s },
              ].map(({ label, val }) => (
                <div key={label} className="text-center">
                  <div className="min-w-[68px] md:min-w-[92px] rounded-xl bg-black/40 border border-amber-400/15 px-3 py-2">
                    <div className="text-[28px] md:text-[40px] leading-none font-black text-amber-100 tabular-nums">
                      {String(val).padStart(2, '0')}
                    </div>
                  </div>
                  <div className="mt-1 text-[11px] md:text-xs text-amber-300/70">{label}</div>
                </div>
              ))}
            </div>

            <div className="text-right">
              <div className="text-xs md:text-sm text-amber-300/70">
                Eligible buys must settle <span className="font-semibold text-amber-200">before</span> this timer ends.
              </div>
              <div className="text-[11px] md:text-xs text-amber-300/50">
                {new Date(deadlineMs).toISOString().replace('.000Z','Z')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM: Straps / tickers */}
      <section className="w-full max-w-6xl mt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[strap1, strap2, strap3].map((txt, i) => (
            <div
              key={i}
              className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm md:text-[15px] font-semibold"
            >
              {txt}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
