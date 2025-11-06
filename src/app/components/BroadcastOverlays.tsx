'use client';

import React from 'react';
import SmokeOverlay from './SmokeOverlay';
import LiveBurnProgress from './LiveBurnProgress';

/**
 * Broadcast overlays used on the live stream.
 * Activate via:
 *   #broadcast?showSmoke=1&showTicker=1&title=The%20Burning%20Bear
 * or  #/broadcast?...
 * or  ?broadcast=1&...
 *
 * Supported params:
 * - showSmoke=0/1
 * - showBug=0/1
 * - showTicker=0/1
 * - showProgress=0/1
 * - title, subtitle
 * - track, artist
 * - reward=<number>
 * - revealAt=<ISO or ms> (alias: at)
 * - revealIn=<ms>        (alias: in)
 */

type Props = {
  /** ms until next burn (from page.tsx) */
  nextBurnMs?: number;
};

export default function BroadcastOverlays({ nextBurnMs }: Props) {
  const [active, setActive] = React.useState(false);
  const [qs, setQs] = React.useState<URLSearchParams>(new URLSearchParams());
  const [now, setNow] = React.useState<number>(Date.now());

  // tick so countdowns advance
  React.useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  // safe-area helpers (avoid covering header / buy button)
  const applySafe = React.useCallback(() => {
    const header = document.querySelector('header') as HTMLElement | null;
    const safeTop = (header?.getBoundingClientRect().height ?? 0) + 10;

    const buyBtn = document.querySelector(
      'a[aria-label="Buy $BBURN on Jupiter"]'
    ) as HTMLElement | null;
    const btnH = buyBtn?.getBoundingClientRect().height ?? 0;
    const safeBottom = Math.min(btnH + 18, 88);

    document.documentElement.style.setProperty('--safe-top', `${safeTop}px`);
    document.documentElement.style.setProperty('--safe-bottom', `${safeBottom}px`);
  }, []);

  const clearSafe = React.useCallback(() => {
    document.documentElement.style.removeProperty('--safe-top');
    document.documentElement.style.removeProperty('--safe-bottom');
  }, []);

  // robust URL parsing for broadcast mode
  React.useEffect(() => {
    const parse = () => {
      const hash = (window.location.hash || '').trim();      // "#broadcast?..." or "#/broadcast?..."
      const search = (window.location.search || '').trim();  // "?broadcast=1&..."

      const lower = hash.toLowerCase();
      const looksHash =
        lower.startsWith('#broadcast') || lower.startsWith('#/broadcast');

      // params: prefer hash query; otherwise use window.search
      const fromHash = new URLSearchParams(hash.includes('?') ? hash.split('?')[1] : '');
      const fromSearch = new URLSearchParams(search.startsWith('?') ? search.slice(1) : '');
      const params = fromHash.toString() ? fromHash : fromSearch;

      const queryFlag = (fromSearch.get('broadcast') || '') === '1';

      const isOn = looksHash || queryFlag;

      setActive(isOn);
      setQs(params);

      if (isOn) {
        requestAnimationFrame(applySafe);
      } else {
        clearSafe();
      }
    };

    parse();
    window.addEventListener('hashchange', parse);
    window.addEventListener('popstate', parse);

    const onResize = () => {
      if (active) requestAnimationFrame(applySafe);
    };
    window.addEventListener('resize', onResize);

    // re-measure if header/buy button size changes
    const ro = new ResizeObserver(() => onResize());
    const header = document.querySelector('header') as HTMLElement | null;
    const buyBtn = document.querySelector(
      'a[aria-label="Buy $BBURN on Jupiter"]'
    ) as HTMLElement | null;
    if (header) ro.observe(header);
    if (buyBtn) ro.observe(buyBtn);

    return () => {
      window.removeEventListener('hashchange', parse);
      window.removeEventListener('popstate', parse);
      window.removeEventListener('resize', onResize);
      ro.disconnect();
      clearSafe();
    };
  }, [active, applySafe, clearSafe]);

  if (!active) return null;

  // -------- helpers / params ----------
  const bool = (k: string, def = true) => {
    const v = qs.get(k);
    if (v == null) return def;
    return v === '1' || v.toLowerCase() === 'true';
  };
  const num = (k: string) => {
    const v = qs.get(k);
    if (v == null) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const txt = (k: string) => qs.get(k) ?? undefined;

  const showSmoke = bool('showSmoke', true);
  const showBug = bool('showBug', true);
  const showTicker = bool('showTicker', true);
  const showProgress = bool('showProgress', true);

  const title = txt('title') ?? 'The Burning Bear — LIVE';
  const subtitle = txt('subtitle') ?? 'Real burns. Real supply drop.';
  const track = txt('track');
  const artist = txt('artist');
  const reward = num('reward') ?? 0;

  // reveal scheduling (LIVE gates)
  const atParam = txt('revealAt') ?? txt('at');
  const inParam = txt('revealIn') ?? txt('in');
  const revealAt =
    atParam != null
      ? (isFinite(Number(atParam)) ? Number(atParam) : Date.parse(atParam))
      : inParam != null
      ? now + Number(inParam)
      : undefined;

  const live = revealAt == null ? true : now >= revealAt;
  const liveInMs = revealAt != null ? Math.max(0, revealAt - now) : 0;

  // ticker
  const tickerItems = React.useMemo(
    () => [
      'Supply down — burns logged on-chain',
      'Follow @burningbearcamp on X',
      'Next scripted burn coming soon…',
    ],
    []
  );

  return (
    <>
      {showBug && <LiveBug live={live} liveInMs={liveInMs} />}
      <LowerThird title={title} subtitle={subtitle} />
      {track && <NowPlaying track={track} artist={artist} />}

      {reward > 0 && <RewardPill potBBURN={reward} />}

      {showProgress && typeof nextBurnMs === 'number' && Number.isFinite(nextBurnMs) && (
        <div
          className="pointer-events-none fixed left-0 right-0 z-[83]"
          style={{ bottom: 'calc(var(--safe-bottom, 0px) + 8px)' }}
        >
          <div className="mx-auto max-w-6xl px-4">
            <LiveBurnProgress nextBurnMs={Math.max(0, nextBurnMs)} />
          </div>
        </div>
      )}

      {showTicker && <NewsTicker items={tickerItems} />}

      {showSmoke && (
        <div className="pointer-events-none fixed inset-0 z-[70]">
          <SmokeOverlay density="light" area="full" plumes={10} />
        </div>
      )}
    </>
  );
}

/* =========================
 * UI bits
 * =======================*/

function LiveBug({ live, liveInMs }: { live: boolean; liveInMs: number }) {
  const fmt = (ms: number) => {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return h > 0 ? `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`
                 : `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <div
      className="pointer-events-none fixed left-4 z-[80]"
      style={{ top: `calc(var(--safe-top, 0px) + 10px)` }}
    >
      <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 shadow-lg ${
        live ? 'bg-red-600/90' : 'bg-amber-600/90'
      }`}>
        <span className="h-2.5 w-2.5 rounded-full bg-white animate-[blink_1.2s_infinite]" />
        <span className="text-xs font-extrabold tracking-widest text-white">
          {live ? 'LIVE' : 'LIVE IN'}
        </span>
        {!live && (
          <span className="text-xs font-semibold text-white/90">{fmt(liveInMs)}</span>
        )}
      </div>
    </div>
  );
}

function LowerThird({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div
      className="pointer-events-none fixed left-4 z-[86] max-w-[60vw]"
      style={{ bottom: `calc(var(--safe-bottom, 0px) + 56px)` }}
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
      style={{ top: `calc(var(--safe-top, 0px) + 10px)` }}
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

function RewardPill({ potBBURN }: { potBBURN: number }) {
  return (
    <div
      className="pointer-events-none fixed left-1/2 -translate-x-1/2 z-[82]"
      style={{ top: `calc(var(--safe-top, 0px) + 4px)` }}
    >
      <div
        className={[
          'rounded-full border backdrop-blur shadow-lg',
          'px-6 py-3 text-amber-100 text-base sm:text-lg',
          'border-amber-400/25 bg-amber-500/10',
          'animate-[warmPulse_2.4s_ease-in-out_infinite]',
        ].join(' ')}
      >
        <span className="font-semibold">🔥🔥🔥 Campfire Reward:</span>{' '}
        <span className="font-extrabold">{potBBURN.toLocaleString()} BBURN</span>
      </div>
    </div>
  );
}

function NewsTicker({ items }: { items: string[] }) {
  const loop = items.length ? [...items, ...items] : [];
  const dur = Math.max(20, items.length * 7);
  const leading = 56;

  return (
    <div
      className="pointer-events-none fixed left-0 right-0 z-[84]"
      style={{ bottom: 'var(--safe-bottom, 0px)' }}
    >
      <div className="mx-auto max-w-6xl px-3">
        <div className="relative rounded-xl border border-white/10 bg-black/45 backdrop-blur overflow-hidden">
          <div
            className="whitespace-nowrap will-change-transform animate-[ticker_linear_infinite] leading-[1] py-2"
            style={{
              animationDuration: `${dur}s` as any,
              maskImage:
                'linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0, black 40px, black calc(100% - 40px), transparent 100%)',
            }}
          >
            <span style={{ display: 'inline-block', width: leading }} />
            {loop.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-2 px-5 text-[13px] text-white/85 align-middle"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300 inline-block" />
                <span>{t}</span>
              </span>
            ))}
            <span style={{ display: 'inline-block', width: leading }} />
          </div>
        </div>
      </div>
    </div>
  );
}
