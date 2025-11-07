'use client';

import React, { useEffect, useMemo, useState } from 'react';

/* Local constants (kept here to avoid cross-imports) */
const FULL_TOKEN_ADDRESS = 'BXvBhz6Va2Ed8HnzMDChzHCTqKXLvJpGadfLhvK5pump';
const JUP_URL = `https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=${FULL_TOKEN_ADDRESS}`;

/* Small helpers */
function pad(n: number) {
  return n.toString().padStart(2, '0');
}
function parseHashParams(): URLSearchParams {
  if (typeof window === 'undefined') return new URLSearchParams();
  const hash = window.location.hash || '';
  const qs = new URLSearchParams(hash.split('?')[1] || '');
  return qs;
}

export default function CampfireBonusBox() {
  const [now, setNow] = useState(() => Date.now());
  const [qs, setQs] = useState<URLSearchParams>(() => parseHashParams());

  // keep ticking + react to hash changes while live
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    const onHash = () => setQs(parseHashParams());
    window.addEventListener('hashchange', onHash);
    return () => {
      clearInterval(id);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  const reward = useMemo(() => {
    const r = Number(qs.get('reward') || '0');
    return Number.isFinite(r) && r > 0 ? r : 0;
  }, [qs]);

  const claimMin = useMemo(() => {
    const v = Number(qs.get('claim') || '5');
    return Number.isFinite(v) && v > 0 ? v : 5;
  }, [qs]);

  // Countdown target: prefer ?deadline=ISO/ms , else fall back to “next burn soon”
  const targetMs = useMemo(() => {
    const raw = qs.get('deadline');
    if (!raw) return undefined;
    const num = Number(raw);
    if (Number.isFinite(num) && num > 10_000) return num;
    const parsed = Date.parse(raw);
    return Number.isFinite(parsed) ? parsed : undefined;
  }, [qs]);

  const diff = targetMs ? Math.max(0, targetMs - now) : undefined;
  const segs = useMemo(() => {
    if (diff == null) return null;
    const t = Math.floor(diff / 1000);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return { h, m, s };
  }, [diff]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0f1f19]/80 backdrop-blur px-4 sm:px-6 py-5 md:py-6 shadow-[0_10px_30px_rgba(0,0,0,0.35)]">
      {/* Header line */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-white/85">
          <span className="text-lg">🔥🔥🔥</span>
          <span className="font-semibold">
            Campfire Bonus — <span className="text-amber-200">Round 1</span>
          </span>
          <span className="ml-3 text-sm text-white/60">
            To join the draw, make your BBURN purchase <span className="text-amber-200 font-semibold">before the next burn</span>.
            We’ll announce & display the winning wallet live on-stream.
          </span>
        </div>

        <span className="whitespace-nowrap text-xs font-semibold text-amber-100/90 rounded-lg border border-amber-400/25 bg-amber-500/10 px-2.5 py-1">
          Claim window: {claimMin} min
        </span>
      </div>

      {/* Main row */}
      <div className="mt-5 grid grid-cols-1 items-center gap-6 md:grid-cols-2">
        {/* Left: JACKPOT */}
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">Jackpot</div>
          <div className="mt-1 text-4xl sm:text-5xl md:text-6xl font-extrabold leading-tight text-amber-50">
            <span className="mr-2 inline-block rounded-md bg-amber-500/15 px-2 py-1 text-amber-200 align-[2px]">WIN</span>
            {reward ? reward.toLocaleString() : '—'} <span className="text-amber-200">$BBURN</span>
          </div>
          <div className="mt-2 text-sm text-white/65">
            If unclaimed within {claimMin} minutes, the prize rolls to the next round.
          </div>

          {/* Actions */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={JUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-amber-300/30 bg-amber-400/15 px-4 py-2 text-[15px] font-semibold text-amber-100 hover:bg-amber-400/20"
            >
              🪙 Buy $BBURN on Jupiter
            </a>

            <a
              href="https://burningbear.camp/#broadcast"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-[15px] font-semibold text-white/85 hover:bg-white/8"
            >
              📺 Campfire Bonus live
            </a>

            <a
              href="https://x.com/burningbearcamp"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-[15px] font-semibold text-white/85 hover:bg-white/8"
            >
              𝕏 Follow @burningbearcamp
            </a>
          </div>
        </div>

        {/* Right: NEXT BURN IN */}
        <div className="md:justify-self-end">
          <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">Next burn in</div>

          {segs ? (
            <div className="mt-2 flex items-center gap-[6px]">
              <Seg>{segs.h}</Seg><Dots /><Seg>{pad(segs.m)}</Seg><Dots /><Seg>{pad(segs.s)}</Seg>
            </div>
          ) : (
            <div className="mt-2 text-2xl font-extrabold text-white/70">Soon</div>
          )}

          {targetMs && (
            <div className="mt-2 text-[11px] text-white/45">
              Eligible buys must settle <span className="text-white/60 font-semibold">before</span> this timer ends.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* tiny local UI bits */
function Seg({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center rounded-xl border border-white/10 bg-white/[0.08] backdrop-blur px-3.5 py-2 text-[28px] font-extrabold tracking-tight leading-none text-white/90 shadow-[0_0_18px_rgba(0,0,0,0.30)]">
      {children}
    </span>
  );
}
function Dots() {
  return <span className="px-0.5 text-amber-200">:</span>;
}
