'use client';
import React from 'react';

type Props = {
  density?: 'light' | 'medium' | 'heavy';
  area?: 'full' | 'top' | 'bottom';
};

export default function SmokeOverlay({ density = 'light', area = 'full' }: Props) {
  // how many plumes
  const count = density === 'heavy' ? 24 : density === 'medium' ? 16 : 10;

  // vertical zone
  const zone = area === 'top' ? { min: 40, max: 150 }
            : area === 'bottom' ? { min: 0,  max: 80  }
            : { min: 0, max: 160 };

  return (
    <div className="smoke-overlay">
      {Array.from({ length: count }).map((_, i) => {
        const left = Math.random() * 100;                 // 0..100 vw%
        const bottom = zone.min + Math.random() * (zone.max - zone.min);
        const size = 120 + Math.round(Math.random() * 120); // 120..240
        const blur = 12 + Math.round(Math.random() * 10);   // 12..22
        const delay = Math.random() * 8;                    // 0..8s
        const rise = 9 + Math.random() * 6;                 // 9..15s
        const sway = 5 + Math.random() * 4;                 // 5..9s
        const drift = (Math.random() - 0.5) * 90;           // -45..45 px

        return (
          <span
            key={i}
            className="smoke-plume"
            style={{
              // @ts-ignore custom props
              '--left': `${left}%`,
              '--bottom': `${bottom}px`,
              '--size': `${size}px`,
              '--blur': `${blur}px`,
              '--delay': `${delay}s`,
              '--rise': `${rise}s`,
              '--sway': `${sway}s`,
              '--drift-x': `${drift}px`,
            } as React.CSSProperties}
          />
        );
      })}
    </div>
  );
}
