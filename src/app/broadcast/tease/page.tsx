'use client';

import React from 'react';

export default function Tease() {
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  const [now, setNow] = React.useState<number>(Date.now());
  const [revealTarget, setRevealTarget] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined')
      setQs(new URLSearchParams(window.location.search));
  }, []);

  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Helpers
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
  const parseDuration = (str: string): number | null => {
    const re = /(\d+)(h|m|s)/gi;
    let total = 0, m;
    while ((m = re.exec(str))) {
      const n = Number(m[1]);
      const u = m[2].toLowerCase();
      if (u === 'h') total += n * 3600;
      else if (u === 'm') total += n * 60;
      else if (u === 's') total += n;
    }
    return total ? total * 1000 : null;
  };
  const fmtHMS = (ms: number): string => {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  };

  // Query params
  const title = (qs?.get('title') ?? "🔥 Something’s heating up at the Campfire…").trim();
  const livePill = (qs?.get('live') ?? '1') === '1';
  const revealAt = qs?.get('revealAt') ?? qs?.get('at');
  const revealIn = qs?.get('revealIn') ?? qs?.get('in');

  const bandTopVh = Number(qs?.get('y') ?? 58);
  const plateW = Number(qs?.get('w') ?? 980);
  const plateH = Number(qs?.get('h') ?? 100);
  const opacity = clamp01(Number(qs?.get('op') ?? 0.9));
  const blur = Number(qs?.get('blur') ?? 14);
  const radius = Number(qs?.get('r') ?? 20);
  const wrapW = Number(qs?.get('wrap') ?? 1180);
  const dx = Number(qs?.get('dx') ?? 0);
  const pad = Number(qs?.get('pad') ?? 22);
  const curtain = (qs?.get('curtain') ?? '0') === '1';
  const align = (qs?.get('align') ?? 'center') as 'left' | 'center' | 'right';

  // Countdown calc
  React.useEffect(() => {
    if (!revealAt && !revealIn) return;
    if (revealIn) {
      const dur = parseDuration(revealIn);
      if (dur) return setRevealTarget(Date.now() + dur);
    }
    if (revealAt) {
      const d = new Date(revealAt);
      if (!Number.isNaN(d.getTime())) setRevealTarget(d.getTime());
    }
  }, [revealAt, revealIn]);

  const remaining = revealTarget ? revealTarget - now : NaN;
  const hasCountdown = Number.isFinite(remaining) && remaining > 0;

  // Styles
  const container: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 999999,
  };

  const plateWrap: React.CSSProperties = {
    position: 'absolute',
    top: `${bandTopVh}vh`,
    left: '50%',
    transform: `translate(calc(-50% + ${dx}px), -50%)`,
    width: `min(96vw, ${wrapW}px)`,
    display: 'flex',
    justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
  };

  const plate: React.CSSProperties = {
    width: `min(100%, ${plateW}px)`,
    height: plateH,
    borderRadius: radius,
    padding: `18px ${pad}px`,
    display: 'flex',
    alignItems: 'center',
    gap: 16,
    background: `rgba(18,15,12,${opacity})`,
    border: '1px solid rgba(255,235,210,.15)',
    boxShadow: '0 6px 40px rgba(0,0,0,.6), inset 0 0 30px rgba(255,180,100,.05)',
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
  };

  const livePillStyle: React.CSSProperties = {
    display: livePill ? 'inline-flex' : 'none',
    alignItems: 'center',
    gap: 8,
    padding: '8px 14px',
    borderRadius: 999,
    background: 'linear-gradient(90deg, #601212, #320909)',
    border: '1px solid rgba(255,130,130,.35)',
    color: '#ffe7d9',
    fontWeight: 900,
    fontSize: 13,
    boxShadow: '0 0 16px rgba(255,60,60,.3)',
  };

  const dot: React.CSSProperties = {
    width: 9,
    height: 9,
    borderRadius: 999,
    background: '#ff4848',
    boxShadow: '0 0 14px #ff4848',
  };

  const liveClock: React.CSSProperties = {
    marginLeft: 6,
    padding: '3px 8px',
    borderRadius: 6,
    background: 'rgba(255,255,255,.08)',
    border: '1px solid rgba(255,255,255,.12)',
    fontWeight: 800,
    fontSize: 12,
    color: '#fff1e4',
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 'clamp(20px, 2.6vw, 32px)',
    color: '#ffecd4',
    textShadow: '0 0 18px rgba(255,200,120,.25)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const rollStyle: React.CSSProperties = {
    position: 'absolute',
    top: `calc(${bandTopVh}vh + ${plateH / 2 + 6}px)`,
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: 12,
    fontWeight: 600,
    color: '#ffd6a8',
    opacity: 0.85,
    textShadow: '0 0 6px rgba(0,0,0,.7)',
  };

  return (
    <>
      <div style={container}>
        <div style={plateWrap}>
          <div style={plate}>
            <span style={livePillStyle}>
              <span style={dot} />
              LIVE
              {hasCountdown && (
                <span style={liveClock}>in {fmtHMS(remaining)}</span>
              )}
            </span>
            <div style={titleStyle}>{title}</div>
          </div>
        </div>
        <div style={rollStyle}>
          ⏳ If the prize isn’t claimed in 5 minutes, it rolls over to the next Campfire round.
        </div>
      </div>

      <style jsx global>{`
        html, body, #__next, :root {
          background: transparent !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
      `}</style>
    </>
  );
}
