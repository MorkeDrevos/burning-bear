'use client';

import React, { useEffect, useState } from 'react';

export default function Tease() {
  const [qs, setQs] = useState<URLSearchParams | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [target, setTarget] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const q = new URLSearchParams(window.location.search);
      setQs(q);
      const t = q.get('t');
      if (t) setTarget(Date.parse(t));

      // 🔥 Hide any visible H1 on the page
      const h1 = document.querySelector('h1');
      if (h1) {
        (h1 as HTMLElement).style.opacity = '0';
        (h1 as HTMLElement).style.visibility = 'hidden';
      }
    }

    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Countdown
  const remaining = target ? Math.max(0, target - now) : 0;
  const fmt = (ms: number) => {
    const s = Math.floor(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  // Params
  const title = (qs?.get('title') ?? "🔥 Something’s heating up at the Campfire…").trim();
  const sub   = (qs?.get('sub') ?? "Stay near the flames.").trim();
  const note  = (qs?.get('note') ?? "More surprises await...").trim();
  const live  = (qs?.get('live') ?? '1') === '1';
  const align = (qs?.get('align') ?? 'center') as 'left'|'center'|'right';
  const y     = Number(qs?.get('y') ?? 31);
  const w     = Number(qs?.get('w') ?? 1400);
  const h     = Number(qs?.get('h') ?? 120);
  const blur  = Number(qs?.get('blur') ?? 14);
  const op    = Math.max(0, Math.min(1, Number(qs?.get('op') ?? 0.92)));
  const radius= Number(qs?.get('r') ?? 24);
  const padX  = Number(qs?.get('px') ?? 24);

  const container: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 999999, pointerEvents: 'none', background: 'transparent'
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
            
            <div className="left">
              {live && (
                <span className="live">
                  <span className="dot" />
                  LIVE IN {fmt(remaining)}
                </span>
              )}
            </div>

            <div className="text">
              <div className="title">{title}</div>
              <div className="sub">{sub}</div>
              <div className="note">{note}</div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
      `}</style>

      <style jsx>{`
        .ribbon {
          width: var(--w);
          height: var(--h);
          display: grid;
          grid-template-columns: auto 1fr;
          align-items: center;
          gap: 18px;
          border-radius: var(--r);
          padding: 0 var(--px);
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(18,14,12,var(--op)), rgba(14,12,10,var(--op))),
            radial-gradient(120% 180% at 10% 20%, rgba(255,140,70,.18), transparent 60%);
          backdrop-filter: blur(var(--blur));
          border: 1px solid rgba(255, 230, 200, 0.22);
          box-shadow:
            0 28px 70px rgba(0,0,0,.55),
            inset 0 0 60px rgba(255,190,120,.07);
          overflow: hidden;
        }

        .live {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(80,18,18,.78);
          border: 1px solid rgba(255,140,140,.38);
          color: #ffd7c9;
          font-weight: 900;
          font-size: 14px;
          letter-spacing: .4px;
          text-transform: uppercase;
        }

        .dot {
          width: 10px; height: 10px; border-radius: 999px;
          background: #ff4747; box-shadow: 0 0 14px #ff4747;
          animation: pulse 1.4s ease-in-out infinite;
        }

        @keyframes pulse {
          0% { transform: scale(1); opacity: .85; }
          50% { transform: scale(1.25); opacity: 1; }
          100% { transform: scale(1); opacity: .85; }
        }

        .text { display: grid; gap: 4px; }
        .title {
          font-weight: 1000;
          font-size: clamp(22px, 2.8vw, 36px);
          color: #fff2dd;
          text-shadow: 0 0 22px rgba(255,200,120,.32);
        }
        .sub {
          font-weight: 700;
          font-size: clamp(13px, 1.5vw, 18px);
          color: #ffdcb0;
        }
        .note {
          font-weight: 600;
          font-size: 13px;
          color: rgba(255, 236, 210, .75);
        }
      `}</style>
    </>
  );
}
