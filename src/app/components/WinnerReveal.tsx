'use client';

import React from 'react';

// Optional: helper to shorten wallet display
const truncateMiddle = (str: string, left = 6, right = 6) =>
  !str || str.length <= left + right + 1 ? str : `${str.slice(0, left)}…${str.slice(-right)}`;

type Props = {
  wallet: string;
  claimUntil: number;
  explorerBase?: string;
  message?: string;
};

export default function WinnerReveal({
  wallet,
  claimUntil,
  explorerBase = 'https://explorer.solana.com',
  message,
}: Props) {
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
    try {
      await navigator.clipboard.writeText(wallet);
    } catch {}
  };

  return (
    <div
      className="pointer-events-auto fixed left-1/2 z-[88] -translate-x-1/2"
      style={{ top: `calc(var(--safe-top, 0px) + 64px)` }}
      aria-live="polite"
    >
      <div className="rounded-2xl border border-amber-400/25 bg-black/60 backdrop-blur-md px-5 py-4 shadow-[0_20px_60px_rgba(0,0,0,.45)] max-w-[90vw]">
        <div className="text-amber-200 font-extrabold text-lg leading-tight flex items-center gap-2">
          <span className="text-[18px]">🏆</span>
          <span>Winner picked!</span>
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
          {message ??
            'Claim by posting this wallet in chat or replying on X. If unclaimed, the prize rolls into the next round.'}
        </div>
      </div>
    </div>
  );
}
