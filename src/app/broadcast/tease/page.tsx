'use client';

import React from 'react';

type Schedule = {
  burnIntervalMinutes?: number;
  burnIntervalMs?: number;
  nextBurnAt?: number;
  lastBurnAt?: number;
};
type StateJson = { schedule?: Schedule };

// --------- helpers
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const toMs = (mins?: number) =>
  typeof mins === 'number' ? mins * 60_000 : undefined;

function fmtHHMMSS(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const hh = String(h);
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return `${hh}h ${mm}m ${ss}s`;
}

export default function Tease() {
  const [now, setNow] = React.useState<number>(Date.now());
  const [target, setTarget] = React.useState<number | null>(null);

  // parse query params (client-only)
  const qs = React.useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  // layout controls (with safe fallbacks)
  const mode = (qs.get('mode') || 'banner') as 'banner' | 'center';
  const pos = (qs.get('pos') || 'top') as 'top' | 'bottom';
  const align = (qs.get('align') || 'center') as 'left' | 'center' | 'right';
  const m = Number(qs.get('m') || 18); // margin
  const y = Number(qs.get('y') || 0); // vertical offset
  const scale = clamp(Number(qs.get('scale') || 1), 0.8, 1.4);

  const bg = (qs.get('bg') || 'glass') as 'glass' | 'solid' | 'none';
  const alpha = clamp(Number(qs.get('alpha') || (bg === 'glass' ? 0.65 : 0.9)), 0, 1);

  const icon = qs.get('icon') || '🎬';
  const title = qs.get('title') || `Something’s heating up at the Campfire…`;

  const live = qs.get('live') === '1';
  const reward = qs.get('reward') || '';
  const rewardIcon = qs.get('rewardIcon') || '🎁';

  // tick clock every second
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // roll forward helper
  function rollForward(next: number, intervalMs: number, nowTs: number) {
    if (!Number.isFinite(next) || !Number.isFinite(intervalMs) || intervalMs <= 0)
      return null;
    if (nowTs <= next) return next;
    const k = Math.ceil((nowTs - next) / intervalMs);
    return next + k * intervalMs;
  }

  // load schedule
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' });
        const d: StateJson = await r.json();
        if (!alive) return;

        const s = d?.schedule ?? {};
        const intervalMs =
          typeof s.burnIntervalMs === 'number'
            ? s.burnIntervalMs
            : toMs(s.burnIntervalMinutes);

        const nowTs = Date.now();
        let next: number | null =
          typeof s.nextBurnAt === 'number' ? s.nextBurnAt : null;

        if (next == null && typeof s.lastBurnAt === 'number' && intervalMs) {
          next = s.lastBurnAt + intervalMs;
        }
        if (next != null && intervalMs) {
          setTarget(rollForward(next, intervalMs, nowTs) ?? next);
        } else {
          setTarget(next ?? null);
        }
      } catch {
        /* ignore */
      }
    };

    load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const remainingMs =
    target != null ? target - now : Number.POSITIVE_INFINITY;
  const isLiveNow = Number.isFinite(remainingMs) && remainingMs <= 0;

  // --- small UI atoms
  const Pill = ({ children }: { children: React.ReactNode }) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid rgba(255,235,200,.22)',
        background: 'rgba(20,16,10,.45)',
        backdropFilter: 'blur(8px)',
        fontWeight: 800,
        fontSize: 12,
        color: '#ffe7c3',
        textShadow: '0 2px 6px rgba(0,0,0,.6)',
        pointerEvents: 'none',
      }}
    >
      {children}
    </span>
  );

  const LivePill = () => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid rgba(255,120,120,.35)',
        background: 'rgba(120,0,0,.55)',
        boxShadow: '0 0 24px rgba(255,80,80,.35), inset 0 0 18px rgba(255,70,70,.25)',
        color: '#fff',
        fontWeight: 900,
        letterSpacing: '.3px',
        textShadow: '0 2px 6px rgba(0,0,0,.7)',
        fontSize: 12,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 99,
          background: '#ff5757',
          boxShadow: '0 0 12px #ff5757',
          animation: 'bburn-pulse 1.25s ease-in-out infinite',
        }}
      />
      LIVE
    </span>
  );

  const RewardPill = ({ text }: { text: string }) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid rgba(255,220,160,.35)',
        background: 'rgba(0,0,0,.35)',
        color: '#ffe7c3',
        fontWeight: 800,
        fontSize: 12,
        textShadow: '0 2px 6px rgba(0,0,0,.6)',
        pointerEvents: 'none',
      }}
    >
      <span style={{ filter: 'drop-shadow(0 0 8px rgba(255,180,70,.45))' }}>
        {rewardIcon}
      </span>
      Rewards: {text}
    </span>
  );

  // --- layout style
  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const containerStyle: React.CSSProperties =
    mode === 'banner'
      ? {
          position: 'fixed',
          left: 0,
          right: 0,
          [pos === 'top' ? 'top' : 'bottom']: 0,
          display: 'flex',
          justifyContent: justify,
          padding: m,
          transform: `translateY(${y}px)`,
          pointerEvents: 'none',
          background: 'transparent',
          zIndex: 2147483647,
        }
      : {
          position: 'fixed',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          transform: `translateY(${y}px) scale(${scale})`,
          pointerEvents: 'none',
          background: 'transparent',
          zIndex: 2147483647,
        };

  const cardBg =
    bg === 'none'
      ? 'transparent'
      : bg === 'glass'
      ? `rgba(10, 8, 6, ${alpha})`
      : `rgba(12, 10, 7, ${alpha})`;

  const card: React.CSSProperties =
    mode === 'banner'
      ? {
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          padding: '10px 14px',
          borderRadius: 14,
          border: '1px solid rgba(255,235,200,.18)',
          background: cardBg,
          backdropFilter: bg === 'glass' ? 'blur(8px)' : undefined,
          boxShadow:
            '0 6px 24px rgba(0,0,0,.35), inset 0 0 22px rgba(255,200,100,.06)',
          transform: `scale(${scale})`,
        }
      : {
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: '18px 22px',
          borderRadius: 18,
          border: '1px solid rgba(255,235,200,.18)',
          background: cardBg,
          backdropFilter: bg === 'glass' ? 'blur(10px)' : undefined,
          boxShadow:
            '0 12px 40px rgba(0,0,0,.45), inset 0 0 26px rgba(255,200,100,.06)',
        };

  const row: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: mode === 'banner' ? 'flex-start' : 'center',
    textAlign: mode === 'banner' ? 'left' : 'center',
  };

  const headTxt: React.CSSProperties = {
    fontSize: mode === 'banner' ? 18 : 28,
    lineHeight: 1.15,
    fontWeight: 900,
    letterSpacing: '.2px',
    color: '#ffe7b4',
    textShadow:
      '0 0 16px rgba(255,200,120,.22), 0 0 24px rgba(255,170,70,.18)',
    pointerEvents: 'none',
  };

  const subTxt: React.CSSProperties = {
    fontSize: mode === 'banner' ? 13 : 16,
    fontWeight: 700,
    color: '#ffdca0',
    textShadow: '0 0 10px rgba(255,160,70,.25)',
    pointerEvents: 'none',
  };

  const timerTxt: React.CSSProperties = {
    color: '#fff3d6',
    textShadow: '0 0 12px rgba(255,200,120,.35)',
  };

  // --- content
  const content = (
    <div style={card}>
      <div style={{ fontSize: mode === 'banner' ? 18 : 26, lineHeight: 1 }}>{icon}</div>
      <div style={row}>
        {/* badges row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {live && <LivePill />}
          {!!reward && <RewardPill text={reward} />}
        </div>

        <div style={headTxt}>{title}</div>

        {!isLiveNow ? (
          <div style={subTxt}>
            ⏳ Find out in{' '}
            <span style={timerTxt}>
              {Number.isFinite(remainingMs) ? fmtHHMMSS(remainingMs) : '—'}
            </span>
            {Number.isFinite(remainingMs) && remainingMs <= 60_000 ? (
              <span style={{ marginLeft: 8 }}>
                <Pill>Rolls over if unclaimed</Pill>
              </span>
            ) : null}
          </div>
        ) : (
          <div style={subTxt}>
            🎥 <span style={{ fontWeight: 900, color: '#fff3d6' }}>Live now</span>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div style={containerStyle}>{content}</div>

      {/* global styles: force transparency & pulse */}
      <style jsx global>{`
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
        @keyframes bburn-pulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.35);opacity:.8} }
      `}</style>
    </>
  );
}
