'use client';

import React, { useEffect, useMemo, useState } from 'react';

// Tiny countdown
function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`;
}

export default function RolloverBanner() {
  // Params:
  // ?deadline=ms_since_epoch (preferred)
  // OR ?mins=5 (countdown from now)
  // ?msg=custom%20label
  // ?top=1  (top-center)  | default: top-center anyway
  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const nowMs = Date.now();
  const deadlineParam = Number(sp.get('deadline'));
  const minsParam = Number(sp.get('mins')) || 5;
  const baseDeadline = Number.isFinite(deadlineParam) && deadlineParam > nowMs
    ? deadlineParam
    : nowMs + minsParam * 60_000;

  const [now, setNow] = useState(nowMs);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const remain = Math.max(0, baseDeadline - now);
  const done = remain === 0;

  const msg = sp.get('msg') ||
    'Unclaimed prize rolls to the next Campfire in';

  const barStyle: React.CSSProperties = useMemo(() => ({
    position: 'fixed',
    zIndex: 60,
    left: '50%',
    top: 16,
    transform: 'translateX(-50%)',
  }), []);

  return (
    <div style={barStyle} aria-live="polite">
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 12,
          padding: '10px 14px',
          borderRadius: 16,
          background: 'rgba(8,12,10,.70)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,200,120,.25)',
          boxShadow: '0 8px 28px rgba(0,0,0,.45), 0 0 24px rgba(255,190,80,.18)',
          color: '#ffe6bb',
          fontWeight: 800,
          fontSize: 15,
          letterSpacing: .2,
          textShadow: '0 0 8px rgba(255,180,80,.18)',
        }}
      >
        <span style={{fontSize: 18}}>🔥</span>
        <span>{done ? 'Rolling to next Campfire now…' : msg}</span>
        {!done && (
          <span
            style={{
              padding: '6px 10px',
              borderRadius: 10,
              border: '1px solid rgba(255,220,150,.25)',
              background: 'linear-gradient(180deg,rgba(255,210,120,.16),rgba(255,180,70,.08))',
              color: '#ffe4b0',
              fontVariantNumeric: 'tabular-nums',
            }}
            aria-label="Time remaining"
          >
            {fmt(remain)}
          </span>
        )}
      </div>
    </div>
  );
}
