'use client';
import React from 'react';

type BonusState = {
  round: number;
  reward: number;
  status: 'open'|'picking'|'claim'|'rolled'|'paid';
  closesAt: number | null;
  claimDeadlineAt: number | null;
  winner: null | { address: string; pickedAt: number; burnTxSig: string };
};

export default function BonusBanner({ msToBurn }: { msToBurn: number }) {
  const [state, setState] = React.useState<BonusState | null>(null);

  React.useEffect(() => {
    let alive = true;
    const load = () =>
      fetch('/api/bonus', { cache: 'no-store' })
        .then(r => r.json())
        .then(d => { if (alive) setState(d); })
        .catch(() => {});
    load();
    const id = window.setInterval(load, 4000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!state) return null;

  const soon = Number.isFinite(msToBurn) && msToBurn >= 0 && msToBurn <= 5 * 60_000;
  const isClaim = state.status === 'claim';
  const isOpen  = state.status === 'open' || state.status === 'picking';

  let sub = '';
  if (isOpen) {
    sub = soon ? 'Burn soon — buys count now' : 'Buy before the next burn';
  } else if (isClaim) {
    const left = Math.max(0, (state.claimDeadlineAt ?? 0) - Date.now());
    const m = Math.floor(left / 60000);
    const s = Math.floor((left % 60000) / 1000);
    sub = `Winner must claim in ${m}:${String(s).padStart(2,'0')}`;
  } else if (state.status === 'rolled') {
    sub = 'Unclaimed — rolled 100% to next round';
  } else if (state.status === 'paid') {
    sub = 'Paid — next round opens soon';
  }

  return (
    <div
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[80]"
      style={{ top: 'calc(var(--safe-top, 8px) + 48px)' }}
      aria-live="polite"
    >
      <div className="pointer-events-auto rounded-2xl border border-amber-400/25 bg-black/55 backdrop-blur-md px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div className="text-amber-200 font-extrabold text-lg leading-tight">
          Campfire Bonus •  {state.round} • {state.reward.toLocaleString()} BBURN
        </div>
        <div className="text-white/80 text-sm mt-0.5">{sub}</div>
        {isClaim && state.winner ? (
          <div className="mt-1 text-xs text-white/60">
            Winner: <span className="font-mono">{state.winner.address.slice(0,6)}…{state.winner.address.slice(-6)}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
