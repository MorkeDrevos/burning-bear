'use client';

import React from 'react';

export default function Tease() {
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  React.useEffect(() => {
    if (typeof window !== 'undefined') setQs(new URLSearchParams(window.location.search));
  }, []);

  // -------- Controls (URL params) ----------
  const title = (qs?.get('title') ?? "🎥 Something’s heating up at the Campfire…").trim();
  const sub   = (qs?.get('sub')   ?? "Stay near the flames").trim();
  const note  = (qs?.get('note')  ?? "If the prize isn’t claimed in 5 minutes, it rolls over to the next Campfire.").trim();

  const live      = (qs?.get('live') ?? '1') === '1';       // show red LIVE pill
  const showSub   = (qs?.get('showsub') ?? '1') === '1';
  const showNote  = (qs?.get('shownote') ?? '1') === '1';

  // Position / sizing
  const y       = Number(qs?.get('y') ?? 31);               // vertical position (vh) of banner center
  const w       = Number(qs?.get('w') ?? 1200);             // banner max width (px)
  const h       = Number(qs?.get('h') ?? 140);              // banner height (px)
  const align   = (qs?.get('align') ?? 'center') as 'left'|'center'|'right';

  // Visuals
  const op      = Math.max(0, Math.min(1, Number(qs?.get('op') ?? 0.92)));  // banner bg opacity
  const blur    = Number(qs?.get('blur') ?? 14);
  const r       = Number(qs?.get('r') ?? 24);

  // CURTAIN (fades the hero row behind the banner)
  const useCurtain = (qs?.get('curtain') ?? '1') === '1';
  const coverH     = Number(qs?.get('coverH') ?? (h + 40)); // height (px) of dimmed slice
  const fadeMs     = Number(qs?.get('fadeMs') ?? 900);      // fade-in duration
  const curtainOp  = Math.max(0, Math.min(1, Number(qs?.get('cop') ?? 0.65))); // curtain darkness

  // -------- Styles ----------
  const container: React.CSSProperties = {
    position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 999999, background: 'transparent'
  };

  // wrapper row (align left/center/right)
  const bandRow: React.CSSProperties = {
    position: 'absolute',
    top: `${y}vh`,
    left: '50%',
    transform: 'translate(-50%,-50%)',
    width: 'min(96vw, 1680px)',
    display: 'flex',
    justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
  };

  const plate: React.CSSProperties = {
    width: `min(100%, ${w}px)`,
    height: h,
    borderRadius: r,
    padding: '18px 24px',
    background: `rgba(10,8,6, ${op})`,
    border: '1px solid rgba(255,235,210,.18)',
    boxShadow: '0 24px 64px rgba(0,0,0,.50), inset 0 0 40px rgba(255,200,140,.06)',
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    display: 'grid',
    gridTemplateRows: showSub || showNote ? 'auto auto auto' : 'auto',
    gap: 8,
  };

  const rowTop: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14, minHeight: 34
  };

  const livePill: React.CSSProperties = {
    display: live ? 'inline-flex' as const : 'none',
    alignItems: 'center', gap: 8,
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(60,16,16,.78)',
    border: '1px solid rgba(255,130,130,.35)',
    color: '#ffd7c9',
    fontWeight: 900,
    fontSize: 13, lineHeight: 1, whiteSpace: 'nowrap',
    filter: 'drop-shadow(0 0 8px rgba(255,70,70,.35))',
  };
  const redDot: React.CSSProperties = { width: 10, height: 10, borderRadius: 999, background: '#ff4747', boxShadow: '0 0 14px #ff4747' };

  const headline: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 'clamp(22px, 2.6vw, 34px)',
    letterSpacing: '.2px',
    color: '#ffedd6',
    textShadow: '0 0 28px rgba(255,200,120,.28), 0 1px 0 rgba(0,0,0,.5)',
    flex: 1,
    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  };

  const subText: React.CSSProperties = {
    display: showSub ? 'block' : 'none',
    marginTop: 2,
    fontWeight: 800,
    fontSize: 13,
    color: '#ffe3c3',
    opacity: .95,
    textShadow: '0 0 10px rgba(255,190,100,.18)',
  };

  const noteText: React.CSSProperties = {
    display: showNote ? 'block' : 'none',
    marginTop: 2,
    fontWeight: 700,
    fontSize: 12,
    color: '#cdb29b',
    opacity: .9,
  };

  // Curtain slice position (centered on banner)
  const curtainTop = `calc(${y}vh - ${coverH/2}px)`;

  return (
    <>
      <div style={container}>
        {/* CURTAIN: softly dims the background slice and fades in */}
        {useCurtain && (
          <div
            style={{
              position: 'absolute',
              top: curtainTop,
              left: 0,
              right: 0,
              height: coverH,
              pointerEvents: 'none',
              // nice soft gradient so edges melt into page
              background: `linear-gradient(
                to bottom,
                rgba(0,0,0,0) 0%,
                rgba(0,0,0,${curtainOp}) 22%,
                rgba(0,0,0,${curtainOp}) 78%,
                rgba(0,0,0,0) 100%
              )`,
              animation: `fadeCurtain ${fadeMs}ms ease forwards`,
              opacity: 0,
            }}
          />
        )}

        {/* BANNER */}
        <div style={bandRow}>
          <div style={plate}>
            <div style={rowTop}>
              <span style={livePill}><span style={redDot} /> LIVE</span>
              <div style={headline}>{title}</div>
            </div>

            <div style={subText}>{sub}</div>
            <div style={noteText}>{note}</div>
          </div>
        </div>
      </div>

      {/* Global transparency + animations */}
      <style jsx global>{`
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
        @keyframes fadeCurtain { to { opacity: 1; } }
      `}</style>
    </>
  );
}
