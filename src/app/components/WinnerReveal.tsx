'use client';

import React from 'react';

const truncateMiddle = (str: string, left = 6, right = 6) =>
  !str || str.length <= left + right + 1 ? str : `${str.slice(0, left)}…${str.slice(-right)}`;

type Side = 'left' | 'right';
type VPos = 'top' | 'middle' | 'bottom';

type Props = {
  wallet: string;
  claimUntil: number;
  explorerBase?: string;
  message?: string;
  side?: Side;         // ← NEW: 'left' | 'right' (default 'right')
  vpos?: VPos;         // ← NEW: 'top' | 'middle' | 'bottom' (default 'top')
  topOffsetPx?: number; // ← NEW: override pixel offset from top when vpos='top'
};

export default function WinnerReveal({
  wallet,
  claimUntil,
  explorerBase = 'https://explorer.solana.com',
  message,
  side = 'right',
  vpos = 'top',
  topOffsetPx = 64, // sits nicely under your header
}: Props) {
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, claimUntil - now);
  const mm = String(Math.floor(remaining / 1000 / 60)).padStart(2, '0');
  const ss = String(Math.floor((remaining / 1000) % 60)).padStart(2, '0');

  const copy = async () => {
    try { await navigator.clipboard.writeText(wallet); } catch {}
  };

  // --- positioning ----------------------------------------------------------
  const style: React.CSSProperties = {
    position: 'fixed',
    zIndex: 88,
    pointerEvents: 'auto',
    maxWidth: 'min(380px, 92vw)',
  };

  // horizontal (respect iOS safe areas)
  const padLeft  = 'max(16px, env(safe-area-inset-left, 16px))';
  const padRight = 'max(16px, env(safe-area-inset-right, 16px))';
  if (side === 'left') style.left = padLeft; else style.right = padRight;

  // vertical
  if (vpos === 'middle') {
    style.top = '50%';
    style.transform = 'translateY(-50%)';
  } else if (vpos === 'bottom') {
    style.bottom = 'max(16px, env(safe-area-inset-bottom, 16px))';
  } else {
    // top (default), just under your header + safe area
    style.top = `calc(var(--safe-top, 0px) + ${topOffsetPx}px)`;
  }
  // --------------------------------------------------------------------------

  const done = remaining <= 0;

  return (
    <div style={style} aria-live="polite">
      <div className="rounded-2xl border border-amber-400/25 bg-black/60 backdrop-blur-md px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,.45)]">
        <div className="text-amber-200 font-extrabold text-lg leading-tight flex items-center gap-2">
          <span className="text-[18px]">🏆</span>
          <span>Winner picked!</span>
          {!done && (
            <span className="ml-2 text-white/85 font-extrabold tabular-nums tracking-wide">
              {mm}:{ss}
            </span>
          )}
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[15px] text-white/90">
          <code className="rounded-lg bg-white/10 px-2.5 py-1 font-mono">
            {truncateMiddle(wallet, 8, 8)}
          </code>
          <button
            onClick={copy}
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

        <div className="mt-2 text-sm text-white/75">
          {message ?? 'Claim by posting this wallet in chat or replying on X. If unclaimed, the prize rolls into the next round.'}
        </div>
      </div>
    </div>
  );
}
