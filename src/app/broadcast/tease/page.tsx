'use client';

import React from 'react';

export default function Tease() {
  // Guard window for Next prerender
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  React.useEffect(() => setQs(new URLSearchParams(window.location.search)), []);

  // URL params (all optional)
  const y      = Number(qs?.get('y') ?? 26);                    // vertical anchor in vh (over your H1)
  const w      = Number(qs?.get('w') ?? 1100);                  // max width (px)
  const scale  = Number(qs?.get('scale') ?? 1.05);              // size tweak
  const align  = (qs?.get('align') ?? 'center') as 'left'|'center'|'right';
  const title  = qs?.get('title') ?? "Something’s heating up at the Campfire…";
  const sub    = qs?.get('sub') ?? "";                          // optional small subline
  const live   = (qs?.get('live') ?? '1') === '1';              // show 🔴 LIVE pill
  const glow   = (qs?.get('glow') ?? '1') === '1';              // text glow on/off
  const mode   = (qs?.get('mode') ?? 'strip') as 'strip'|'tag'; // 'strip' = wide bar, 'tag' = compact pill

  const container: React.CSSProperties = {
    position: 'fixed',
    left: '50%',
    top: `${y}vh`,
    transform: `translate(-50%,-50%) scale(${scale})`,
    width: 'min(94vw, 1400px)',
    pointerEvents: 'none',
    zIndex: 999999,
    background: 'transparent',
  };

  const row: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
  };

  const strip: React.CSSProperties = {
    maxWidth: w,
    margin: '0 auto',
    borderRadius: 16,
    border: '1px solid rgba(255,235,200,.20)',
    background: 'linear-gradient(180deg, rgba(16,12,8,.80), rgba(14,10,7,.78))',
    boxShadow: '0 16px 40px rgba(0,0,0,.45), inset 0 0 48px rgba(255,200,140,.06)',
    backdropFilter: 'blur(10px)',
    padding: '14px 18px',
  };

  const livePill: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '7px 12px',
    borderRadius: 999,
    border: '1px solid rgba(255,120,120,.35)',
    background: 'rgba(30,12,12,.55)',
    color: '#ffd7c9',
    fontWeight: 800,
    fontSize: 13,
    lineHeight: 1,
    whiteSpace: 'nowrap',
  };

  const dot: React.CSSProperties = {
    width: 8, height: 8, borderRadius: 999,
    background: '#ff4747', boxShadow: '0 0 10px #ff4747',
  };

  const h: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 20,
    color: '#ffe8c7',
    letterSpacing: '.2px',
    textShadow: glow ? '0 0 24px rgba(255,200,120,.25)' : 'none',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const subTxt: React.CSSProperties = {
    marginLeft: 10,
    fontWeight: 700,
    fontSize: 13,
    color: 'rgba(255,240,210,.85)',
    opacity: sub ? 1 : 0,
  };

  // Compact “tag” mode (if you want even smaller)
  if (mode === 'tag') {
    return (
      <>
        <div style={{...container, width: 'auto'}}>
          <div style={{...strip, padding: '10px 14px'}}>
            <div style={row}>
              {live && (
                <span style={livePill}><span style={dot} /> LIVE</span>
              )}
              <div style={{...h, fontSize: 18}} title={title}>🔥 {title}</div>
            </div>
          </div>
        </div>

        <style jsx global>{`
          html,body,#__next,:root{background:transparent!important}
          html,body{margin:0!important;padding:0!important;overflow:hidden!important}
        `}</style>
      </>
    );
  }

  // Default: wide strip
  return (
    <>
      <div style={container}>
        <div style={strip}>
          <div style={row}>
            {live && (
              <span style={livePill}><span style={dot} /> LIVE</span>
            )}
            <div style={h} title={title}>🔥 {title}</div>
            {sub && <span style={subTxt}>{sub}</span>}
          </div>
        </div>
      </div>

      <style jsx global>{`
        html,body,#__next,:root{background:transparent!important}
        html,body{margin:0!important;padding:0!important;overflow:hidden!important}
      `}</style>
    </>
  );
}
