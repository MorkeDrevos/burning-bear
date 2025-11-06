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
  const [now, setNow] = React.useState(Date.now());
  const [target, setTarget] = React.useState<number | null>(null);

  // ── URL params (no redeploy needed)
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  const pos = (params?.get('pos') || 'top') as 'top' | 'bottom';
  const align = (params?.get('align') || 'center') as 'left' | 'center' | 'right';
  const margin = Number(params?.get('m') || 24);
  const reward = params?.get('reward') || '1,000,000 $BBURN in rewards';
  const showRollover = params?.get('roll') !== '0'; // default on
  const mini = params?.get('mini') === '1'; // small ticker if desired

  // tick clock every second
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // roll next forward so it's always in the future
  function rollForward(next: number, intervalMs: number, nowTs: number) {
    if (!Number.isFinite(next) || !Number.isFinite(intervalMs) || intervalMs <= 0) return null;
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
        const burnIntervalMs =
          typeof s.burnIntervalMs === 'number'
            ? s.burnIntervalMs
            : typeof s.burnIntervalMinutes === 'number'
            ? s.burnIntervalMinutes * 60_000
            : undefined;

        const nowTs = Date.now();
        let next: number | null = typeof s.nextBurnAt === 'number' ? s.nextBurnAt : null;
        if (next == null && typeof s.lastBurnAt === 'number' && burnIntervalMs) {
          next = s.lastBurnAt + burnIntervalMs;
        }
        if (next != null && burnIntervalMs) {
          setTarget(rollForward(next, burnIntervalMs, nowTs) ?? next);
        } else {
          setTarget(next ?? null);
        }
      } catch {
        // keep silent; shows em dash until it loads next time
      }
    };

    load();
    const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const remainingMs = target != null ? target - now : Number.POSITIVE_INFINITY;

  const segs = (() => {
    const t = Math.max(0, Math.floor((Number.isFinite(remainingMs) ? remainingMs : 0) / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return { h, m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
  })();

  // layout helpers
  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const container: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    alignItems: pos === 'top' ? 'flex-start' : 'flex-end',
    justifyContent: justify,
    padding: margin,
    pointerEvents: 'none',
    background: 'transparent',
    zIndex: 999999,
  };

  // MINi ticker (optional)
  if (mini) {
    return (
      <>
        <div style={container}>
          <div
            style={{
              pointerEvents: 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 12,
              padding: '10px 14px',
              borderRadius: 999,
              border: '1px solid rgba(255,235,200,.22)',
              background: 'rgba(16,12,8,.6)',
              backdropFilter: 'blur(8px)',
              fontWeight: 800,
              fontSize: 16,
              color: '#ffe7c3',
              textShadow: '0 0 10px rgba(255,190,90,.18)',
              boxShadow: '0 6px 18px rgba(0,0,0,.35), inset 0 0 24px rgba(255,180,70,.08)',
            }}
          >
            <LivePill />
            <span>Next burn in</span>
            <Timer h={segs.h} m={segs.m} s={segs.s} />
          </div>
        </div>
        <GlobalTransparent />
      </>
    );
  }

  // Dominant TV banner
  return (
    <>
      <div style={container}>
        <div
          style={{
            pointerEvents: 'auto',
            width: '100%',
            maxWidth: '1400px',
            // desktop: wide, mobile: full
            paddingLeft: 8,
            paddingRight: 8,
            display: 'flex',
            justifyContent: justify,
          }}
        >
          <div
            style={{
              width: '100%',
              // 92% width on larger screens, full on small
              maxWidth: 'min(92vw, 1280px)',
              margin: '0 auto',
              borderRadius: 18,
              border: '1px solid rgba(255,220,160,.22)',
              background:
                'linear-gradient(180deg, rgba(25,18,10,.78), rgba(18,12,8,.78))',
              backdropFilter: 'blur(8px)',
              boxShadow:
                '0 12px 38px rgba(0,0,0,.5), inset 0 0 60px rgba(255,170,60,.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                alignItems: 'center',
                gap: 16,
                padding: '14px 18px',
              }}
            >
              {/* LEFT: LIVE + Brand */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <LiveBadge />
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 10,
                    color: '#ffdca0',
                    fontWeight: 800,
                    letterSpacing: '.2px',
                    textShadow: '0 0 10px rgba(255,180,90,.22)',
                    fontSize: 'clamp(14px, 1.8vw, 18px)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  🔥 The Burning Bear — Live
                </div>
              </div>

              {/* CENTER: Headline */}
              <div
                style={{
                  minWidth: 0,
                  textAlign: 'center',
                  fontWeight: 900,
                  fontSize: 'clamp(16px, 2.2vw, 28px)',
                  color: '#ffe9c8',
                  textShadow:
                    '0 0 28px rgba(255,200,120,.28), 0 0 46px rgba(255,170,70,.18)',
                  letterSpacing: '.2px',
                  lineHeight: 1.15,
                }}
              >
                🔥 Something’s heating up at the Campfire…
              </div>

              {/* RIGHT: Timer + Reward */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      color: '#ffd6a0',
                      fontWeight: 800,
                      fontSize: 'clamp(12px, 1.5vw, 14px)',
                      opacity: 0.9,
                    }}
                  >
                    Next burn in
                  </span>
                  <Timer h={segs.h} m={segs.m} s={segs.s} />
                </div>

                <div
                  style={{
                    marginLeft: 6,
                    padding: '8px 12px',
                    borderRadius: 12,
                    border: '1px solid rgba(255,220,160,.25)',
                    background: 'rgba(255,190,100,.08)',
                    color: '#ffe9c8',
                    fontWeight: 800,
                    fontSize: 'clamp(12px, 1.6vw, 14px)',
                    whiteSpace: 'nowrap',
                    textShadow: '0 0 10px rgba(255,180,90,.2)',
                  }}
                >
                  🎁 {reward}
                </div>
              </div>
            </div>

            {/* ROLLOVER STRIP */}
            {showRollover && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 14px',
                  borderTop: '1px solid rgba(255,220,160,.14)',
                  background:
                    'linear-gradient(180deg, rgba(255,170,70,.06), rgba(255,170,70,.00))',
                }}
              >
                <span style={{ fontSize: 18, lineHeight: 1 }}>⏱️</span>
                <span
                  style={{
                    color: '#ffdcb0',
                    fontWeight: 700,
                    fontSize: 'clamp(12px, 1.5vw, 14px)',
                    textShadow: '0 0 10px rgba(255,180,90,.18)',
                  }}
                >
                  If the prize isn’t claimed in 5 minutes, it rolls over to the next Campfire round.
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      <GlobalTransparent />
    </>
  );
}

/* ───────────────────── sub-components ───────────────────── */

function Timer({ h, m, s }: { h: number; m: string; s: string }) {
  const box: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 28,
    padding: '6px 8px',
    borderRadius: 10,
    border: '1px solid rgba(255,235,200,.18)',
    background: 'rgba(255,240,210,.09)',
    color: '#fff3d6',
    fontWeight: 900,
    fontSize: 'clamp(12px, 1.9vw, 16px)',
    lineHeight: 1,
    textShadow: '0 0 10px rgba(255,200,120,.25)',
  };
  const colon: React.CSSProperties = {
    padding: '0 4px',
    color: '#ffdca0',
    fontWeight: 900,
    fontSize: 'clamp(12px, 1.9vw, 16px)',
    textShadow: '0 0 10px rgba(255,180,90,.25)',
  };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center' }}>
      <span style={box}>{h}</span>
      <span style={colon}>:</span>
      <span style={box}>{m}</span>
      <span style={colon}>:</span>
      <span style={box}>{s}</span>
    </span>
  );
}

function LiveBadge() {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '6px 10px',
        borderRadius: 999,
        background:
          'linear-gradient(180deg, rgba(255,80,80,.95), rgba(220,30,30,.95))',
        boxShadow:
          '0 0 14px rgba(255,70,70,.35), inset 0 0 12px rgba(255,180,180,.25)',
        color: 'white',
        fontWeight: 900,
        letterSpacing: '.2px',
        fontSize: 'clamp(11px, 1.2vw, 13px)',
        textTransform: 'uppercase',
      }}
      aria-label="LIVE"
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: 'white',
          boxShadow: '0 0 10px rgba(255,255,255,.8)',
          animation: 'blink 1.2s ease-in-out infinite',
        }}
      />
      LIVE
      <style jsx>{`
        @keyframes blink {
          0%, 60%, 100% { opacity: 1; }
          30% { opacity: .35; }
        }
      `}</style>
    </span>
  );
}

function LivePill() {
  return (
    <span
      style={{
        padding: '4px 10px',
        borderRadius: 999,
        background: 'rgba(255,60,60,.95)',
        color: '#fff',
        fontWeight: 900,
        letterSpacing: '.2px',
        fontSize: 12,
        textTransform: 'uppercase',
        boxShadow: '0 0 12px rgba(255,60,60,.35)',
      }}
    >
      LIVE
    </span>
  );
}

function GlobalTransparent() {
  return (
    <style jsx global>{`
      html, body, #__next, :root { background: transparent !important; }
      html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
    `}</style>
  );
}
