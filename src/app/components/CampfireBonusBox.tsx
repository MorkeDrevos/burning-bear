'use client';

import React, { useEffect, useMemo, useState } from 'react';

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
  const [params, setParams] = useState<URLSearchParams>();
  const [nextBurnAt, setNextBurnAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    setParams(new URLSearchParams((window.location.hash || '').split('?')[1]));
    fetch(`https://burningbear.camp/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: StateJson) => setNextBurnAt(d?.schedule?.nextBurnAt ?? null))
      .catch(() => null);

    const i = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(i);
  }, []);

  const reward = useMemo(() => Math.max(0, Number(params?.get('reward') ?? 0)), [params]);
  const lower = useMemo(() => params?.get('lower')?.split('|') ?? [], [params]);
  const title = lower[0] ?? 'Campfire Bonus';
  const subtitle = lower[1] ?? 'Round 1';
  const symbol = '$BBURN';
  const claimMin = Number(params?.get('claimMinutes') ?? '5');
  const isCompact = (params?.get('mode') ?? '').toLowerCase() === 'compact';

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
      <div className={[
        "rounded-3xl border border-amber-400/20",
        "bg-[linear-gradient(180deg,rgba(255,176,74,0.10),rgba(20,24,21,0.35))]",
        "backdrop-blur-md shadow-[0_12px_40px_rgba(0,0,0,0.35)] overflow-hidden"
      ].join(' ')}>
        {/* Top header strip */}
        <div className={[
          "flex items-center justify-between gap-3",
          isCompact ? "px-4 py-3" : "px-5 py-3 md:px-7 md:py-4",
          "border-b border-amber-400/15 bg-white/[0.03]"
        ].join(' ')}>
          <div className="flex items-center gap-3">
            <span className={isCompact ? "text-lg" : "text-xl md:text-2xl"}>🔥🔥🔥</span>
            <div className="leading-tight">
              <div className={["text-amber-200 font-extrabold tracking-tight",
                isCompact ? "text-lg" : "text-lg md:text-xl"
              ].join(' ')}>
                {title} <span className="text-amber-100/80">— {subtitle}</span>
              </div>
              <div className={["text-amber-300/75",
                isCompact ? "text-[11px]" : "text-[12px] md:text-[13px]"
              ].join(' ')}>
                To join the draw, just make your BBURN purchase <span className="font-semibold text-amber-200">before the next burn</span>. We’ll announce and display the winning wallet live on-stream.
              </div>
            </div>
          </div>

          {/* Claim window badge */}
          <div className={[
            "shrink-0 rounded-full border border-amber-400/30 bg-amber-500/10 font-semibold text-amber-100",
            isCompact ? "px-3 py-1 text-[11px]" : "px-3.5 py-1.5 text-[12px] md:text-[13px]"
          ].join(' ')}>
            Claim window: <span className="text-amber-200">{claimMin} min</span>
          </div>
        </div>

        {/* Main content */}
        <div className={isCompact ? "px-4 py-4" : "px-5 py-5 md:px-7 md:py-7"}>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-7 items-end">
            {/* Jackpot */}
            <div className="md:col-span-7">
              <div className={[
                "uppercase tracking-[0.22em] text-amber-300/70",
                isCompact ? "text-[10px]" : "text-xs"
              ].join(' ')}>Jackpot</div>

              {/* WIN 1 million BBURN — biggest element with glow */}
              <div className="mt-1 leading-none font-black">
                <span className={[
                  "jackpot-glow",
                  "bg-gradient-to-r from-amber-100 via-amber-200 to-white bg-clip-text text-transparent",
                  "drop-shadow-[0_0_20px_rgba(255,200,120,0.18)]",
                  isCompact ? "text-[32px]" : "text-[40px] sm:text-[48px] md:text-[60px]"
                ].join(' ')}>
                  WIN {fmt(reward)}
                </span>{' '}
                <span className={isCompact ? "text-amber-100 text-2xl" : "text-amber-200 text-[28px] md:text-[36px]"}>{symbol}</span>
              </div>

              <div className={["mt-2 text-amber-300/70",
                isCompact ? "text-[11px]" : "text-[13px]"
              ].join(' ')}>
                If unclaimed within {claimMin} minutes, the prize rolls to the next round.
              </div>
            </div>

            {/* Countdown */}
            <div className="md:col-span-5">
              <div className={[
                "uppercase tracking-[0.22em] text-amber-300/70",
                isCompact ? "text-[10px] text-left" : "text-xs text-right md:text-left"
              ].join(' ')}>Next burn in</div>

              <div className={["mt-2 flex items-center gap-2 md:gap-3",
                isCompact ? "justify-start" : "justify-end md:justify-start"
              ].join(' ')}>
                <Seg>{String(d).padStart(2, '0')}</Seg>
                <span className="px-0.5 text-amber-200 text-2xl">:</span>
                <Seg>{String(h).padStart(2, '0')}</Seg>
                <span className="px-0.5 text-amber-200 text-2xl">:</span>
                <Seg>{String(m).padStart(2, '0')}</Seg>
                <span className="px-0.5 text-amber-200 text-2xl">:</span>
                <Seg>{String(s).padStart(2, '0')}</Seg>
              </div>

              <div className={["mt-2",
                isCompact ? "text-left" : "text-right md:text-left"
              ].join(' ')}>
                <div className={isCompact ? "text-[10px] text-amber-300/65" : "text-[11px] text-amber-300/60"}>
                  Eligible buys must settle <span className="font-semibold text-amber-200">before</span> this timer ends.
                </div>
                <div className={isCompact ? "text-[10px] text-amber-300/40 font-mono" : "text-[10px] text-amber-300/40 font-mono"}>
                  {new Date(deadlineMs).toISOString().replace('.000Z','Z')}
                </div>
              </div>
            </div>
          </div>

          {/* CTA row */}
          <div className={isCompact ? "mt-4" : "mt-6"}>
            <div className={["grid grid-cols-1 md:grid-cols-3 gap-3",
              isCompact ? "" : ""
            ].join(' ')}>
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
                🎥 Campfire Bonus live
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

      {/* Glow animation keyframes */}
      <style jsx>{`
        @keyframes jackpotPulse {
          0%   { text-shadow: 0 0 0 rgba(255, 200, 120, 0); filter: drop-shadow(0 0 0 rgba(255, 200, 120, 0)); }
          20%  { text-shadow: 0 0 22px rgba(255, 200, 120, .35); filter: drop-shadow(0 0 22px rgba(255, 200, 120, .35)); }
          40%  { text-shadow: 0 0 8px rgba(255, 200, 120, .18); filter: drop-shadow(0 0 8px rgba(255, 200, 120, .18)); }
          100% { text-shadow: 0 0 0 rgba(255, 200, 120, 0); filter: drop-shadow(0 0 0 rgba(255, 200, 120, 0)); }
        }
        .jackpot-glow {
          animation: jackpotPulse 5.2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
