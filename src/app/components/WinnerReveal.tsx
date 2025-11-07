'use client';

import React from 'react';

// middle truncation helper
const truncateMiddle = (str: string, left = 6, right = 6) =>
  !str || str.length <= left + right + 1 ? str : `${str.slice(0, left)}…${str.slice(-right)}`;

type Props = {
  wallet: string;                 // winner wallet (full)
  claimUntil: number;             // epoch ms when claim window ends
  explorerBase?: string;          // e.g. 'https://explorer.solana.com'
  message?: string;               // optional custom line
  placement?: 'floating' | 'by-timer'; // where to render the banner
};

export default function WinnerReveal({
  wallet,
  claimUntil,
  explorerBase = 'https://explorer.solana.com',
  message,
  placement = 'floating',
}: Props) {
  // tick every second
  const [now, setNow] = React.useState(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = Math.max(0, claimUntil - now);
  const done = remaining <= 0;

  const mm = String(Math.floor(remaining / 1000 / 60)).padStart(2, '0');
  const ss = String(Math.floor((remaining / 1000) % 60)).padStart(2, '0');

  const copy = async () => {
    try { await navigator.clipboard.writeText(wallet); } catch {}
  };

  // positioning
  const wrapperClass =
    placement === 'by-timer'
      ? // anchored near the "NEXT BURN IN" timer (left column of the bonus card)
        // tweak the left/bottom values to nudge it if needed
        'fixed z-[96] left-4 md:left-[calc(50%-560px+16px)] bottom-[132px] md:bottom-[148px]'
      : // original floating top-center placement
        'fixed z-[96] left-1/2 -translate-x-1/2';

  const wrapperStyle =
    placement === 'floating'
      ? { top: `calc(var(--safe-top, 0px) + 64px)` }
      : undefined;

  return (
    <div
      className={`pointer-events-auto ${wrapperClass}`}
      style={wrapperStyle}
      aria-live="polite"
      role="status"
    >
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
            type="button"
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
