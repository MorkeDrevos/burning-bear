'use client';

import React from 'react';

// If NewsTicker lives elsewhere, adjust this import path:
import NewsTicker from './NewsTicker';

type Props = {
  /** Milliseconds to next burn – pass the same value your hero uses */
  nextBurnMs?: number;
};

export default function CampfireBonusBox({ nextBurnMs }: Props) {
  // ===== ticker items (URL-driven if present) =====
  const [items, setItems] = React.useState<string[]>([
    '🔥 Campfire Bonus Round 1 is live!',
    '🎯 Get $BBURN before the next burn to enter',
    '🏆 Winner wallet revealed live on-stream',
    '🐻 Follow @burningbearcamp for updates',
  ]);

  React.useEffect(() => {
    try {
      const h = window.location.hash || '';
      const qs = new URLSearchParams(h.split('?')[1] || '');
      const t = qs.get('ticker');
      if (t) setItems(t.split(';').map((s) => s.trim()).filter(Boolean));
    } catch {}
  }, []);

  // ===== countdown segments (HH:MM:SS) =====
  const segs = React.useMemo(() => {
    if (typeof nextBurnMs !== 'number' || !Number.isFinite(nextBurnMs)) return null;
    const t = Math.max(0, Math.floor(nextBurnMs / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return {
      h: String(h).padStart(2, '0'),
      m: String(m).padStart(2, '0'),
      s: String(s).padStart(2, '0'),
    };
  }, [nextBurnMs]);

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0f1f19]/80 backdrop-blur px-6 py-8 md:px-8 md:py-10 shadow-[0_10px_40px_rgba(0,0,0,0.45)] text-white">
      {/* Live ticker strip */}
      <div className="w-full mb-6 rounded-xl overflow-hidden">
        <div className="relative border border-white/10 bg-black/30 backdrop-blur-sm">
          <div className="absolute inset-0 pointer-events-none ring-1 ring-inset ring-white/5" />
          <NewsTicker items={items} />
        </div>
      </div>

      {/* Title */}
      <div className="flex flex-wrap justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3">
            🔥🔥 Campfire Bonus — <span className="text-amber-400">Round 1</span>
          </h2>
          <p className="text-lg md:text-xl text-white/70 mt-2 max-w-2xl leading-snug">
            Get your $BBURN <span className="text-amber-300 font-semibold">before the next burn</span>. The winning wallet is revealed live on-stream.
          </p>
        </div>

        <div className="bg-amber-700/10 border border-amber-400/20 text-amber-300 px-5 py-2 rounded-xl text-base md:text-lg font-semibold">
          Claim window: 5 min
        </div>
      </div>

      {/* Jackpot */}
      <div className="mb-8 md:mb-10">
        <p className="uppercase text-amber-400/70 tracking-widest text-sm md:text-base mb-2">JACKPOT</p>
        <h3 className="text-[44px] leading-[1.05] md:text-[64px] md:leading-[1.05] lg:text-[76px] font-extrabold text-amber-200 drop-shadow-[0_2px_10px_rgba(255,200,0,0.22)]">
          WIN 1,000,000 <span className="text-amber-300">$BBURN</span>
        </h3>
        <p className="text-base md:text-lg text-white/65 mt-3">
          If unclaimed within 5 minutes, the prize rolls into the next round.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-3 md:gap-4 mb-8">
        <a
          href="https://jup.ag/swap/SOL-BBURN"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 md:px-6 md:py-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/20 rounded-xl text-[15px] md:text-[16px] font-semibold transition"
        >
          🌕 Buy $BBURN to Join the Draw
        </a>
        <a
          href="https://burningbear.camp/#broadcast"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 md:px-6 md:py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-[15px] md:text-[16px] font-semibold transition"
        >
          📺 Campfire Bonus Live
        </a>
        <a
          href="https://x.com/burningbearcamp"
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 md:px-6 md:py-3 bg-white/5 hover:bg-white/15 border border-white/20 rounded-xl text-[15px] md:text-[16px] font-semibold transition"
        >
          ✖ Follow @burningbearcamp
        </a>
      </div>

      {/* Timer Section */}
      <div className="flex flex-col items-start gap-3 mt-4">
        <div className="flex items-center gap-3">
          <div className="uppercase tracking-[0.25em] text-xs md:text-sm text-white/60">
            Next Burn In
          </div>

          {/* Segmented timer (synced via prop) */}
          <div className="flex gap-[6px] md:gap-2 items-center bg-black/30 px-3 md:px-4 py-2 rounded-2xl border border-white/10">
            <Seg>{segs ? segs.h : '--'}</Seg><Dots />
            <Seg>{segs ? segs.m : '--'}</Seg><Dots />
            <Seg>{segs ? segs.s : '--'}</Seg>
          </div>
        </div>

        <p className="text-white/70 text-sm md:text-base">
          Eligible buys must settle before this timer ends.
        </p>
      </div>
    </div>
  );
}

/* ===== local UI bits for the segmented timer ===== */
function Seg({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center min-w-[34px] md:min-w-[40px] h-[34px] md:h-[40px] rounded-xl border border-white/12 bg-white/[0.07] backdrop-blur px-2 text-lg md:text-2xl font-extrabold leading-none">
      {children}
    </span>
  );
}
function Dots() {
  return <span className="px-0.5 text-amber-200">:</span>;
}
