'use client';

export default function CampfireBonusBox() {
  return (
    <div className="w-full rounded-2xl border border-white/10 bg-[#0f1f19]/80 backdrop-blur px-8 py-10 shadow-[0_10px_40px_rgba(0,0,0,0.45)] text-white">
      
      {/* Title */}
      <div className="flex flex-wrap justify-between items-start mb-8">
        <div>
          <h2 className="text-3xl md:text-4xl font-extrabold flex items-center gap-3">
            🔥🔥 Campfire Bonus — <span className="text-amber-400">Round 1</span>
          </h2>
          <p className="text-lg md:text-xl text-white/70 mt-2 max-w-2xl leading-snug">
            Get your $BBURN before <span className="text-amber-300 font-semibold">before the next burn</span>. The winning wallet will be revealed live on-stream.
          </p>
        </div>

        <div className="bg-amber-700/10 border border-amber-400/20 text-amber-300 px-5 py-2 rounded-xl text-lg font-semibold">
          Claim window: 5 min
        </div>
      </div>

      {/* Jackpot */}
      <div className="mb-10">
        <p className="uppercase text-amber-400/70 tracking-widest text-sm md:text-base mb-2">🔥🔥</p>
        <h3 className="text-6xl md:text-7xl font-extrabold text-amber-300 drop-shadow-[0_2px_10px_rgba(255,200,0,0.25)]">
          WIN 1,000,000 $BBURN
        </h3>
        <p className="text-lg text-white/60 mt-3">
          If unclaimed within 5 minutes, the prize rolls into the next round.
        </p>
      </div>

      {/* Buttons */}
      <div className="flex flex-wrap gap-4 mb-10">
        <a
          href="https://jup.ag/swap/SOL-BBURN"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/20 rounded-xl text-xl font-semibold transition"
        >
          🌕 Buy $BBURN to Join the Draw
        </a>
        <a
          href="https://burningbear.camp/#broadcast"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xl font-semibold transition"
        >
          📺 Campfire Bonus Live
        </a>
        <a
          href="https://x.com/burningbearcamp"
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3 bg-white/5 hover:bg-white/15 border border-white/20 rounded-xl text-xl font-semibold transition"
        >
          ✖ Follow @burningbearcamp
        </a>
      </div>

      {/* Timer Section */}
<div className="flex flex-col items-start md:items-center gap-3 mt-10">
  <div className="flex items-center gap-3">
    <div className="uppercase tracking-widest text-sm text-white/60">
      Next Burn In
    </div>

    {/* Timer */}
    <div className="flex gap-2 text-4xl md:text-5xl font-bold bg-black/30 px-4 py-2 rounded-2xl border border-white/10">
      <span>06</span><span>:</span><span>28</span><span>:</span><span>48</span>
    </div>
  </div>

  <p className="text-white/70 text-base md:text-lg">
    Eligible buys must settle before this timer ends.
  </p>
</div>
    </div>
  );
}
