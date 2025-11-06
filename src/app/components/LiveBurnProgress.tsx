'use client';
import React, { useEffect, useState } from 'react';

type Props = {
  /** New style: pass remaining ms directly */
  nextBurnMs?: number;
  /** Old style: pass absolute time + interval */
  nextBurnAt?: number;
  burnIntervalMs?: number;
  /** Visual width in rem for the bar container */
  width?: number;
};

export default function LiveBurnProgress({
  nextBurnMs,
  nextBurnAt,
  burnIntervalMs,
  width = 24,
}: Props) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Derive remaining ms:
  const remainingMs =
    typeof nextBurnMs === 'number'
      ? Math.max(0, nextBurnMs)
      : typeof nextBurnAt === 'number'
      ? Math.max(0, nextBurnAt - now)
      : NaN;

  // Derive progress percent if we know the interval:
  const totalMs =
    typeof burnIntervalMs === 'number' && burnIntervalMs > 0
      ? burnIntervalMs
      : NaN;

  const pct =
    Number.isFinite(remainingMs) && Number.isFinite(totalMs) && totalMs > 0
      ? Math.max(0, Math.min(1, 1 - remainingMs / totalMs))
      : 0;

  // Simple countdown text:
  const fmtCountdown = (ms: number) => {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return h > 0
      ? `${h}h ${m.toString().padStart(2, '0')}m ${s
          .toString()
          .padStart(2, '0')}s`
      : `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div
      className="rounded-2xl border border-white/10 bg-white/[0.04] backdrop-blur-md p-3"
      style={{ width: `${width}rem` }}
    >
      {/* Label + countdown */}
      <div className="flex items-center justify-between text-xs text-white/70">
        <span className="font-semibold text-white/80">Next Burn</span>
        <span className="tabular-nums">
          {Number.isFinite(remainingMs) ? fmtCountdown(remainingMs) : '—'}
        </span>
      </div>

      {/* Progress bar (only meaningful if interval known) */}
      <div className="mt-2 h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-700"
          style={{ width: `${(pct * 100).toFixed(2)}%` }}
          aria-valuenow={Math.round(pct * 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          role="progressbar"
        />
      </div>
    </div>
  );
}
