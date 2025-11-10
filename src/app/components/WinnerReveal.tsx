'use client';

import React, { useEffect, useState } from 'react';

const truncateMiddle = (str: string, left = 6, right = 6) =>
  !str || str.length <= left + right + 1 ? str : `${str.slice(0, left)}…${str.slice(-right)}`;

type Props = {
  wallet: string;
  message?: string;
  side?: 'left' | 'right';
  vpos?: 'top' | 'middle' | 'bottom';
  topOffsetPx?: number;

  /** New: show the claim ticker when this reveal mounts */
  claimTicker?: boolean;
  /** New: custom text for the ticker */
  tickerText?: string;
  /** New: how long to keep ticker visible (ms). Default 5 min */
  tickerDurationMs?: number;
};

export default function WinnerReveal({
  wallet,
  message,
  side = 'left',
  vpos = 'top',
  topOffsetPx,
  claimTicker = true,
  tickerText = '🔥 CLAIM WINDOW OPEN — if this is your wallet, drop it in chat NOW!',
  tickerDurationMs = 5 * 60 * 1000,
}: Props) {
  const baseTop =
    typeof topOffsetPx === 'number'
      ? topOffsetPx
      : vpos === 'top'
      ? 72
      : vpos === 'middle'
      ? 160
      : 260;

  const isLeft = side === 'left';

  // ---- Claim Ticker visibility ----
  const [showTicker, setShowTicker] = useState<boolean>(!!claimTicker);
  useEffect(() => {
    if (!claimTicker) return;
    setShowTicker(true);
    const t = window.setTimeout(() => setShowTicker(false), tickerDurationMs);
    return () => window.clearTimeout(t);
  }, [claimTicker, tickerDurationMs]);

  return (
    <>
      {/* Winner toast */}
      <div
        className={[
          'pointer-events-none fixed z-[88]',
          isLeft ? 'left-[16px]' : 'right-[16px]',
        ].join(' ')}
        style={{ top: `calc(var(--safe-top, 0px) + ${baseTop}px)` }}
        aria-live="polite"
      >
        <div className="w-full max-w-[340px] sm:max-w-[340px] rounded-2xl border border-amber-400/25 bg-black/60 backdrop-blur-md px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
          {/* Header */}
          <div className="flex items-center gap-2 text-amber-200 font-extrabold text-lg leading-tight">
            <span className="text-[18px]">🏆</span>
            <span>Winner picked!</span>
            <span className="ml-2 text-[12px] font-bold rounded-md px-2 py-[2px] border border-red-300/30 bg-red-300/10 text-red-200">
              UNCLAIMED
            </span>
          </div>

          {/* Static wallet display */}
          <div className="mt-2 flex items-center gap-2 text-[15px] text-white/90 font-mono">
            💡 <span>{truncateMiddle(wallet, 8, 8)}</span>
          </div>

          {/* Message area */}
          <div className="mt-2 text-[15px] text-amber-200 font-semibold">
            {message ?? '🔥 Prize rolled over to the next round.'}
          </div>
        </div>
      </div>

      {/* Claim ticker (bottom-center) */}
      {showTicker && (
        <div
          className="fixed left-1/2 -translate-x-1/2 z-[99] pointer-events-none"
          style={{ bottom: 'calc(var(--safe-bottom, 0px) + 18px)' }}
          aria-live="polite"
        >
          <div
            className="
              rounded-2xl border border-amber-400/30
              bg-black/70 backdrop-blur-md
              px-5 py-3 text-amber-100 font-semibold text-[15px]
              shadow-[0_10px_30px_rgba(0,0,0,.45)]
              animate-[warmPulse_2.4s_ease-in-out_infinite]
            "
          >
            {tickerText}
          </div>
        </div>
      )}
    </>
  );
}
