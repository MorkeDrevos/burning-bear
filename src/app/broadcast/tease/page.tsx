'use client';

import React from 'react';

export default function Tease() {
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  React.useEffect(() => { if (typeof window !== 'undefined') setQs(new URLSearchParams(window.location.search)); }, []);

  // Tweak by URL
  const msg   = (qs?.get('title') ?? "🔥 Something’s heating up at the Campfire…").trim();
  const y     = Number(qs?.get('y') ?? 28);     // vertical anchor in vh over the hero/H1
  const w     = Number(qs?.get('w') ?? 1280);   // max width (px)
  const live  = (qs?.get('live') ?? '1') === '1';
  const dim   = Number(qs?.get('dim') ?? 0.28); // background dim behind the banner (0–0.6)
  const align = (qs?.get('align') ?? 'center') as 'left'|'center'|'right';

  const container: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 999999,
    background: 'transparent',
  };

  const dimmer: React.CSSProperties = dim > 0 ? {
    position: 'absolute',
    left: 0, right: 0,
    top: `${y - 7}vh`, // a little above
    height: '14vh',    // slim band to improve contrast
    background: `linear-gradient(180deg, rgba(0,0,0,${dim}) 0%, rgba(0,0,0,${Math.max(dim-0.08,0)}) 100%)`,
    filter: 'blur(0.5px)',
  } : {};

  const wrap: React.CSSProperties = {
    position: 'absolute',
    top: `${y}vh`,
    left: '50%',
    transform: 'translate(-50%,-50%)',
    width: 'min(95vw, 1600px)',
    display: 'flex',
    justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
  };

  const bar: React.CSSProperties = {
    maxWidth: w,
    width: '100%',
    borderRadius: 18,
    padding: '16px 22px',
    border: '1px solid rgba(255,235,210,.22)',
    background: 'rgba(18,14,10,.70)',
    backdropFilter: 'blur(10px)',
    boxShadow: '0 18px 48px rgba(0,0,0,.45), inset 0 0 34px rgba(255,200,140,.06)',
    display: 'flex',
    alignItems: 'center',
    gap: 14,
  };

  const livePill: React.CSSProperties = {
    display: live ? 'inline-flex' : 'none',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,130,130,.35)',
    background: 'rgba(40,14,14,.55)',
    color: '#ffd7c9',
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };

  const dot: React.CSSProperties = {
    width: 8, height: 8, borderRadius: 999,
    background: '#ff4747', boxShadow: '0 0 12px #ff4747',
  };

  const headline: React.CSSProperties = {
    flex: 1,
    fontWeight: 900,
    fontSize: 'clamp(18px, 2.1vw, 26px)',
    letterSpacing: '.2px',
    color: '#ffead0',
    textShadow: '0 0 26px rgba(255,200,120,.28), 0 1px 0 rgba(0,0,0,.5)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <>
      <div style={container}>
        {dim > 0 && <div style={dimmer} />}
        <div style={wrap}>
          <div style={bar}>
            <span style={livePill}><span style={dot} /> LIVE</span>
            <div style={headline}>{msg}</div>
          </div>
        </div>
      </div>

      {/* Force full transparency */}
      <style jsx global>{`
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin:0 !important; padding:0 !important; overflow:hidden !important; }
      `}</style>
    </>
  );
}
