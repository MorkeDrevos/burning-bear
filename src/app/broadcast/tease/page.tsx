'use client';

import React, { useEffect, useState } from 'react';

export default function TeaseCard() {
  const [show, setShow] = useState(false); 

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 300);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'grid',
        placeItems: 'center',
        background: 'transparent',
        pointerEvents: 'none',
        zIndex: 99,
      }}
    >
      <div
        style={{
          opacity: show ? 1 : 0,
          transform: `scale(${show ? 1 : 1.05})`,
          transition: 'opacity 1.2s ease-out, transform 1.2s ease-out',
          textAlign: 'center',
        }}
      >
        <h1
          style={{
            fontSize: '2.8rem',
            fontWeight: 800,
            color: '#ffe8b0',
            textShadow: '0 0 20px rgba(255,150,50,.5)',
            marginBottom: '0.6em',
          }}
        >
          🎥 Something’s heating up at the Campfire…
        </h1>
        <p
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#ffdca0',
            textShadow: '0 0 10px rgba(255,160,70,.4)',
          }}
        >
          ⏳ Find out at <strong>12:00 Marbella time</strong>
        </p>
      </div>
    </div>
  );
}
