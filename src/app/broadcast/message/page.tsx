'use client';

import React from 'react';

/**
 * Broadcast Message Bar
 *
 * URL params:
 * - h:    headline text (big)
 * - sub:  subline text (small)
 * - rules: semicolon-separated rules/tips (shows as scrolling ticker if long)
 * - y:    vertical center in vh (default 62)
 * - wrap: max outer width in px (default 1180)
 * - w:    plate width in px (default 980)
 * - hpx:  plate height in px (default 96)
 * - pad:  horizontal padding inside plate (default 22)
 * - op:   plate opacity 0..1 (default 0.88)
 * - blur: backdrop blur px (default 14)
 * - r:    border radius (default 22)
 * - dx:   horizontal nudge in px (default 0)
 * - align:left|center|right (default center)
 * - tone:  dark|amber (default dark) – quick accent theme
 *
 * Examples:
 * /broadcast/message?h=🔥🔥🔥%20Campfire%20Reward:%201,000,000%20BBURN&sub=Buy%20%26%20hold%20to%20qualify.&rules=Claim%20within%205%20minutes%20or%20rolls%20over;Wallet%20must%20hold%20at%20snapshot;y=58
 * /broadcast/message?h=How%20it%20works&sub=We%20draw%20one%20wallet%20live.&rules=Hold%20BBURN;No%20team%20wallets;Bots%20excluded
 */

export default function Message() {
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  React.useEffect(() => {
    if (typeof window !== 'undefined') setQs(new URLSearchParams(window.location.search));
  }, []);

  // content
  const headline = (qs?.get('h') ?? '🔥🔥🔥 Campfire Reward: 1,000,000 BBURN').trim();
  const subline  = (qs?.get('sub') ?? 'Buy & hold to qualify. If unclaimed in 5 minutes, prize rolls to the next Campfire.').trim();
  const rulesRaw = (qs?.get('rules') ?? '').trim(); // "Rule 1;Rule 2;Rule 3"
  const rules    = rulesRaw ? rulesRaw.split(';').map(s => s.trim()).filter(Boolean) : [];

  // layout controls (keep parity with your other overlays)
  const y      = Number(qs?.get('y') ?? 62);
  const wrap   = Number(qs?.get('wrap') ?? 1180);
  const width  = Number(qs?.get('w') ?? 980);
  const height = Number(qs?.get('hpx') ?? 96);
  const pad    = Number(qs?.get('pad') ?? 22);
  const op     = Math.max(0, Math.min(1, Number(qs?.get('op') ?? 0.88)));
  const blur   = Number(qs?.get('blur') ?? 14);
  const radius = Number(qs?.get('r') ?? 22);
  const dx     = Number(qs?.get('dx') ?? 0);
  const align  = (qs?.get('align') ?? 'center') as 'left' | 'center' | 'right';
  const tone   = (qs?.get('tone') ?? 'dark') as 'dark' | 'amber';

  const isAmber = tone === 'amber';

  // styles
  const container: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 999999,
  };

  const wrapStyle: React.CSSProperties = {
    position: 'absolute',
    top: `${y}vh`,
    left: '50%',
    transform: `translate(calc(-50% + ${dx}px), -50%)`,
    width: `min(96vw, ${wrap}px)`,
    display: 'flex',
    justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
    gap: 12,
  };

  const plate: React.CSSProperties = {
    width: `min(100%, ${width}px)`,
    height,
    display: 'grid',
    alignItems: 'center',
    gridTemplateColumns: '1fr',
    borderRadius: radius,
    padding: `16px ${pad}px`,
    background: isAmber
      ? `rgba(30, 24, 12, ${op})`
      : `rgba(18, 15, 12, ${op})`,
    border: isAmber
      ? '1px solid rgba(255, 206, 140, .35)'
      : '1px solid rgba(255, 235, 210, .15)',
    boxShadow: isAmber
      ? '0 8px 40px rgba(0,0,0,.6), inset 0 0 34px rgba(255,200,100,.07)'
      : '0 8px 40px rgba(0,0,0,.6), inset 0 0 34px rgba(255,180,100,.06)',
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    overflow: 'hidden',
  };

  const head: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 'clamp(18px, 2.2vw, 28px)',
    letterSpacing: '.2px',
    color: '#fff2dc',
    textShadow: '0 0 16px rgba(255,200,120,.22)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const sub: React.CSSProperties = {
    marginTop: 4,
    fontWeight: 700,
    fontSize: 'clamp(12px, 1.5vw, 14px)',
    color: '#ffdcb2',
    opacity: .95,
    textShadow: '0 0 8px rgba(0,0,0,.6)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const tickerWrap: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 26,
    display: rules.length ? 'block' : 'none',
    background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,.08) 100%)',
    borderTop: '1px solid rgba(255,255,255,.06)',
    overflow: 'hidden',
  };

  const tickerInner: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 24,
    padding: '0 14px',
    animation: 'scroll-left 24s linear infinite',
    color: '#ffe7c6',
    fontWeight: 700,
    fontSize: 12,
    textShadow: '0 0 8px rgba(0,0,0,.7)',
    whiteSpace: 'nowrap',
  };

  return (
    <>
      <div style={container}>
        <div style={wrapStyle}>
          <div style={plate}>
            <div style={head}>{headline}</div>
            {subline && <div style={sub}>{subline}</div>}

            {/* Rules ticker */}
            <div style={tickerWrap}>
              <div style={tickerInner}>
                {rules.concat(rules).map((rule, i) => (
                  <span key={i}>• {rule}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global transparency for OBS */}
      <style jsx global>{`
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin:0 !important; padding:0 !important; overflow:hidden !important; }

        @keyframes scroll-left {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}
