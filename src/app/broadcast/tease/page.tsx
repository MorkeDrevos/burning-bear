'use client';

import React from 'react';

/* ========= Types ========= */
type Schedule = {
  burnIntervalMinutes?: number;
  burnIntervalMs?: number;
  nextBurnAt?: number;
  lastBurnAt?: number;
};
type StateJson = { schedule?: Schedule };

/* ========= Helpers ========= */
const clamp = (n: number, a: number, b: number) => Math.min(b, Math.max(a, n));

function rollForward(next: number, intervalMs: number, nowTs: number) {
  if (!Number.isFinite(next) || !Number.isFinite(intervalMs) || intervalMs <= 0) return null;
  if (nowTs <= next) return next;
  const k = Math.ceil((nowTs - next) / intervalMs);
  return next + k * intervalMs;
}

function segs(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return { h, m, s };
}

function SegBox({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 44,
        height: 38,
        padding: '0 10px',
        borderRadius: 12,
        fontWeight: 900,
        fontSize: 20,
        letterSpacing: 0.5,
        color: '#ffeeda',
        background:
          'linear-gradient(180deg, rgba(255,240,210,0.10), rgba(255,210,150,0.07))',
        boxShadow:
          'inset 0 0 0 1px rgba(255,230,190,0.22), 0 6px 18px rgba(0,0,0,0.28)',
        backdropFilter: 'blur(6px)',
      }}
    >
      {children}
    </span>
  );
}

function Dot() {
  return <span style={{ opacity: 0.55, padding: '0 6px' }}>:</span>;
}

/* ========= Page ========= */
export default function Tease() {
  const [now, setNow] = React.useState<number>(Date.now());
  const [target, setTarget] = React.useState<number | null>(null);

  // Safe URL params (no SSR break)
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  // Layout controls (query string)
  const pos = (params?.get('pos') || 'center') as 'top' | 'center' | 'bottom';
  const align = (params?.get('align') || 'center') as 'left' | 'center' | 'right';
  const scale = clamp(Number(params?.get('scale') || 1), 0.7, 1.4);
  const margin = Number(params?.get('m') || 28);

  // Content controls
  const title =
    params?.get('title') || `Something’s heating up at the Campfire…`;
  const reward = params?.get('reward') || '1,000,000 $BBURN in rewards';
  const showRoll = params?.get('roll') !== '0'; // default on
  const showLive = params?.get('live') !== '0'; // default on

  // Clock
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load schedule and keep aligned with /data/state.json
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' });
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
          setTarget(rollForward(next, burnIntervalMs, nowTs) ?? next);
        } else {
          setTarget(next ?? null);
        }
      } catch {
        /* silent */
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
  const { h, m, s } = segs(remainingMs);

  // --- Layout positioning for the “card”
  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
  const alignItems =
    pos === 'top' ? 'flex-start' : pos === 'bottom' ? 'flex-end' : 'center';

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems,
          justifyContent: justify,
          padding: margin,
          pointerEvents: 'none', // clicks pass to site
          background: 'transparent',
        }}
      >
        {/* Outer glow */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background:
              'radial-gradient(45% 60% at 50% 10%, rgba(255,190,90,0.06), rgba(0,0,0,0))',
          }}
        />

        {/* Glass card */}
        <div
          style={{
            transform: `scale(${scale})`,
            pointerEvents: 'none',
            maxWidth: 1060,
            width: 'min(92vw, 1060px)',
            borderRadius: 18,
            border: '1px solid rgba(255,230,190,0.18)',
            background:
              'linear-gradient(180deg, rgba(22,16,10,0.76), rgba(16,12,8,0.72))',
            boxShadow:
              '0 10px 34px rgba(0,0,0,0.45), 0 0 60px rgba(255,180,70,0.08), inset 0 0 48px rgba(255,200,140,0.06)',
            backdropFilter: 'blur(10px)',
          }}
        >
          {/* Row 1: badges + title + countdown + reward */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr auto auto',
              gap: 14,
              alignItems: 'center',
              padding: '16px 18px',
            }}
          >
            {/* LIVE */}
            {showLive && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 12px',
                  borderRadius: 999,
                  background:
                    'linear-gradient(180deg, rgba(255,90,80,0.18), rgba(255,60,50,0.14))',
                  boxShadow: 'inset 0 0 0 1px rgba(255,110,90,0.35)',
                  fontWeight: 800,
                  color: '#ffdccc',
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: 9,
                    height: 9,
                    borderRadius: 999,
                    background: '#ff5d4d',
                    boxShadow: '0 0 10px rgba(255,80,60,0.8)',
                  }}
                />
                LIVE
              </div>
            )}

            {/* Title */}
            <div
              style={{
                fontWeight: 900,
                fontSize: 22,
                lineHeight: 1.1,
                color: '#ffe7c9',
                textShadow:
                  '0 0 16px rgba(255,190,110,0.22), 0 0 36px rgba(255,160,70,0.18)',
              }}
            >
              🔥 {title}
            </div>

            {/* Countdown */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                color: '#ffe2c0',
                fontWeight: 800,
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ opacity: 0.8, marginRight: 4 }}>Next burn in</span>
              <SegBox>{h}</SegBox>
              <Dot />
              <SegBox>{String(m).padStart(2, '0')}</SegBox>
              <Dot />
              <SegBox>{String(s).padStart(2, '0')}</SegBox>
            </div>

            {/* Reward */}
            <div
              style={{
                justifySelf: 'end',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
                padding: '10px 12px',
                borderRadius: 12,
                color: '#ffedd9',
                fontWeight: 900,
                background:
                  'linear-gradient(180deg, rgba(255,210,140,0.18), rgba(255,180,80,0.14))',
                boxShadow:
                  'inset 0 0 0 1px rgba(255,215,160,0.33), 0 6px 16px rgba(0,0,0,0.28)',
              }}
            >
              <span>🎁</span>
              <span style={{ fontSize: 14 }}>{reward}</span>
            </div>
          </div>

          {/* Row 2: rollover info */}
          {showRoll && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderTop: '1px solid rgba(255,230,190,0.14)',
                color: '#ffe9ce',
                fontSize: 13.5,
                fontWeight: 700,
                background:
                  'linear-gradient(180deg, rgba(255,210,150,0.07), rgba(255,210,150,0.03))',
              }}
            >
              <span>⏱️</span>
              <span>
                If the prize isn’t claimed in 5 minutes, it rolls over to the next
                Campfire round.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Force-page transparent for OBS */}
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
