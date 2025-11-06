'use client';

import React, { useEffect, useMemo, useState } from 'react';

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
  // 100000 -> "100,000"
  return n.toLocaleString('en-US');
}

/* =========================
   Overlay atoms
========================= */

const LiveBug: React.FC<{ title: string; tag?: string }> = ({ title, tag }) => {
  return (
    <div
      className="
        pointer-events-none select-none
        fixed left-4 top-16 z-[70]
        rounded-xl bg-red-600/90 px-3 py-1 text-sm font-bold
        text-white shadow-lg backdrop-blur
      "
      aria-label="Live"
    >
      <span>LIVE</span>
      <span className="mx-2 opacity-70">•</span>
      <span className="opacity-95">{title}</span>
      {tag ? <span className="ml-2 rounded bg-white/15 px-2 py-[2px] text-[12px]">{tag}</span> : null}
    </div>
  );
};

const NowPlaying: React.FC<{ track: string; artist?: string }> = ({ track, artist }) => {
  return (
    <div
      className="
        pointer-events-none select-none
        fixed right-4 top-16 z-[70]
        rounded-xl border border-white/10 bg-black/60 px-3 py-1
        text-sm text-white shadow-lg backdrop-blur
      "
      aria-label="Now Playing"
    >
      <span className="opacity-70 mr-2">Now Playing</span>
      <span className="font-semibold">{track}</span>
      {artist ? <span className="opacity-70"> — {artist}</span> : null}
    </div>
  );
};

const RewardPill: React.FC<{ amount: number; unit?: string }> = ({ amount, unit = '$BBURN' }) => {
  return (
    <div
      className="
        pointer-events-none select-none
        fixed left-1/2 top-[28%] z-[60] -translate-x-1/2
        rounded-2xl border border-amber-400/25 bg-amber-500/15
        px-5 py-2 text-2xl font-extrabold text-amber-100 shadow-xl backdrop-blur
      "
      aria-label="Reward"
    >
      🎁 Reward: {fmtReward(amount)} {unit}
    </div>
  );
};

const LowerThird: React.FC<{ headline: string; sub?: string }> = ({ headline, sub }) => {
  return (
    <div
      className="
        pointer-events-none select-none
        fixed left-1/2 top-1/2 z-[55] -translate-x-1/2 -translate-y-1/2
        rounded-2xl border border-white/10 bg-black/55
        px-6 py-3 text-white shadow-2xl backdrop-blur
      "
      aria-label="Lower Third"
    >
      <div className="text-xl font-bold">{headline}</div>
      {sub ? <div className="text-sm opacity-80 mt-0.5">{sub}</div> : null}
    </div>
  );
};

const NewsTicker: React.FC<{ items: string[] }> = ({ items }) => {
  const text = items.join('   •   ');
  return (
    <div
      className="
        pointer-events-none select-none
        fixed inset-x-0 bottom-3 z-[50]
        mx-auto w-[min(1100px,95vw)]
        overflow-hidden rounded-xl border border-white/10
        bg-black/55 py-2 shadow-xl backdrop-blur
      "
      aria-label="News Ticker"
    >
      <div className="whitespace-nowrap px-4 text-sm text-white/95 animate-[ticker_30s_linear_infinite]">
        {text}
      </div>

      {/* keyframes (scoped via style tag) */}
      <style jsx>{`
        @keyframes ticker {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
};

/* =========================
   Main wrapper
========================= */

const BroadcastOverlays: React.FC = () => {
  const q = useQueryParams();

  // Single switch for all overlays
  const broadcastOn = useMemo(() => parseBool(q.get('broadcast') || q.get('b')), [q]);

  // Safe defaults
  const title = (q.get('title') || 'The Burning Bear').trim();
  const tag = (q.get('tag') || '$BBURN').trim();

  const nowTrack = (q.get('track') || 'Lo-Fi Stream Mix').trim();
  const nowArtist = (q.get('artist') || '🎧').trim();

  // Reward always visible (within broadcast): default to 100,000 BBURN
  const rewardDefault = 100_000;
  const rewardRaw = q.get('reward');
  const rewardParsed = rewardRaw ? parseInt(rewardRaw.replace(/[^0-9]/g, ''), 10) : rewardDefault;
  const reward = Number.isFinite(rewardParsed) ? clampNumber(rewardParsed, 1, 1_000_000_000) : rewardDefault;

  const lowerThirdHeadline = (q.get('lh') || 'Welcome to the Campfire 🔥').trim();
  const lowerThirdSub = (q.get('ls') || 'Real burns. Real buybacks. On-chain.').trim();

  const tickerItems = useMemo(() => {
    const fromQuery = q.getAll('t'); // &t=Item1&t=Item2...
    if (fromQuery && fromQuery.length > 0) return fromQuery.map((s) => s.trim()).filter(Boolean);
    // Safe fallback items
    return [
      'Live burns every cycle',
      'Treasury locked • transparent',
      'Follow @burningbearcamp on X',
      'Buybacks + Burns = Deflation',
    ];
  }, [q]);

  if (!broadcastOn) return null;

  return (
    <>
      {/* Top layer (under any navbar you might have) */}
      <LiveBug title={title || 'Live'} tag={tag || undefined} />
      <NowPlaying track={nowTrack || 'Streaming'} artist={nowArtist || undefined} />

      {/* Centered reward pill (always visible in broadcast mode) */}
      <RewardPill amount={reward} />

      {/* Mid-screen lower third */}
      <LowerThird headline={lowerThirdHeadline || 'Welcome'} sub={lowerThirdSub || undefined} />

      {/* Bottom ticker */}
      <NewsTicker items={tickerItems} />
    </>
  );
};

export default BroadcastOverlays;
