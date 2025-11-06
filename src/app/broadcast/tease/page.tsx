'use client';

import React from 'react';

type Schedule = {
  burnIntervalMinutes?: number;
  burnIntervalMs?: number;
  nextBurnAt?: number;
  lastBurnAt?: number;
};
type StateJson = { schedule?: Schedule };

// ========== helpers ==========
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

  // ===== query params =====
  const qs = React.useMemo(
    () =>
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(),
    []
  );

  const mode = (qs.get('mode') || 'banner') as 'banner' | 'center';
  const pos = (qs.get('pos') || 'top') as 'top' | 'bottom';
  const align = (qs.get('align') || 'center') as 'left' | 'center' | 'right';
  const m = Number(qs.get('m') || 18);
  const y = Number(qs.get('y') || 0);
  const scale = clamp(Number(qs.get('scale') || 1.1), 0.9, 1.5);
  const bg = (qs.get('bg') || 'glass') as 'glass' | 'solid' | 'none';
  const alpha = clamp(Number(qs.get('alpha') || 0.85), 0, 1);

  const icon = qs.get('icon') || '🎬';
  const title = qs.get('title') || `🔥 Something’s heating up at the Campfire…`;
  const live = qs.get('live') === '1';
  const reward = qs.get('reward') || '';
  const rewardIcon = qs.get('rewardIcon') || '🎁';

  // ===== clock =====
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ===== load /data/state.json =====
  function rollForward(next: number, intervalMs: number, nowTs: number) {
    if (!Number.isFinite(next) || !Number.isFinite(intervalMs) || intervalMs <= 0)
      return null;
    if (nowTs <= next) return next;
    const k = Math.ceil((nowTs - next) / intervalMs);
    return next + k * intervalMs;
  }

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch(`/data/state.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
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

        if (next == null && typeof s.lastBurnAt === 'number' && intervalMs)
          next = s.lastBurnAt + intervalMs;

        if (next != null && intervalMs)
          setTarget(rollForward(next, intervalMs, nowTs) ?? next);
        else setTarget(next ?? null);
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

  const remainingMs = target != null ? target - now : Number.POSITIVE_INFINITY;
  const isLiveNow = Number.isFinite(remainingMs) && remainingMs <= 0;

  // ===== mini components =====
  const LivePill = () => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid rgba(255,120,120,.45)',
        background: 'rgba(180,20,20,.65)',
        boxShadow:
          '0 0 32px rgba(255,70,70,.45), inset 0 0 22px rgba(255,60,60,.35)',
        color: '#fff',
        fontWeight: 900,
        letterSpacing: '.4px',
        textShadow: '0 2px 8px rgba(0,0,0,.8)',
        fontSize: 14,
        pointerEvents: 'none',
      }}
    >
      <span
        style={{
          width: 9,
          height: 9,
          borderRadius: 99,
          background: '#ff5757',
          boxShadow: '0 0 14px #ff5757',
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
        padding: '6px 12px',
        borderRadius: 999,
        border: '1px solid rgba(255,220,160,.4)',
        background: 'rgba(0,0,0,.45)',
        color: '#ffe7c3',
        fontWeight: 800,
        fontSize: 13,
        textShadow: '0 2px 6px rgba(0,0,0,.7)',
      }}
    >
      <span style={{ filter: 'drop-shadow(0 0 10px rgba(255,180,70,.6))' }}>
        {rewardIcon}
      </span>
      Rewards: {text}
    </span>
  );

  // ===== layout =====
  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const container: React.CSSProperties =
    mode === 'banner'
      ? {
          position: 'fixed',
          left: 0,
          right: 0,
          [pos]: 0,
          display: 'flex',
          justifyContent: justify,
          padding: m,
          transform: `translateY(${pos === 'top' ? 60 : -60}px)`,
          zIndex: 99999,
          pointerEvents: 'none',
        }
      : {
          position: 'fixed',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          zIndex: 99999,
          pointerEvents: 'none',
        };

  const cardBg =
    bg === 'none'
      ? 'transparent'
      : bg === 'glass'
      ? `rgba(10, 8, 6, ${alpha})`
      : `rgba(15, 12, 9, ${alpha})`;

  const card: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    padding: '20px 28px',
    borderRadius: 18,
    border: '1px solid rgba(255,235,200,.25)',
    background: cardBg,
    backdropFilter: bg === 'glass' ? 'blur(10px)' : undefined,
    boxShadow:
      '0 20px 60px rgba(0,0,0,.55), inset 0 0 34px rgba(255,200,100,.12)',
    transform: `scale(${scale})`,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: 32,
    fontWeight: 900,
    letterSpacing: '0.3px',
    color: '#ffeecb',
    textShadow:
      '0 2px 10px rgba(0,0,0,.8), 0 0 30px rgba(255,200,100,.25), 0 0 50px rgba(255,170,70,.2)',
    textAlign: 'center',
  };

  const subTxt: React.CSSProperties = {
    fontWeight: 700,
    color: '#ffdca0',
    fontSize: 18,
    textAlign: 'center',
    textShadow: '0 2px 8px rgba(0,0,0,.7)',
  };

  const timerTxt: React.CSSProperties = {
    color: '#fff8e3',
    fontWeight: 900,
    textShadow: '0 0 14px rgba(255,210,100,.4)',
  };

  // ===== content =====
  const content = (
    <div style={card}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 4,
        }}
      >
        {live && <LivePill />}
        {!!reward && <RewardPill text={reward} />}
      </div>

      <div style={titleStyle}>
        {icon} {title}
      </div>

      {!isLiveNow ? (
        <div style={subTxt}>
          ⏳ Find out more in{' '}
          <span style={timerTxt}>
            {Number.isFinite(remainingMs) ? fmtHHMMSS(remainingMs) : '—'}
          </span>
        </div>
      ) : (
        <div style={subTxt}>
          🎥 <strong style={{ color: '#fff8e3' }}>Live now</strong>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div style={container}>{content}</div>

      <style jsx global>{`
        html, body, #__next, :root {
          background: transparent !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        @keyframes bburn-pulse {
          0%,100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.35); opacity: 0.75; }
        }
      `}</style>
    </>
  );
}
