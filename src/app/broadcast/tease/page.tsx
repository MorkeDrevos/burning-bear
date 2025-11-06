'use client';

import React from 'react';

type Schedule = {
  burnIntervalMinutes?: number;
  burnIntervalMs?: number;
  nextBurnAt?: number;
  lastBurnAt?: number;
};
type StateJson = { schedule?: Schedule };

export default function Tease() {
  const [now, setNow] = React.useState<number>(Date.now());
  const [target, setTarget] = React.useState<number | null>(null);

  // URL controls
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const mini = params?.get('mini') === '1';                 // mini pill (lower-third style)
  const pos = (params?.get('pos') || 'bottom') as 'top' | 'bottom';
  const align = (params?.get('align') || 'center') as 'left' | 'center' | 'right';
  const margin = Number(params?.get('m') || 24);            // margin from edges (px)

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let alive = true;

    const load = () =>
      fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
        .then((r) => r.json())
        .then((d: StateJson) => {
          if (!alive) return;
          const s = d?.schedule ?? {};
          const burnI =
            typeof s.burnIntervalMs === 'number'
              ? s.burnIntervalMs
              : typeof s.burnIntervalMinutes === 'number'
              ? s.burnIntervalMinutes * 60_000
              : undefined;

          const next =
            typeof s.nextBurnAt === 'number'
              ? s.nextBurnAt
              : s.lastBurnAt && burnI
              ? s.lastBurnAt + burnI
              : null;

          setTarget(next ?? null);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const remainingMs =
    target != null ? target - now : Number.POSITIVE_INFINITY;

  const fmtSegs = (ms: number) => {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  // --- layout helpers
  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: pos === 'top' ? 'flex-start' : 'flex-end',
    justifyContent: justify,
    padding: margin,
    background: 'transparent',
    pointerEvents: 'none',
  };

  if (mini) {
    // MINI: countdown pill only
    return (
      <div style={containerStyle}>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 999,
            border: '1px solid rgba(255,235,200,.22)',
            background: 'rgba(20,16,10,.55)',
            backdropFilter: 'blur(8px)',
            fontWeight: 800,
            fontSize: 16,
            color: '#ffe7c3',
            textShadow: '0 0 10px rgba(255,190,90,.15)',
            boxShadow:
              '0 6px 18px rgba(0,0,0,.35), inset 0 0 24px rgba(255,180,70,.08)',
          }}
        >
          <span aria-hidden>⏳</span>
          <span>{Number.isFinite(remainingMs) ? fmtSegs(remainingMs) : '—'}</span>
        </span>
      </div>
    );
  }

  // FULL: headline + countdown line (kept if you still want to use it sometimes)
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        pointerEvents: 'none',
        background: 'transparent',
      }}
    >
      <div style={{ textAlign: 'center', transform: 'translateY(-6vh)' }}>
        <h1
          style={{
            fontSize: 'clamp(28px, 4.8vw, 64px)',
            fontWeight: 900,
            letterSpacing: '0.3px',
            color: '#ffe7b4',
            textShadow:
              '0 0 22px rgba(255,200,120,.25), 0 0 44px rgba(255,170,70,.20)',
            margin: 0,
          }}
        >
          🎥 Something’s heating up at the Campfire…
        </h1>

        <p
          style={{
            marginTop: 12,
            fontSize: 'clamp(14px, 2.2vw, 22px)',
            fontWeight: 700,
            color: '#ffdca0',
            textShadow: '0 0 10px rgba(255,160,70,.35)',
          }}
        >
          ⏳ Find out in{' '}
          <span style={{ color: '#fff3d6' }}>
            {Number.isFinite(remainingMs) ? fmtSegs(remainingMs) : '—'}
          </span>
        </p>
      </div>
    </div>
  );
}
