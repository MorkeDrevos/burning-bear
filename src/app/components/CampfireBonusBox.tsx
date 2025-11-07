'use client';

import React, { useEffect, useMemo, useState } from 'react';

type StateJson = { schedule?: { nextBurnAt?: number } };

function fmt(n: number) {
  return n.toLocaleString(undefined);
}
function msToParts(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, s: sec };
}

export default function CampfireBonusBox() {
  const [params, setParams] = useState<URLSearchParams>();
  const [nextBurnAt, setNextBurnAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setParams(new URLSearchParams(window.location.hash.split('?')[1]));
    fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: StateJson) => setNextBurnAt(d?.schedule?.nextBurnAt ?? null))
      .catch(() => null);

    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, []);

  const reward = useMemo(() => Number(params?.get('reward') ?? 0), [params]);
  const lower = useMemo(() => params?.get('lower')?.split('|') ?? [], [params]);
  const title = lower[0] ?? 'Campfire Bonus';
  const subtitle = lower[1] ?? 'Round 1';
  const tickerRaw = params?.get('ticker') ?? '';
  const tickers = tickerRaw.split(';').filter(Boolean);
  const symbol = '$BBURN';

  const deadlineParam = params?.get('deadline');
  const deadlineMs = useMemo(() => {
    if (deadlineParam) {
      const t = Date.parse(deadlineParam);
      if (!Number.isNaN(t)) return t;
    }
    if (nextBurnAt) return nextBurnAt;
    return Date.now() + 10 * 60 * 1000;
  }, [deadlineParam, nextBurnAt]);

  const { d, h, m, s } = msToParts(deadlineMs - now);

  return (
    <div className="mt-6 w-full rounded-2xl border border-amber-400/20 bg-amber-500/5 p-6 md:p-8">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="text-2xl md:text-3xl font-black text-amber-200">
            {title} — {subtitle}
          </div>
          <div className="text-sm text-amber-300/80">
            To join the draw, just make your BBURN purchase before the next burn.
          </div>
        </div>
        <div className="text-right">
          <div className="text-[34px] md:text-[44px] font-black text-amber-300">
            {fmt(reward)} <span className="text-amber-200">{symbol}</span>
          </div>
          <div className="text-xs text-amber-300/70">
            Unclaimed prizes roll to next round
          </div>
        </div>
      </div>

      {/* Countdown */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 md:gap-3">
          {[{ l: 'D', v: d }, { l: 'H', v: h }, { l: 'M', v: m }, { l: 'S', v: s }].map(({ l, v }) => (
            <div key={l} className="text-center">
              <div className="min-w-[65px] rounded-xl bg-black/40 border border-amber-400/15 px-3 py-2">
                <div className="text-[28px] md:text-[36px] font-black text-amber-100 tabular-nums">
                  {String(v).padStart(2, '0')}
                </div>
              </div>
              <div className="mt-1 text-[11px] text-amber-300/70">{l}</div>
            </div>
          ))}
        </div>

        <div className="text-right text-xs text-amber-300/70">
          Eligible buys must settle before this timer ends.
          <div className="text-[10px] text-amber-300/50">
            {new Date(deadlineMs).toISOString().replace('.000Z','Z')}
          </div>
        </div>
      </div>

      {/* Ticker line */}
      {tickers.length > 0 && (
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {tickers.map((t, i) => (
            <div key={i} className="rounded-xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-amber-100 text-sm font-semibold">
              {t}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
