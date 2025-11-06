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
  // ---- runtime query params (guarded for SSR)
  const [params, setParams] = React.useState<URLSearchParams | null>(null);
  React.useEffect(() => {
    setParams(new URLSearchParams(window.location.search));
  }, []);

  // defaults; hydrated after params is set
  const mode  = (params?.get('mode')  || 'hero') as 'hero' | 'banner'; // teaser only
  const y     = Number(params?.get('y') || 26);       // vh anchor for hero
  const w     = Number(params?.get('w') || 1100);     // max card width (px)
  const scale = Number(params?.get('scale') || 1.05); // slight size tweak
  const glass = (params?.get('glass') || 'dark') as 'soft' | 'dark';
  const title = params?.get('title') || "Something’s heating up at the Campfire…";

  // ---- clocks
  const [now, setNow] = React.useState<number>(Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ---- find the next burn from /data/state.json
  const [target, setTarget] = React.useState<number | null>(null);

  React.useEffect(() => {
    let alive = true;
    const rollForward = (next: number, intervalMs: number, nowTs: number) => {
      if (!(Number.isFinite(next) && Number.isFinite(intervalMs)) || intervalMs <= 0) return null;
      if (nowTs <= next) return next;
      const k = Math.ceil((nowTs - next) / intervalMs);
      return next + k * intervalMs;
    };

    const load = async () => {
      try {
        const r = await fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' });
        const d: StateJson = await r.json();
        if (!alive) return;
        const s = d?.schedule ?? {};
        const intervalMs =
          typeof s.burnIntervalMs === 'number'
            ? s.burnIntervalMs
            : typeof s.burnIntervalMinutes === 'number'
            ? s.burnIntervalMinutes * 60_000
            : undefined;

        const nowTs = Date.now();
        let next: number | null = typeof s.nextBurnAt === 'number' ? s.nextBurnAt : null;
        if (next == null && typeof s.lastBurnAt === 'number' && intervalMs) {
          next = s.lastBurnAt + intervalMs;
        }
        if (next != null && intervalMs) {
          setTarget(rollForward(next, intervalMs, nowTs) ?? next);
        } else {
          setTarget(next);
        }
      } catch {
        /* keep previous target */
      }
    };

    load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const remaining = target != null ? Math.max(0, target - now) : Number.POSITIVE_INFINITY;
  const segs = (() => {
    const t = Math.floor(remaining / 1000);
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return { h, m: String(m).padStart(2, '0'), s: String(s).padStart(2, '0') };
  })();

  // ---- small building blocks
  const Chip = ({ children }: { children: React.ReactNode }) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 12px',
        borderRadius: 999,
        border: '1px solid rgba(255,235,200,.20)',
        background: 'rgba(0,0,0,.28)',
        fontWeight: 800,
        fontSize: 14,
        color: '#ffe8c7',
        lineHeight: 1,
      }}
    >
      {children}
    </span>
  );

  const Seg = ({ children }: { children: React.ReactNode }) => (
    <span
      style={{
        display: 'inline-flex',
        minWidth: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 6px',
        borderRadius: 10,
        border: '1px solid rgba(255,235,200,.22)',
        background: 'rgba(16,12,8,.45)',
        fontWeight: 900,
        fontSize: 16,
        color: '#fff4dc',
      }}
    >
      {children}
    </span>
  );

  // ---- outer wrappers (transparent page)
  const Card: React.CSSProperties = {
    maxWidth: w,
    margin: '0 auto',
    borderRadius: 18,
    border: '1px solid rgba(255,230,190,0.22)',
    background:
      glass === 'dark'
        ? 'linear-gradient(180deg, rgba(18,12,8,0.86), rgba(14,10,7,0.82))'
        : 'linear-gradient(180deg, rgba(22,16,10,0.78), rgba(16,12,8,0.74))',
    boxShadow:
      '0 14px 40px rgba(0,0,0,0.48), 0 0 70px rgba(255,180,70,0.10), inset 0 0 54px rgba(255,200,140,0.08)',
    backdropFilter: 'blur(12px)',
    pointerEvents: 'none',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 16px',
  };

  return (
    <>
      {mode === 'hero' ? (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            top: `${y}vh`,
            transform: `translate(-50%,-50%) scale(${scale})`,
            width: 'min(92vw, 1400px)',
            background: 'transparent',
            pointerEvents: 'none',
          }}
        >
          <div style={Card}>
            {/* Row: LIVE + Title + Countdown */}
            <div style={rowStyle}>
              <Chip>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: '#ff4d4d', boxShadow: '0 0 10px #ff4d4d' }} />
                LIVE
              </Chip>

              <div
                style={{
                  fontWeight: 900,
                  fontSize: 20,
                  color: '#ffe7b8',
                  textShadow: '0 0 22px rgba(255,200,120,.25)',
                  letterSpacing: '.2px',
                  marginRight: 'auto',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
                title={title}
              >
                🔥 {title}
              </div>

              <Chip>
                Next burn in
                <span style={{ display: 'inline-flex', gap: 6, marginLeft: 6 }}>
                  <Seg>{segs.h}</Seg> : <Seg>{segs.m}</Seg> : <Seg>{segs.s}</Seg>
                </span>
              </Chip>
            </div>
          </div>
        </div>
      ) : (
        // banner fallback if ever used
        <div
          style={{
            position: 'fixed', inset: 0, display: 'flex',
            alignItems: 'flex-start', justifyContent: 'center',
            padding: 24, background: 'transparent', pointerEvents: 'none',
          }}
        >
          <div style={{ ...Card, transform: `scale(${scale})` }}>
            <div style={rowStyle}>
              <Chip>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 999, background: '#ff4d4d', boxShadow: '0 0 10px #ff4d4d' }} />
                LIVE
              </Chip>
              <div
                style={{
                  fontWeight: 900, fontSize: 20, color: '#ffe7b8',
                  textShadow: '0 0 22px rgba(255,200,120,.25)', letterSpacing: '.2px',
                  marginRight: 'auto', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}
                title={title}
              >
                🔥 {title}
              </div>
              <Chip>
                Next burn in
                <span style={{ display: 'inline-flex', gap: 6, marginLeft: 6 }}>
                  <Seg>{segs.h}</Seg> : <Seg>{segs.m}</Seg> : <Seg>{segs.s}</Seg>
                </span>
              </Chip>
            </div>
          </div>
        </div>
      )}

      {/* Force transparent page for OBS */}
      <style jsx global>{`
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
      `}</style>
    </>
  );
}
