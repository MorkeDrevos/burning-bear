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

  const params =
    typeof window !== 'undefined'
      ? new URLSearchParams(window.location.search)
      : null;
  const mini = params?.get('mini') === '1';
  const pos = (params?.get('pos') || 'bottom') as 'top' | 'bottom';
  const align = (params?.get('align') || 'center') as
    | 'left'
    | 'center'
    | 'right';
  const margin = Number(params?.get('m') || 24);

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

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
        const burnIntervalMs =
          typeof s.burnIntervalMs === 'number'
            ? s.burnIntervalMs
            : typeof s.burnIntervalMinutes === 'number'
            ? s.burnIntervalMinutes * 60_000
            : undefined;

        const nowTs = Date.now();

        let next: number | null =
          typeof s.nextBurnAt === 'number' ? s.nextBurnAt : null;

        if (next == null && typeof s.lastBurnAt === 'number' && burnIntervalMs) {
          next = s.lastBurnAt + burnIntervalMs;
        }

        if (next != null && burnIntervalMs) {
          const rolled = rollForward(next, burnIntervalMs, nowTs);
          setTarget(rolled ?? next);
        } else {
          setTarget(next ?? null);
        }
      } catch {}
    };

    load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const remainingMs = target != null ? target - now : Number.POSITIVE_INFINITY;
  const fmtSegs = (ms: number) => {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

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
    return (
      <>
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
            ⏳ {Number.isFinite(remainingMs) ? fmtSegs(remainingMs) : '—'}
          </span>
        </div>

        <style jsx global>{`
          html,
          body,
          #__next,
          :root {
            background: transparent !important;
          }
          html,
          body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }
        `}</style>
      </>
    );
  }

  return (
    <>
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

      <style jsx global>{`
        html,
        body,
        #__next,
        :root {
          background: transparent !important;
        }
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
      `}</style>
    </>
  );
}
