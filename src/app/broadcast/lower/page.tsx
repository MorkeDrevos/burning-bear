'use client';

import React from 'react';

// Helper: parse query safely
function useQuery() {
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  React.useEffect(() => {
    if (typeof window !== 'undefined') setQs(new URLSearchParams(window.location.search));
  }, []);
  return qs;
}

export default function LowerOverlay() {
  const qs = useQuery();

  const lower = qs?.get('lower') ?? 'Campfire Bonus | Round 1';
  const reward = qs?.get('reward') ?? '1,000,000';
  const now = qs?.get('now') ?? 'Haunted Forest | The Bear';
  const ticker = qs?.get('ticker')?.split(';') ?? [
    'Next burn ~ 3h',
    'Campfire Bonus live',
    'Follow @burningbearcamp',
  ];

  const root: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: '6vh',
    background: 'transparent',
    pointerEvents: 'none',
    fontFamily: 'Inter, sans-serif',
    zIndex: 999999,
  };

  const panel: React.CSSProperties = {
    background:
      'linear-gradient(180deg, rgba(255,80,40,0.25) 0%, rgba(0,0,0,0.7) 100%)',
    border: '2px solid rgba(255,190,70,0.35)',
    borderRadius: '18px',
    boxShadow:
      '0 0 25px rgba(255,80,40,0.45), inset 0 0 35px rgba(255,220,160,0.15)',
    padding: '22px 38px',
    maxWidth: '1200px',
    width: '90%',
    textAlign: 'center',
    color: '#fffbe8',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
  };

  const title: React.CSSProperties = {
    fontSize: 'clamp(24px, 3vw, 36px)',
    fontWeight: 900,
    letterSpacing: '0.5px',
    background:
      'linear-gradient(90deg, #ffb347, #ff7e5f, #ffd452, #fff8c1)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 15px rgba(255,160,80,0.5)',
  };

  const prize: React.CSSProperties = {
    fontSize: 'clamp(42px, 6vw, 64px)',
    fontWeight: 900,
    marginTop: '10px',
    background: 'linear-gradient(90deg, #fff1c1, #ffdb7e, #ffe98c)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    textShadow: '0 0 25px rgba(255,190,90,0.4)',
  };

  const sub: React.CSSProperties = {
    marginTop: '10px',
    fontSize: 'clamp(16px, 2vw, 22px)',
    color: '#ffd8b1',
    textShadow: '0 0 10px rgba(255,130,60,0.4)',
  };

  const tickerBar: React.CSSProperties = {
    display: 'flex',
    gap: '30px',
    justifyContent: 'center',
    marginTop: '18px',
    fontSize: 'clamp(14px, 1.8vw, 18px)',
    color: 'rgba(255,245,220,0.85)',
    fontWeight: 500,
  };

  return (
    <>
      <div style={root}>
        <div style={panel}>
          <div style={title}>🔥🔥🔥 {lower}</div>
          <div style={prize}>🏆 WIN {reward} $BBURN</div>
          <div style={sub}>🪶 {now}</div>
          <div style={tickerBar}>
            {ticker.map((t, i) => (
              <span key={i}>{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Transparent background enforcement */}
      <style jsx global>{`
        html,
        body,
        #__next,
        :root {
          background: transparent !important;
        }
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
      `}</style>
    </>
  );
}
