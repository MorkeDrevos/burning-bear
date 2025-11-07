'use client';

import React, { useEffect, useMemo, useState } from 'react';

/** Reads next burn from /data/state.json and mirrors your #broadcast params.
 *  Clean, stream-friendly design with big amount, clear rules, segmented timer, and CTAs.
 */
type StateJson = { schedule?: { nextBurnAt?: number } };

const FULL_TOKEN_ADDRESS = 'BXvBhz6Va2Ed8HnzMDChzHCTqKXLvJpGadfLhvK5pump';
const JUP_URL = `https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${FULL_TOKEN_ADDRESS}`;

function fmt(n: number) {
  try { return n.toLocaleString(undefined); } catch { return String(n); }
}
function msToParts(ms: number) {
  const s = Math.floor(Math.max(0, ms) / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return { d, h, m, s: sec };
}
function Seg({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded-xl border border-white/12 bg-white/[0.08] px-4 py-2 text-[26px] md:text-[32px] font-black tabular-nums text-white/90 shadow-[0_0_16px_rgba(0,0,0,.28)]">
      {children}
    </span>
  );
}

export default function CampfireBonusBox() {
  
  const [params, setParams] = useState<URLSearchParams>(new URLSearchParams());
const [nextBurnAt, setNextBurnAt] = useState<number | null>(null);
const [now, setNow] = useState(Date.now());

// keep params in sync with the URL hash (#broadcast?...), and tick time
useEffect(() => {
  const parse = () => {
    const qs = new URLSearchParams((window.location.hash || '').split('?')[1] || '');
    setParams(qs);
  };
  parse();
  window.addEventListener('hashchange', parse);
  const i = setInterval(() => setNow(Date.now()), 500);
  return () => {
    window.removeEventListener('hashchange', parse);
    clearInterval(i);
  };
}, []);

// fetch nextBurnAt from state.json (relative path avoids CORS in dev)
useEffect(() => {
  fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
    .then(r => r.json())
    .then((d: StateJson) => setNextBurnAt(d?.schedule?.nextBurnAt ?? null))
    .catch(() => null);
}, []);

  // URL-driven content
  const reward = useMemo(() => Number(params?.get('reward') ?? 0), [params]);
  const lower = useMemo(() => params?.get('lower')?.split('|') ?? [], [params]);
  const title = lower[0] ?? 'Campfire Bonus';
  const subtitle = lower[1] ?? 'Round 1';

  const deadlineParam = params?.get('deadline');
  const deadlineMs = useMemo(() => {
    if (deadlineParam) {
      const t = Date.parse(deadlineParam);
      if (!Number.isNaN(t)) return t;
    }
    if (nextBurnAt) return nextBurnAt;
    return Date.now() + 10 * 60 * 1000; // 10m fallback
  }, [deadlineParam, nextBurnAt]);

  const { d, h, m, s } = msToParts(deadlineMs - now);

  return (
    <div className="mt-6 w-full">
      <div className="rounded-2xl border border-amber-400/25 bg-[linear-gradient(180deg,rgba(255,176,74,0.10),rgba(20,24,21,0.35))] backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
        {/* Header row */}
        <div className="px-6 py-5 md:px-8 md:py-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-amber-200 text-xl md:text-2xl font-black tracking-tight">
              {title} <span className="text-amber-100/85">— {subtitle}</span>
            </div>
            <div className="mt-1 text-sm md:text-[15px] text-amber-200/80">
              To join the draw, just make your BBURN purchase before the next burn.
            </div>
          </div>

          <div className="text-right">
            <div className="text-[38px] md:text-[56px] font-black bg-gradient-to-br from-amber-200 via-amber-100 to-white bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(255,184,76,0.25)] leading-none">
              {fmt(reward)} <span className="text-amber-100">$BBURN</span>
            </div>
            <div className="mt-1 text-xs text-amber-200/70">
              Unclaimed prizes roll to next round
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-amber-400/25 to-transparent" />

        {/* Timer + rule line */}
        <div className="px-6 py-5 md:px-8 md:py-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          {/* Segmented timer */}
          <div className="flex items-center gap-2 md:gap-3">
            <Seg>{String(d).padStart(2, '0')}</Seg>
            <span className="px-0.5 text-amber-200 text-2xl">:</span>
            <Seg>{String(h).padStart(2, '0')}</Seg>
            <span className="px-0.5 text-amber-200 text-2xl">:</span>
            <Seg>{String(m).padStart(2, '0')}</Seg>
            <span className="px-0.5 text-amber-200 text-2xl">:</span>
            <Seg>{String(s).padStart(2, '0')}</Seg>
          </div>

          {/* Eligibility + UTC */}
          <div className="text-right">
            <div className="text-[13px] text-amber-100/80">
              Eligible buys must settle <span className="font-semibold text-amber-200">before</span> this timer ends.
            </div>
            <div className="text-[11px] text-amber-200/55 mt-0.5">
              {new Date(deadlineMs).toISOString().replace('.000Z', 'Z')}
            </div>
          </div>
        </div>

        {/* CTA row */}
        <div className="px-6 pb-6 md:px-8 md:pb-7">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <a
              href={JUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300/25 bg-amber-400/15 hover:bg-amber-400/20 text-amber-100 font-semibold px-4 py-3 transition"
            >
              🛒 Buy $BBURN on Jupiter
            </a>
            <a
              href="https://burningbear.camp/#broadcast?on=1"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] text-white/85 font-semibold px-4 py-3 transition"
            >
              🎥 Campfire Bonus Live
            </a>
            <a
              href="https://x.com/burningbearcamp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.06] hover:bg-white/[0.10] text-white/85 font-semibold px-4 py-3 transition"
            >
              𝕏 Follow @burningbearcamp
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
