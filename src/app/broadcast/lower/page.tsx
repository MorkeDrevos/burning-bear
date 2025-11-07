'use client';

import React from 'react';

export default function Lower() {
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  React.useEffect(() => {
    if (typeof window !== 'undefined') setQs(new URLSearchParams(window.location.search));
  }, []);

  const lower = qs?.get('lower')?.replace('|', ' | ') ?? 'Campfire Bonus | Round 1';
  const reward = qs?.get('reward') ?? '1,000,000';
  const now = qs?.get('now')?.replace('|', ' | ') ?? 'Haunted Forest | The Bear';
  const ticker = (qs?.get('ticker') ?? 'Next burn ~ 3h; Campfire Bonus live; Follow @burningbearcamp')
    .split(';')
    .map((t) => t.trim())
    .filter(Boolean);

  const y = Number(qs?.get('y') ?? 82);
  const w = Number(qs?.get('w') ?? 1180);
  const tone = qs?.get('tone') ?? 'amber';

  const bgColor = tone === 'amber'
    ? 'rgba(35,25,10,0.85)'
    : 'rgba(45,15,15,0.85)';
  const borderColor = tone === 'amber'
    ? 'rgba(255,200,120,0.25)'
    : 'rgba(255,150,150,0.25)';

  const container: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    background: 'transparent',
    zIndex: 99999,
    pointerEvents: 'none',
  };

  const box: React.CSSProperties = {
    marginTop: `${y}vh`,
    width: 'min(96vw, ' + w + 'px)',
    padding: '20px 28px',
    borderRadius: 22,
    background: bgColor,
    border: `1px solid ${borderColor}`,
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    boxShadow: '0 12px 40px rgba(0,0,0,.55)',
    color: '#fff2d8',
    fontFamily: 'Inter, sans-serif',
  };

  const title: React.CSSProperties = {
    fontSize: '1.8rem',
    fontWeight: 800,
    marginBottom: 4,
    letterSpacing: '-0.3px',
  };

  const subtitle: React.CSSProperties = {
    fontSize: '1.1rem',
    opacity: 0.95,
  };

  const tickerWrap: React.CSSProperties = {
    marginTop: 10,
    fontSize: '1rem',
    opacity: 0.75,
    display: 'flex',
    gap: 20,
    animation: 'ticker 25s linear infinite',
  };

  return (
    <>
      <div style={container}>
        <div style={box}>
          <div style={title}>🔥🔥🔥 {lower}</div>
          <div style={subtitle}>
            💰 Reward: {Number(reward).toLocaleString()} BBURN<br />
            🪵 Now: {now}
          </div>
          <div style={tickerWrap}>
            {ticker.map((t, i) => (
              <span key={i}>• {t}</span>
            ))}
          </div>
        </div>
      </div>

      <style jsx global>{`
        html, body, #__next, :root {
          background: transparent !important;
          margin: 0;
          padding: 0;
          overflow: hidden;
        }
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
      `}</style>
    </>
  );
}
