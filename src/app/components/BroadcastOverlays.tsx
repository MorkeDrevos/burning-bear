/* =========================
   Broadcast Overlays (ALL)
   Toggle via URL params:
   ?broadcast
   &lower=Title|Subtitle
   &reward=1000000
   &now=Track|Artist
   &ticker=msg1;msg2;msg3
========================= */

function LiveBug({ className = "" }: { className?: string }) {
  return (
    <div className={"pointer-events-none fixed left-4 z-[80] " + className}
         style={{ top: 'var(--safe-top, 1rem)' }}>
      <div className="inline-flex items-center gap-2 rounded-lg bg-red-600/90 px-3 py-1.5 shadow-lg">
        <span className="h-2.5 w-2.5 rounded-full bg-white animate-[blink_1.2s_infinite]" />
        <span className="text-xs font-extrabold tracking-widest text-white">LIVE</span>
        <span className="text-xs font-semibold text-white/90">• ON AIR</span>
      </div>
    </div>
  );
}

function NowPlaying({ track, artist }: { track: string; artist?: string }) {
  return (
    <div className="pointer-events-none fixed right-4 z-[80]"
         style={{ top: 'var(--safe-top, 1rem)' }}>
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

function RewardPill({
  msToBurn,
  potBBURN,
  offsetY = 0, // 👉 move down just this pill (px)
}: { msToBurn: number; potBBURN: number; offsetY?: number }) {
  const soon = msToBurn >= 0 && msToBurn <= 5 * 60_000;
  return (
    <div className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[82]"
         style={{ top: `calc(var(--safe-top, 1rem) + ${offsetY}px)` }}>
      <div className={[
        "rounded-full px-4 py-2 border backdrop-blur text-amber-100",
        "border-amber-400/25 bg-amber-500/10",
        soon ? "animate-[warmPulse_2.4s_ease-in-out_infinite]" : "",
      ].join(" ")}>
        <span className="mr-2">🔥🔥🔥</span>
        <span className="font-semibold">Campfire Reward:</span>{" "}
        <span className="font-extrabold">{potBBURN.toLocaleString()} BBURN</span>
      </div>
    </div>
  );
}

function LowerThird({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pointer-events-none fixed left-4 z-[86] max-w-[60vw]"
         style={{ bottom: 'calc(var(--safe-bottom, 0px) + 1rem)' }}>
      <div className="rounded-2xl border border-amber-400/25 bg-black/55 backdrop-blur-md px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
        <div className="text-amber-200 font-extrabold text-lg leading-tight">{title}</div>
        {subtitle ? <div className="text-white/75 text-sm mt-0.5">{subtitle}</div> : null}
      </div>
    </div>
  );
}

function NewsTicker({ items }: { items: string[] }) {
  const loop = items.length ? [...items, ...items] : [];
  const dur = Math.max(20, items.length * 7);
  return (
    <div className="pointer-events-none fixed left-0 right-0 z-[84]"
         style={{ bottom: 'var(--safe-bottom, 0px)' }}>
      <div className="mx-auto max-w-6xl px-3">
        <div className="relative rounded-xl border border-white/10 bg-black/45 backdrop-blur px-1">
          <div className="whitespace-nowrap will-change-transform animate-[ticker_linear_infinite]"
               style={{ animationDuration: `${dur}s` as any }}>
            {loop.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-2 px-5 py-2 text-[13px] text-white/85">
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

/* ============ Wrapper that reads URL params and renders all ============ */
export function BroadcastOverlays({
  nextBurnMs,
}: {
  nextBurnMs: number;
}) {
  const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const on = params.has('broadcast') || params.has('lower') || params.has('reward') || params.has('now') || params.has('ticker');

  if (!on) return null;

  const lower = params.get('lower') || '';
  const [lowerTitle, lowerSub] = lower.split('|');

  const reward = Number(params.get('reward') || '0') || 0;

  const now = params.get('now') || '';
  const [npTrack, npArtist] = now.split('|');

  const ticker = (params.get('ticker') || '').split(';').filter(Boolean);

  return (
    <>
      {/* TOP row */}
      <LiveBug />
      <NowPlaying track={npTrack || ''} artist={npArtist || undefined} />

      {/* Center-top reward; move down with offsetY px if you want it lower */}
      <RewardPill msToBurn={nextBurnMs} potBBURN={reward} offsetY={40} />

      {/* Bottom overlays */}
      <LowerThird title={lowerTitle || 'Live Campfire'} subtitle={lowerSub || undefined} />
      <NewsTicker items={ticker} />
    </>
  );
}

/* ============ Keyframes (Tailwind @layer utilities or globals.css) ============ */
/* Add these in globals.css if not present:

@keyframes blink { 0%, 60% { opacity: 1 } 61%, 100% { opacity: .25 } }
@keyframes levels {
  0% { transform: scaleY(.4) }
  50% { transform: scaleY(1) }
  100% { transform: scaleY(.4) }
}
@keyframes warmPulse {
  0%,100% { box-shadow: 0 0 0 0 rgba(251,191,36,.25) }
  50% { box-shadow: 0 0 0 10px rgba(251,191,36,.08) }
}
@keyframes ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }

*/
