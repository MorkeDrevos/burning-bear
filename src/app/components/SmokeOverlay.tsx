'use client';
import React from 'react';

type Density = 'light' | 'medium' | 'heavy';
type Area = 'top' | 'bottom' | 'full';

export default function SmokeOverlay({
  density = 'light',
  area = 'full',
  plumes = 8,
  className = '',
  style,
}: {
  density?: Density;
  area?: Area;
  plumes?: number;           // how many puffs
  className?: string;        // ✅ allow callers to position/stack
  style?: React.CSSProperties;
}) {
  // map density → overall opacity multiplier
  const baseOpacity =
    density === 'light' ? 0.14 : density === 'medium' ? 0.22 : 0.32;

  // map area → vertical coverage
  const areaClass =
    area === 'top' ? 'top-0 h-1/2' : area === 'bottom' ? 'bottom-0 h-1/2' : 'inset-0';

  // deterministic plumes per render
  const items = Array.from({ length: plumes });

  return (
    <div
      className={`smoke-overlay absolute ${areaClass} ${className}`}
      aria-hidden="true"
      style={{ opacity: baseOpacity, ...style }}
    >
      {items.map((_, i) => {
        // stylized randomness
        const delay = (i * 0.6) % 5;                    // 0..5s stagger
        const size = 120 + ((i * 37) % 80);             // 120..200px
        const leftPct = 20 + ((i * 17) % 60);           // 20%..80%
        const bottom = area === 'top' ? 0 : 6 + ((i * 13) % 24); // start height
        const rise = 9 + ((i * 7) % 6);                 // 9..15s
        const sway = 5 + ((i * 5) % 5);                 // 5..10s
        const blur = 14 + ((i * 9) % 10);               // 14..24px
        const driftX = -18 + ((i * 11) % 36);           // -18..18px

        return (
          <span
            key={i}
            className="smoke-plume"
            style={
              {
                '--delay': `${delay}s`,
                '--size': `${size}px`,
                '--left': `${leftPct}%`,
                '--bottom': `${bottom}px`,
                '--rise': `${rise}s`,
                '--sway': `${sway}s`,
                '--blur': `${blur}px`,
                '--drift-x': `${driftX}px`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
