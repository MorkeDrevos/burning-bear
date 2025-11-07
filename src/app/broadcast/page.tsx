'use client';

import Link from 'next/link';

export default function BroadcastIndex() {
  const box = {
    padding: '60px',
    fontFamily: 'Inter, sans-serif',
    color: '#fff',
    background: '#0e0b08',
    minHeight: '100vh',
  };

  const links = [
    { name: '🔥 Tease Overlay', href: '/broadcast/tease?live=1&in=10m' },
    { name: '🏕️ Lower / Campfire Overlay', href: '/broadcast/lower?on=1&reward=1000000&now=Haunted%20Forest%7CThe%20Bear&ticker=Next%20burn%20~%203h;Campfire%20Bonus%20live;Follow%20%40burningbearcamp' },
  ];

  return (
    <div style={box}>
      <h1 style={{ fontSize: '2.2rem', marginBottom: '1rem' }}>🎥 Burning Bear — Livestream Overlays</h1>
      <p style={{ marginBottom: '2rem', opacity: 0.8 }}>Click any overlay below to preview live:</p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: '12px' }}>
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} target="_blank" style={{
              display: 'block',
              padding: '16px 20px',
              background: 'rgba(255,200,120,0.08)',
              border: '1px solid rgba(255,200,120,0.15)',
              borderRadius: '12px',
              color: '#ffeccc',
              textDecoration: 'none',
              fontWeight: 600
            }}>
              {l.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
