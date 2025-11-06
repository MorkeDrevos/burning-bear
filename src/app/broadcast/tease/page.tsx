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
  const [visible, setVisible] = React.useState(true);

  // tick 1s
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // load state.json (client only)
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
    const id = setInterval(load, 60_000); // refresh each minute
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // auto-hide a few seconds after it fires
  React.useEffect(() => {
    if (target == null) return;
    const remaining = target - now;
    if (remaining <= 0 && visible) {
      const t = setTimeout(() => setVisible(false), 4000); // fade away after 4s
      return () => clearTimeout(t);
    }
  }, [target, now, visible]);

  if (!visible) return null;

  // countdown formatting
  const fmtSegs = (ms: number) => {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  // Marbella clock text (Europe/Madrid)
  const marbellaTime =
    target != null
      ? new Date(target).toLocaleTimeString('en-GB', {
          timeZone: 'Europe/Madrid',
          hour: '2-digit',
          minute: '2-digit',
        })
      : '—:—';

  const remainingMs = target != null ? target - now : Number.POSITIVE_INFINITY;

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
      <div
        style={{
          textAlign: 'center',
          transform: 'translateY(-6vh)',
          opacity: 1,
          animation: 'fadein 300ms ease-out',
        }}
      >
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

        {/* Countdown line (hooked to state.json) */}
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
          </span>{' '}
          <span style={{ opacity: 0.6 }}>({marbellaTime} Marbella)</span>
        </p>
      </div>

      <style>{`
        @keyframes fadein { from { opacity: 0; transform: translateY(-8vh) } to { opacity: 1; transform: translateY(-6vh) } }
      `}</style>
    </div>
  );
}
