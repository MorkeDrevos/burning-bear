'use client';

import React from 'react';

export default function Tease() {
  // Parse URL params safely in the browser
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  React.useEffect(() => {
    if (typeof window !== 'undefined') setQs(new URLSearchParams(window.location.search));
  }, []);

  // Content
  const title = (qs?.get('title') ?? "🔥 Something’s heating up at the Campfire…").trim();
  const sub   = (qs?.get('sub') ?? "Stay near the flames.").trim();
  const live  = (qs?.get('live') ?? '1') === '1';
  const cta   = (qs?.get('cta')  ?? "").trim(); // e.g., "Buy on Jupiter"
  const url   = (qs?.get('url')  ?? "").trim();

  // Layout controls
  const align = (qs?.get('align') ?? 'center') as 'left' | 'center' | 'right'; // ribbon text align
  const y     = Number(qs?.get('y') ?? 31);   // center Y position in vh (sits over H1 by default)
  const w     = Number(qs?.get('w') ?? 1400); // max ribbon width
  const h     = Number(qs?.get('h') ?? 120);  // ribbon height
  const blur  = Number(qs?.get('blur') ?? 14);
  const op    = Math.max(0, Math.min(1, Number(qs?.get('op') ?? 0.92))); // glass opacity
  const radius= Number(qs?.get('r') ?? 24);
  const padX  = Number(qs?.get('px') ?? 24);

  // Placement wrappers
  const container: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    zIndex: 999999,
    pointerEvents: 'none',
    background: 'transparent',
  };

  const place: React.CSSProperties = {
    position: 'absolute',
    top: `${y}vh`,
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(96vw, 1780px)',
    display: 'flex',
    justifyContent:
      align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
  };

  return (
    <>
      <div style={container}>
        <div style={place}>
          <div className="ribbon" style={{
            '--w': `min(100%, ${w}px)`,
            '--h': `${h}px`,
            '--r': `${radius}px`,
            '--blur': `${blur}px`,
            '--op': `${op}`,
            '--px': `${padX}px`,
          } as React.CSSProperties}>
            {/* Left accent + LIVE pill */}
            <div className="left">
              {live && (
                <span className="live">
                  <span className="dot" />
                  LIVE
                </span>
              )}
            </div>

            {/* Text block */}
            <div className="text">
              <div className="title">{title}</div>
              {sub && <div className="sub">{sub}</div>}
            </div>

            {/* Optional CTA */}
            {cta && url && (
              <div className="right">
                <a className="cta" href={url} target="_blank" rel="noreferrer">
                  {cta} →
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        /* Total page stays transparent */
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
      `}</style>

      <style jsx>{`
        .ribbon {
          width: var(--w);
          height: var(--h);
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 18px;
          border-radius: var(--r);
          padding: 0 var(--px);
          pointer-events: none; /* entire overlay non-interactive by default */

          /* Cinematic glass + gradient flames */
          background:
            radial-gradient(120% 180% at 10% 20%, rgba(255,140,70,.18), transparent 60%),
            radial-gradient(140% 180% at 90% 0%, rgba(255,220,120,.12), transparent 60%),
            linear-gradient(180deg, rgba(18,14,12,var(--op)), rgba(14,12,10,var(--op)));
          backdrop-filter: blur(var(--blur));
          -webkit-backdrop-filter: blur(var(--blur));
          border: 1px solid rgba(255, 230, 200, 0.22);
          box-shadow:
            0 28px 70px rgba(0,0,0,.55),
            inset 0 0 60px rgba(255,190,120,.07);

          position: relative;
          overflow: hidden;
        }

        /* Ember shimmer pass */
        .ribbon::after {
          content: '';
          position: absolute;
          inset: -40%;
          background:
            radial-gradient(120px 120px at 20% 30%, rgba(255,180,90,.18), transparent 60%),
            radial-gradient(160px 160px at 80% 70%, rgba(255,120,90,.14), transparent 60%);
          animation: ember 5.2s ease-in-out infinite alternate;
          pointer-events: none;
        }

        @keyframes ember {
          0%   { transform: translateX(-3%) translateY(-2%) rotate(0deg);   opacity: .75; }
          100% { transform: translateX(3%)  translateY(2%)  rotate(2deg);   opacity: .95; }
        }

        .left {
          display: flex;
          align-items: center;
          gap: 12px;
          pointer-events: none;
        }

        .live {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 999px;
          background: rgba(80, 18, 18, .78);
          border: 1px solid rgba(255, 140, 140, .38);
          color: #ffd7c9;
          font-weight: 900;
          font-size: 13px;
          letter-spacing: .4px;
          text-transform: uppercase;
          filter: drop-shadow(0 0 8px rgba(255,70,70,.35));
        }

        .dot {
          width: 10px; height: 10px; border-radius: 999px;
          background: #ff4747; box-shadow: 0 0 14px #ff4747;
          animation: pulse 1.4s ease-in-out infinite;
        }
        @keyframes pulse {
          0% { transform: scale(1);   opacity: .85; }
          50%{ transform: scale(1.25);opacity: 1; }
          100%{transform: scale(1);  opacity: .85; }
        }

        .text {
          min-width: 0;
          display: grid;
          gap: 6px;
          pointer-events: none;
        }

        .title {
          font-weight: 1000;
          font-size: clamp(22px, 2.8vw, 38px);
          letter-spacing: .2px;
          color: #fff2dd;
          text-shadow:
            0 0 22px rgba(255,200,120,.32),
            0 1px 0 rgba(0,0,0,.5);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .sub {
          font-weight: 700;
          font-size: clamp(12px, 1.5vw, 18px);
          color: #ffdcb0;
          opacity: .96;
          text-shadow: 0 0 10px rgba(255,180,90,.25);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .right { pointer-events: auto; } /* allow clicking CTA only */
        .cta {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          font-weight: 900;
          font-size: 14px;
          text-decoration: none;
          color: #1a120c;
          background: linear-gradient(180deg, #ffdca0, #ffb86b);
          box-shadow:
            0 8px 24px rgba(255, 180, 90, .3),
            inset 0 0 12px rgba(255,255,255,.25);
          border: 1px solid rgba(60, 40, 20, .18);
          transition: transform .12s ease, box-shadow .12s ease;
          pointer-events: auto;  /* clickable */
        }
        .cta:hover { transform: translateY(-1px); box-shadow:
          0 10px 28px rgba(255, 180, 90, .38),
          inset 0 0 14px rgba(255,255,255,.28); }
        .cta:active { transform: translateY(0); }
      `}</style>
    </>
  );
}
