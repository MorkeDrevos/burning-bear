'use client';

import React from 'react';

const truncateMiddle = (str: string, left = 6, right = 6) =>
  !str || str.length <= left + right + 1 ? str : `${str.slice(0, left)}…${str.slice(-right)}`;

type Props = {
  wallet: string;                           // full winner wallet (required)
  explorerBase?: string;                    // defaults to solana explorer
  message?: string;                         // optional custom line
  side?: 'left' | 'right';                  // default: left
  vpos?: 'top' | 'middle' | 'bottom';       // default: top
  topOffsetPx?: number;                     // overrides vpos if provided
};

/**
 * WinnerReveal
 * - Positions left/right
 * - Pushes itself low enough to avoid covering the Campfire Bonus box
 * - No timer; shows UNCLAIMED + rollover text
 */
export default function WinnerReveal({
  wallet,
  explorerBase = 'https://explorer.solana.com',
  message,
  side = 'left',
  vpos = 'top',
  topOffsetPx,
}: Props) {
  // Base vertical position from props (or vpos)
  const baseTop =
    typeof topOffsetPx === 'number'
      ? topOffsetPx
      : vpos === 'top'
      ? 64
      : vpos === 'middle'
      ? 160
      : 260;

  // 🚫 Do not cover header or the Campfire Bonus box:
  // Push down at least 240px from the safe-top, and also a bit beyond baseTop.
  const safeTopPx = Math.max(baseTop + 160, 240);

  const isLeft = side === 'left';

  return (
    <div
      className={[
        'fixed z-[88]',
        isLeft ? 'left-[16px]' : 'right-[16px]',
        'max-w-[92vw] sm:max-w-[520px]',
        'pointer-events-auto',
      ].join(' ')}
      style={{
        top: `calc(var(--safe-top, 0px) + ${safeTopPx}px)`,
      }}
      aria-live="polite"
    >
      <div className="rounded-2xl border border-amber-400/25 bg-black/60 backdrop-blur-md px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
        {/* Header */}
        <div className="flex items-center gap-2 text-amber-200 font-extrabold text-lg leading-tight">
          <span className="text-[18px]">🏆</span>
          <span>Winner picked!</span>
          <span className="ml-2 text-[12px] font-bold rounded-md px-2 py-[2px] border border-red-300/30 bg-red-300/10 text-red-200">
            UNCLAIMED
          </span>
        </div>

        {/* Wallet row */}
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-white/90">
          <code className="rounded-lg bg-white/10 px-2.5 py-1 font-mono">
            {truncateMiddle(wallet, 8, 8)}
          </code>

          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(wallet);
              } catch {}
            }}
            className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-sm hover:bg-white/15"
            aria-label="Copy winner wallet"
          >
            Copy
          </button>

          <a
            href={`${explorerBase}/address/${wallet}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-white/15 bg-white/10 px-2 py-1 text-sm hover:bg-white/15"
          >
            View on Explorer
          </a>
        </div>

        {/* Message */}
        <div className="mt-2 text-sm text-white/80">
          {message ?? 'Prize rolled over to the next round.'}
        </div>
      </div>
    </div>
  );
}
