'use client';
import React from 'react';

type Mode = 'ok' | 'burn' | 'buyback' | 'bonus' | 'error';

export default function SystemStatusBadge({
  mode = 'ok',
  message,
  round,
}: {
  mode?: Mode;
  message?: string;
  round?: number;
}) {
  const modeMap = {
    ok:      { icon: '🟢', color: 'from-green-400/40 to-green-600/60', text: 'All Systems Go' },
    burn:    { icon: '🔥', color: 'from-amber-400/40 to-orange-600/60', text: 'Burn Cycle Active' },
    buyback: { icon: '💧', color: 'from-sky-400/40 to-blue-600/60', text: 'Buyback Cooldown' },
    bonus:   { icon: '🪙', color: 'from-yellow-400/40 to-amber-600/60', text: `Campfire Bonus${round ? ` • Round ${round}` : ''}` },
    error:   { icon: '⚠️', color: 'from-red-400/40 to-red-600/60', text: 'System Check Needed' },
  }[mode];

  return (
    <div
      className={[
        'fixed left-4 z-[60]',
        'rounded-2xl border border-white/10',
        'bg-gradient-to-br',
        modeMap.color,
        'backdrop-blur-md px-4 py-3 shadow-[0_0_20px_rgba(0,0,0,0.45)]',
        'transition-all duration-500 hover:scale-[1.02]',
      ].join(' ')}
      style={{ bottom: 'calc(var(--safe-bottom, 0px) + 20px)' }}
    >
      <div className="text-[15px] font-extrabold text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.2)] flex items-center gap-2">
        <span>{modeMap.icon}</span>
        {message || modeMap.text}
      </div>
    </div>
  );
}
