'use client';

import { useEffect, useMemo, useState } from 'react';

export default function AlertToast() {
  const [visible, setVisible] = useState(false);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const show = params.get('show') === '1';
  const seconds = Math.max(1, Number(params.get('sec') ?? 4));
  const msg = params.get('msg') ?? '🔥 Burn Executed — Supply Down';

  useEffect(() => {
    if (!show) return;
    setVisible(true);
    const t = setTimeout(() => setVisible(false), seconds * 1000 + 300); // +exit anim
    return () => clearTimeout(t);
  }, [show, seconds]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        display: 'grid',
        placeItems: 'start center',
      }}
    >
      <div
        className="toast"
        style={{
          position: 'absolute',
          top: 24,
          padding: '10px 14px',
          borderRadius: 14,
          background: 'rgba(16, 12, 8, 0.72)',
          border: '1px solid rgba(255,200,120,.25)',
          color: '#ffe7b0',
          fontWeight: 800,
          letterSpacing: .2,
          boxShadow:
            '0 0 0 10px rgba(16,12,8,0.35), 0 10px 20px rgba(255,190,70,0.25)',
          transform: 'translateY(-16px)',
          animation: `toast-in 300ms ease-out forwards, toast-stay ${seconds}s linear 300ms, toast-out 280ms ease-in ${300 + seconds * 1000}ms forwards`,
        }}
      >
        {msg}
      </div>

      <style>{`
        @keyframes toast-in { to { opacity: 1; transform: translateY(0); } }
        @keyframes toast-stay { }
        @keyframes toast-out { to { opacity: 0; transform: translateY(-16px); } }
        .toast { opacity: 0; }
      `}</style>
    </div>
  );
}
