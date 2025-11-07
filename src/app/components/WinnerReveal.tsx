'use client';

import React from 'react';

const truncateMiddle = (str: string, left = 6, right = 6) =>
  !str || str.length <= left + right + 1 ? str : `${str.slice(0, left)}…${str.slice(-right)}`;

type Props = {
  wallet: string;
  explorerBase?: string;
  message?: string;
  side?: 'left' | 'right';
  vpos?: 'top' | 'middle' | 'bottom';
  topOffsetPx?: number; // overrides vpos if provided
};

export default function WinnerReveal({
  wallet,
  explorerBase = 'https://explorer.solana.com',
  message,
  side = 'left',
  vpos = 'top',
  topOffsetPx,
}: Props) {
  // Base target from props
  const baseTop =
    typeof topOffsetPx === 'number'
      ? topOffsetPx
      : vpos === 'top'
      ? 64
      : vpos === 'middle'
      ? 160
      : 260;

  const [finalTop, setFinalTop] = React.useState<number>(baseTop);

  // Recompute to avoid overlapping the Campfire Bonus box
  React.useEffect(() => {
    const compute = () => {
      const safeTopVar =
        typeof window !== 'undefined'
          ? parseFloat(
              getComputedStyle(document.documentElement)
                .getPropertyValue('--safe-top')
                .replace('px', '') || '0'
            )
          : 0;

      let minTop = baseTop; // start with requested base

      const el = document.getElementById('campfire-bonus');
      if (el) {
        const r = el.getBoundingClientRect();
        // push winner box below the Campfire Bonus card by 12px
        const belowBonus = Math.round(window.scrollY + r.bottom + 12);
        // Position is relative to viewport top, so translate scroll into a fixed offset:
        // We place using top: calc(var(--safe-top) + Npx). Drop scrollY; use just pixels under header.
        // Compute an offset that ensures visual below-bonus placement.
        // r.top is viewport; we want a fixed number that’s >= header + card bottom.
        // Approximate: belowBonus - window.scrollY = r.bottom + 12 (viewport px).
        const viewportPx = Math.max(0, r.bottom + 12); // viewport coordinates
        minTop = Math.max(minTop, viewportPx);
      }

      // Also ensure we never sit too high (so we don't touch the header)
      const MIN_CLEARANCE = 240; // header + some breathing room
      const chosen = Math.max(minTop, MIN_CLEARANCE);

      setFinalTop(chosen + safeTopVar);
    };

    compute();
    window.addEventListener('resize', compute, { passive: true });
    window.addEventListener('scroll', compute, { passive: true });
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('scroll', compute);
    };
  }, [baseTop]);

  const isLeft = side === 'left';

  return (
    <div
      className={[
        'fixed z-[88] pointer-events-auto',
        isLeft ? 'left-[16px]' : 'right-[16px]',
        'max-w-[92vw] sm:max-w-[520px]',
      ].join(' ')}
      style={{ top: `${finalTop}px` }} // already includes safe-top
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
