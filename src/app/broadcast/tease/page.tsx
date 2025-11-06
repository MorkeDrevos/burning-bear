'use client';

import React from 'react';

export default function Tease() {
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  React.useEffect(() => { if (typeof window !== 'undefined') setQs(new URLSearchParams(window.location.search)); }, []);

  // Controls (URL params)
  const title = (qs?.get('title') ?? "🔥 Something’s heating up at the Campfire…").trim();

  // Position the plate directly over the hero/H1 zone
  // Tune these quickly via URL:
  const bandTopVh  = Number(qs?.get('y')     ?? 31);   // vertical position (vh) – center of the plate
  const plateW     = Number(qs?.get('w')     ?? 1200); // max width (px)
  const plateH     = Number(qs?.get('h')     ?? 120);  // height (px) – makes it cover the whole H1 row
  const opacity    = Math.max(0, Math.min(1, Number(qs?.get('op') ?? 0.88))); // background opacity
  const blur       = Number(qs?.get('blur')  ?? 12);   // backdrop blur (px)
  const radius     = Number(qs?.get('r')     ?? 20);   // border radius (px)
  const livePill   = (qs?.get('live') ?? '0') === '1';
  const align      = (qs?.get('align') ?? 'center') as 'left'|'center'|'right';

  const container: React.CSSProperties = {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999999, background: 'transparent'
  };

  // A subtle dim ONLY where the plate sits, to hide the H1 underneath
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
    width: 'min(100%, '+plateW+'px)',
    height: plateH,
    borderRadius: radius,
    padding: '20px 26px',
    background: `rgba(10,8,6, ${opacity})`,
    border: '1px solid rgba(255,235,210,.18)',
    boxShadow: '0 24px 64px rgba(0,0,0,.50), inset 0 0 40px rgba(255,200,140,.06)',
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    alignItems: 'center',
    gap: 16,
  };

  const pill: React.CSSProperties = {
    display: livePill ? 'inline-flex' : 'none',
    alignItems: 'center',
    gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(60,16,16,.75)',
    border: '1px solid rgba(255,130,130,.35)',
    color: '#ffd7c9',
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    filter: 'drop-shadow(0 0 8px rgba(255,70,70,.35))',
  };

  const dot: React.CSSProperties = {
    width: 10, height: 10, borderRadius: 999,
    background: '#ff4747', boxShadow: '0 0 14px #ff4747'
  };

  const text: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 'clamp(22px, 2.6vw, 34px)',
    letterSpacing: '.2px',
    color: '#ffedd6',
    textShadow: '0 0 28px rgba(255,200,120,.28), 0 1px 0 rgba(0,0,0,.5)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <>
      <div style={container}>
        <div style={plateWrap}>
          <div style={plate}>
            <span style={pill}><span style={dot} /> LIVE</span>
            <div style={text}>{title}</div>
          </div>
        </div>
      </div>

      {/* Keep overlay transparent overall */}
      <style jsx global>{`
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin:0 !important; padding:0 !important; overflow:hidden !important; }
      `}</style>
    </>
  );
}
