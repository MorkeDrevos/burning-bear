'use client';

import React, { useMemo } from 'react';

const JUP_URL =
  'https://jup.ag/swap?sell=So11111111111111111111111111111111111111112&buy=BXvBhz6Va2Ed8HnzMDChzHCTqKXLvJpGadfLhvK5pump';

export default function QRBuyOverlay() {
  // ?pos=br|bl|tr|tl  (default br)   ?size=200..420 (default 220)
  // ?label=Scan%20to%20Buy%20$BBURN (optional)
  const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
  const pos = (sp.get('pos') || 'br').toLowerCase();
  const size = Math.min(420, Math.max(140, Number(sp.get('size')) || 220));
  const label = sp.get('label') || 'Scan to Buy $BBURN';

  // simple placement map
  const anchor = useMemo(() => {
    const base: React.CSSProperties = { position: 'fixed', zIndex: 50 };
    const pad = 18;
    if (pos === 'tl') return { ...base, left: pad, top: pad };
    if (pos === 'tr') return { ...base, right: pad, top: pad };
    if (pos === 'bl') return { ...base, left: pad, bottom: pad };
    return { ...base, right: pad, bottom: pad }; // br
  }, [pos]);

  // lightweight QR (external image service)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(
    JUP_URL
  )}`;

  return (
    <div style={anchor}>
      <div
        style={{
          display: 'grid',
          gap: 8,
          placeItems: 'center',
          padding: 12,
          background: 'rgba(8,12,10,.6)',
          backdropFilter: 'blur(6px)',
          border: '1px solid rgba(255,220,150,.18)',
          borderRadius: 18,
          boxShadow:
            '0 8px 28px rgba(0,0,0,.45), 0 0 32px rgba(255,200,80,.18)',
        }}
      >
        <img
          src={qrSrc}
          alt="Buy $BBURN on Jupiter"
          width={size}
          height={size}
          style={{
            borderRadius: 12,
            background: 'rgba(255,255,255,.92)',
            display: 'block',
          }}
        />
        <a
          href={JUP_URL}
          target="_blank"
          rel="noreferrer"
          style={{
            fontWeight: 800,
            fontSize: 14,
            color: '#fed7a1',
            textDecoration: 'none',
            padding: '6px 10px',
            borderRadius: 10,
            border: '1px solid rgba(255,220,150,.22)',
            background: 'linear-gradient(180deg,rgba(255,200,90,.16),rgba(255,180,70,.08))',
          }}
          title="Open Jupiter swap"
        >
          {label}
        </a>
      </div>
    </div>
  );
}
