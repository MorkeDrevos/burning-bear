'use client';

import React from 'react';

/**
 * Teaser overlay for OBS/browser-source.
 * Transparent background, pointer-events off, tuned via URL params.
 *
 * URL params:
 *  - title=...         (default: "🎥 Something’s heating up at the Campfire… 🔥")
 *  - sub=...           (default: "")
 *  - live=1|0          (default: 1)
 *  - align=center|left|right (default: center)
 *  - y=vhNumber        (vertical position in vh; default: 31)
 *  - w=pixels          (max plate width; default: 1200)
 *  - h=pixels          (plate height; default: 140)
 *  - op=0..1           (plate opacity; default: 0.9)
 *  - blur=pixels       (backdrop blur; default: 12)
 *  - r=pixels          (border radius; default: 22)
 *  - pad=pixels        (plate padding; default: 24)
 *  - note=...          (optional tiny footnote line)
 *
 * Example:
 * /broadcast/tease?live=1&y=30&w=1280&h=150&op=0.92&blur=14&r=24
 *   &title=🎥%20Something’s%20heating%20up%20at%20the%20Campfire…
 *   &sub=Find%20out%20soon
 */

export default function Tease() {
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setQs(new URLSearchParams(window.location.search));
    }
  }, []);

  // Controls
  const title = (qs?.get('title') ?? "🎥 Something’s heating up at the Campfire…").trim();
  const sub   = (qs?.get('sub') ?? "").trim();
  const note  = (qs?.get('note') ?? "").trim();

  const livePill = (qs?.get('live') ?? '1') === '1';
  const align = (qs?.get('align') ?? 'center') as 'left'|'center'|'right';

  const bandTopVh = Number(qs?.get('y') ?? 31);     // vertical position (vh)
  const plateW    = Number(qs?.get('w') ?? 1200);   // max width (px)
  const plateH    = Number(qs?.get('h') ?? 140);    // height (px)
  const opacity   = Math.max(0, Math.min(1, Number(qs?.get('op') ?? 0.9))); // bg opacity
  const blur      = Number(qs?.get('blur') ?? 12);  // backdrop blur (px)
  const radius    = Number(qs?.get('r') ?? 22);     // border radius (px)
  const padding   = Number(qs?.get('pad') ?? 24);   // padding (px)

  // Layout containers
  const container: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 999999,
    pointerEvents: 'none',
    background: 'transparent',
  };

  const wrap: React.CSSProperties = {
    position: 'absolute',
    top: `${bandTopVh}vh`,
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(96vw, 1720px)',
    display: 'flex',
    justifyContent:
      align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
  };

  const plate: React.CSSProperties = {
    width: `min(100%, ${plateW}px)`,
    height: plateH,
    borderRadius: radius,
    padding: `${padding}px`,
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: 16,
    alignItems: 'center',
    background: `rgba(12, 10, 8, ${opacity})`,
    border: '1px solid rgba(255, 232, 200, 0.18)',
    boxShadow:
      '0 24px 64px rgba(0,0,0,.55), 0 6px 18px rgba(0,0,0,.35), inset 0 0 42px rgba(255, 200, 140, 0.06)',
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
  };

  const pill: React.CSSProperties = {
    display: livePill ? 'inline-flex' : 'none',
    alignItems: 'center',
    gap: 8,
    padding: '9px 12px',
    borderRadius: 999,
    background: 'rgba(70, 16, 16, .78)',
    border: '1px solid rgba(255, 140, 140, .38)',
    color: '#ffd7c9',
    fontWeight: 900,
    fontSize: 13,
    letterSpacing: '.4px',
    lineHeight: 1,
    whiteSpace: 'nowrap',
    filter: 'drop-shadow(0 0 8px rgba(255,70,70,.35))',
    textTransform: 'uppercase',
  };

  const dot: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: '#ff4747',
    boxShadow: '0 0 14px #ff4747',
    animation: 'bburnLivePulse 1.4s ease-in-out infinite',
  };

  const textCol: React.CSSProperties = {
    minWidth: 0,
    display: 'grid',
    alignContent: 'center',
    gap: 4,
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 'clamp(22px, 2.6vw, 36px)',
    letterSpacing: '.2px',
    color: '#ffefd9',
    textShadow:
      '0 0 22px rgba(255,200,120,.28), 0 1px 0 rgba(0,0,0,.55)',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  };

  const subStyle: React.CSSProperties = {
    display: sub ? 'block' : 'none',
    fontWeight: 700,
    fontSize: 'clamp(12px, 1.5vw, 18px)',
    color: '#ffdca8',
    opacity: 0.95,
    textShadow: '0 0 10px rgba(255,180,90,.25)',
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
  };

  const noteStyle: React.CSSProperties = {
    display: note ? 'block' : 'none',
    marginTop: 2,
    fontWeight: 600,
    fontSize: 12,
    color: 'rgba(255, 236, 210, .75)',
    letterSpacing: '.2px',
  };

  return (
    <>
      <div style={container}>
        <div style={wrap}>
          <div style={plate}>
            <span style={pill}>
              <span style={dot} />
              LIVE
            </span>

            <div style={textCol}>
              <div style={titleStyle}>{title}</div>
              <div style={subStyle}>{sub}</div>
              <div style={noteStyle}>{note}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Transparent page + tiny CSS for live dot */}
      <style jsx global>{`
        html, body, #__next, :root {
          background: transparent !important;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
        @keyframes bburnLivePulse {
          0% { transform: scale(1); opacity: 0.85; }
          50% { transform: scale(1.22); opacity: 1; }
          100% { transform: scale(1); opacity: 0.85; }
        }
      `}</style>
    </>
  );
}
