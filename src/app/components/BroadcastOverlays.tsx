'use client';

import React, { useEffect, useMemo, useState } from 'react';

// Existing local components
// (these already exist in your repo)
import SmokeOverlay from './SmokeOverlay';
import LiveBurnProgress from './LiveBurnProgress';
import BonusBanner from './BonusBanner';

/* =========================
   Small helpers
========================= */
function useQueryParams() {
  const [params, setParams] = useState<URLSearchParams | null>(null);

  useEffect(() => {
    try {
      setParams(new URLSearchParams(window.location.search));
    } catch {
      setParams(new URLSearchParams());
    }
  }, []);

  return params ?? new URLSearchParams();
}

function parseBool(v: string | null, fallback = false) {
  if (!v) return fallback;
  const s = v.trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'on' || s === 'yes';
}

function clampNumber(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function fmtReward(n: number) {
  try {
    return n.toLocaleString();
  } catch {
    return String(n);
  }
}

/* =========================
   Individual overlay atoms
========================= */

function LiveBug({ className = '' }: { className?: string }) {
  return (
    <div
      className={'pointer-events-none fixed left-4 z-[80] ' + className}
      style={{ top: 'var(--safe-top, 1rem)' }}
    >
      <div className="inline-flex items-center gap-2 rounded-lg bg-red-600/90 px-3 py-1.5 shadow-lg">
        <span className="h-2.5 w-2.5 rounded-full bg-white animate-[blink_1.2s_infinite]" />
        <span className="text-xs font-extrabold tracking-widest text-white">LIVE</span>
        <span className="text-xs font-semibold text-white/90">• ON AIR</span>
      </div>
    </div>
  );
}

function LowerThird({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div
      className="pointer-events-none fixed left-4 z-[86] max-w-[60vw]"
      style={{ bottom: 'calc(var(--safe-bottom, 0px) + 1rem)' }} // sits above ticker
    >
      <div className="rounded-2xl border border-amber-400/25 bg-black/55 backdrop-blur-md px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div className="text-amber-200 font-extrabold text-lg leading-tight">{title}</div>
        {subtitle ? <div className="text-white/75 text-sm mt-0.5">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function NowPlaying({ track, artist }: { track: string; artist?: string }) {
  return (
    <div
      className="pointer-events-none fixed right-4 z-[80]"
      style={{ top: 'var(--safe-top, 1rem)' }}
    >
      <div className="flex items-center gap-2 rounded-xl border border-white/12 bg-white/8 backdrop-blur px-3 py-1.5">
        <span className="h-[10px] w-[10px] rounded-[2px] bg-amber-300 animate-[levels_1.6s_ease-in-out_infinite]" />
        <div className="text-[12px] text-white/85">
          <span className="font-semibold text-amber-100">Now Playing:</span> {track}
          {artist ? <span className="text-white/65"> — {artist}</span> : null}
        </div>
      </div>
    </div>
  );
}

function RewardPill({ msToBurn, potBBURN, offset = 0 }: { msToBurn: number; potBBURN: number; offset?: number }) {
  const soon = msToBurn >= 0 && msToBurn <= 5 * 60_000;
  return (
    <div
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[82]"
      style={{ top: `calc(var(--safe-top, 1rem) + ${offset}px)` }}
    >
      <div
        className={[
          'rounded-full px-4 py-2 border backdrop-blur text-amber-100',
          'border-amber-400/25 bg-amber-500/10',
          soon ? 'animate-[warmPulse_2.4s_ease-in-out_infinite]' : '',
        ].join(' ')}
      >
        <span className="mr-2">🔥🔥🔥</span>
        <span className="font-semibold">Campfire Reward:</span>{' '}
        <span className="font-extrabold">{fmtReward(potBBURN)} BBURN</span>
      </div>
    </div>
  );
}

function NewsTicker({ items }: { items: string[] }) {
  const loop = items.length ? [...items, ...items] : [];
  const dur = Math.max(20, items.length * 7);

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-[84]"
      style={{ bottom: 'var(--safe-bottom, 0px)' }}
    >
      <div className="mx-auto max-w-6xl px-3">
        <div className="relative rounded-xl border border-white/10 bg-black/45 backdrop-blur px-1">
          <div
            className="whitespace-nowrap will-change-transform animate-[ticker_linear_infinite]"
            style={{ animationDuration: `${dur}s` as any }}
          >
            {loop.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-5 py-2 text-[13px] text-white/85"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                <span>{t}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   Master Overlays (export)
========================= */

export default function BroadcastOverlays({
  nextBurnMs,
}: {
  nextBurnMs: number;
}) {
  const qs = useQueryParams();

  // Master toggle (required)
  const on = parseBool(qs.get('on'), false);

  // Optional toggles / values
  const showSmoke = parseBool(qs.get('smoke'), false);
  const showProgress = parseBool(qs.get('progress'), false);
  const showBonusBanner = parseBool(qs.get('bonus'), false);

  const showLower = Boolean(qs.get('lower'));
  const showReward = Boolean(qs.get('reward'));
  const showNow = Boolean(qs.get('now'));
  const showTicker = Boolean(qs.get('ticker'));

  const pot = Number(qs.get('reward') || '0') || 0;

  // Optional position tweak for the Reward pill (px)
  const rewardOffsetPx = clampNumber(Number(qs.get('rewardOffset') || '0') || 0, -200, 300);

  // LiveBurnProgress config (fallback 8h if not provided)
  const burnTotalMs =
    Number(qs.get('burnMsTotal') || '') ||
    8 * 60 * 60 * 1000;

  // BonusBanner props via URL (optional)
  const bonusTitle = (qs.get('bonusTitle') || '').trim() || 'Campfire Bonus';
  const bonusSub = (qs.get('bonusSub') || '').trim() || 'Round 1';

  // Ticker items split by ';'
  const tickerItems = useMemo(() => {
    const raw = (qs.get('ticker') || '').trim();
    if (!raw) return [];
    return raw.split(';').map((s) => s.trim()).filter(Boolean);
  }, [qs]);

  if (!on) return null;

  return (
    <>
      {/* Background / depth */}
      {showSmoke && <SmokeOverlay className="z-[20]" />}

      {/* Top row */}
      <LiveBug />

      {/* Optional top-right */}
      {showNow && (
        <NowPlaying
          track={(qs.get('now') || '').split('|')[0]}
          artist={(qs.get('now') || '').split('|')[1]}
        />
      )}

      {/* Center-top reward pill (offset adjustable via ?rewardOffset=) */}
      {showReward && <RewardPill msToBurn={nextBurnMs} potBBURN={pot} offset={rewardOffsetPx} />}

      {/* Mid-lower campaign banner (bigger card) */}
      {showBonusBanner && <BonusBanner msToBurn={nextBurnMs} title={bonusTitle} subtitle={bonusSub} />}

      {/* Bottom overlays (ticker behind, lower third above ticker) */}
      {showTicker && <NewsTicker items={tickerItems} />}

      {showLower && (
        <LowerThird
          title={(qs.get('lower') || '').split('|')[0] || 'Live Campfire'}
          subtitle={(qs.get('lower') || '').split('|')[1] || undefined}
        />
      )}

      {/* Slim progress bar (stick it just under the hero if you want) */}
      {showProgress && (
        <LiveBurnProgress
          className="fixed left-1/2 -translate-x-1/2 z-[70] w-[min(1100px,92vw)]"
          msToBurn={nextBurnMs}
          totalMs={burnTotalMs}
          style={{ top: 'calc(var(--safe-top, 1rem) + 72px)' }}
        />
      )}
    </>
  );
}
