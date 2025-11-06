'use client';

import React from 'react';

type Schedule = {
  nextBurnAt?: number;
  burnIntervalMs?: number;
  burnIntervalMinutes?: number;
  lastBurnAt?: number;
};
type StateJson = { schedule?: Schedule };

export default function Tease() {
  // Safe query access (client only)
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  React.useEffect(() => {
    if (typeof window !== 'undefined') setQs(new URLSearchParams(window.location.search));
  }, []);

  // ---------- Controls (URL params) ----------
  const title = (qs?.get('title') ?? '🎥 Something’s heating up at the Campfire…').trim();
  const sub   = (qs?.get('sub')   ?? 'Stay near the flames.').trim();

  // Position / layout
  const bandTopVh = Number(qs?.get('y') ?? 62);         // vertical center of the plate (vh)
  const plateW    = Number(qs?.get('w') ?? 1180);       // max width (px)
  const plateH    = Number(qs?.get('h') ?? 116);        // height (px)
  const opacity   = Math.max(0, Math.min(1, Number(qs?.get('op') ?? 0.88)));
  const blurPx    = Number(qs?.get('blur') ?? 12);
  const radius    = Number(qs?.get('r') ?? 18);
  const align     = (qs?.get('align') ?? 'center') as 'left' | 'center' | 'right';
  const curtain   = (qs?.get('curtain') ?? '0') === '1'; // wide dim band (full width)

  // LIVE pill & independent countdown
  const liveEnabled = (qs?.get('live') ?? '1') === '1';

  // ------ NEW: friendlier aliases + originals ------
  const revealAt = qs?.get('revealAt');
  const revealIn = qs?.get('revealIn');
  const atParam  = revealAt ?? qs?.get('at');   // ISO 8601 UTC e.g., 2025-11-06T11:00:00Z
  const inParam  = revealIn ?? qs?.get('in');   // seconds (e.g., 2700)

  // Time state
  const [now, setNow] = React.useState<number>(Date.now());
  const [customTarget, setCustomTarget] = React.useState<number | null>(null); // for revealAt/in
  const [fallbackTarget, setFallbackTarget] = React.useState<number | null>(null); // burn fallback

  // Ticker
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Compute custom countdown target from at/in
  React.useEffect(() => {
    if (!qs) return;

    let target: number | null = null;

    if (atParam) {
      const t = Date.parse(atParam);
      target = Number.isFinite(t) ? t : null;
    } else if (inParam) {
      const sec = Number(inParam);
      target = Number.isFinite(sec) ? Date.now() + Math.max(0, sec) * 1000 : null;
    }

    setCustomTarget(target);
  }, [qs, atParam, inParam]);

  // Fallback to /data/state.json → nextBurnAt (only used when no custom target provided)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' });
        const d: StateJson = await r.json();
        if (!alive) return;

        const s = d?.schedule ?? {};
        const nowTs = Date.now();

        let next = typeof s.nextBurnAt === 'number' ? s.nextBurnAt : null;

        // derive from lastBurnAt + interval
        const interval =
          typeof s.burnIntervalMs === 'number'
            ? s.burnIntervalMs
            : typeof s.burnIntervalMinutes === 'number'
            ? s.burnIntervalMinutes * 60_000
            : null;

        if (next == null && typeof s.lastBurnAt === 'number' && interval) {
          next = s.lastBurnAt + interval;
        }

        // roll forward if stale
        if (next != null && interval) {
          if (nowTs > next) {
            const k = Math.ceil((nowTs - next) / interval);
            next = next + k * interval;
          }
        }

        setFallbackTarget(next ?? null);
      } catch {
        setFallbackTarget(null);
      }
    };

    load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  // Which target drives the LIVE pill?
  const liveTarget = customTarget ?? fallbackTarget;
  const liveMs = liveEnabled && liveTarget ? Math.max(0, liveTarget - now) : 0;

  const fmtHMS = (ms: number) => {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // ---------- Styles ----------
  const container: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 999999,
    background: 'transparent',
  };

  // Optional wide dim band (full width) to suppress underlying UI contrast
  const curtainBand: React.CSSProperties = curtain
    ? {
        position: 'absolute',
        left: 0,
        right: 0,
        top: `calc(${bandTopVh}vh - ${plateH / 2 + 20}px)`,
        height: plateH + 40,
        background:
          'linear-gradient(180deg, rgba(8,6,4,.78), rgba(8,6,4,.82))',
        backdropFilter: `blur(${blurPx}px)`,
        WebkitBackdropFilter: `blur(${blurPx}px)`,
      }
    : {};

  const plateWrap: React.CSSProperties = {
    position: 'absolute',
    top: `${bandTopVh}vh`,
    left: '50%',
    transform: 'translate(-50%,-50%)',
    width: 'min(96vw, 1680px)',
    display: 'flex',
    justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
  };

  const plate: React.CSSProperties = {
    width: `min(100%, ${plateW}px)`,
    height: plateH,
    borderRadius: radius,
    padding: '16px 22px',
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    alignItems: 'center',
    gap: 14,
    background: `rgba(12,10,8, ${opacity})`,
    border: '1px solid rgba(255,235,210,.18)',
    boxShadow: '0 24px 64px rgba(0,0,0,.50), inset 0 0 40px rgba(255,200,140,.06)',
    backdropFilter: `blur(${blurPx}px)`,
    WebkitBackdropFilter: `blur(${blurPx}px)`,
  };

  const livePill: React.CSSProperties = {
    display: liveEnabled ? 'inline-flex' : 'none',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(60,16,16,.82)',
    border: '1px solid rgba(255,130,130,.35)',
    color: '#ffd7c9',
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    filter: 'drop-shadow(0 0 8px rgba(255,70,70,.35))',
  };

  const dot: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: '#ff4747',
    boxShadow: '0 0 14px #ff4747',
  };

  const body: React.CSSProperties = {
    display: 'grid',
    gap: 6,
    minWidth: 0,
  };

  const headline: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 'clamp(18px, 2.2vw, 22px)',
    letterSpacing: '.2px',
    color: '#ffedd6',
    textShadow: '0 0 28px rgba(255,200,120,.28), 0 1px 0 rgba(0,0,0,.5)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const subline: React.CSSProperties = {
    fontWeight: 700,
    fontSize: 12,
    color: 'rgba(255,240,220,.75)',
    opacity: 0.9,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  // Smooth fade on top page H1 (non-destructive)
  const fadeH1Css = `
    /* fade the hero H1 behind the plate for smoother look */
    h1, h1 * {
      transition: opacity .35s ease;
    }
  `;

  return (
    <>
      <div style={container}>
        {curtain && <div style={curtainBand} />}

        <div style={plateWrap}>
          <div style={plate}>
            <span style={livePill}>
              <span style={dot} />
              {liveTarget && liveMs > 0 ? `LIVE in ${fmtHMS(liveMs)}` : 'LIVE NOW'}
            </span>

            <div style={body}>
              <div style={headline}>{title}</div>
              <div style={subline}>{sub}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Force overlay transparency & gently fade any H1 */}
      <style jsx global>{`
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
        ${fadeH1Css}
      `}</style>
    </>
  );
}
