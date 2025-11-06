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
  plumes?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  // Stronger by default so it’s clearly visible on stream
  const baseOpacity =
    density === 'light' ? 0.35 :
    density === 'medium' ? 0.50 :
    0.70;

  const areaClass =
    area === 'top' ? 'top-0 h-1/2' :
    area === 'bottom' ? 'bottom-0 h-1/2' :
    'inset-0';

  const items = Array.from({ length: plumes });

  return (
    <div
      className={`smoke-overlay absolute ${areaClass} pointer-events-none ${className}`}
      aria-hidden="true"
      style={{ opacity: baseOpacity, ...style }}
    >
      {items.map((_, i) => {
        const delay = (i * 0.6) % 5;              // 0..5s
        const size = 140 + ((i * 37) % 120);      // 140..260px
        const leftPct = 12 + ((i * 17) % 76);     // 12%..88%
        const bottom = area === 'top' ? 0 : 6 + ((i * 13) % 24);
        const rise = 10 + ((i * 7) % 7);          // 10..17s
        const sway = 5 + ((i * 5) % 6);           // 5..11s
        const blur = 16 + ((i * 9) % 12);         // 16..28px
        const driftX = -22 + ((i * 11) % 44);     // -22..22px

        return (
          <span
            key={i}
            className="smoke-plume"
            style={
              {
                // CSS vars for the keyframed styles below
                ['--delay' as any]: `${delay}s`,
                ['--size' as any]: `${size}px`,
                ['--left' as any]: `${leftPct}%`,
                ['--bottom' as any]: `${bottom}px`,
                ['--rise' as any]: `${rise}s`,
                ['--sway' as any]: `${sway}s`,
                ['--blur' as any]: `${blur}px`,
                ['--drift-x' as any]: `${driftX}px`,
              } as React.CSSProperties
            }
          />
        );
      })}

      <style jsx>{`
        .smoke-overlay { position: absolute; left: 0; right: 0; }
        .smoke-plume {
          position: absolute;
          left: var(--left);
          bottom: var(--bottom);
          width: var(--size);
          height: var(--size);
          border-radius: 9999px;
          filter: blur(var(--blur));
          opacity: 0.95;
          background: radial-gradient(
            circle at 50% 60%,
            rgba(255, 230, 200, 0.15),
            rgba(220, 170, 110, 0.10) 35%,
            rgba(40, 30, 20, 0.00) 70%
          );
          animation:
            rise var(--rise) linear var(--delay) infinite,
            sway var(--sway) ease-in-out var(--delay) infinite;
        }

        @keyframes rise {
          0%   { transform: translate3d(0, 0, 0) scale(1);   opacity: .0; }
          8%   { opacity: .8; }
          75%  { opacity: .8; }
          100% { transform: translate3d(var(--drift-x), -90vh, 0) scale(1.15); opacity: 0; }
        }
        @keyframes sway {
          0%   { transform: translateX(0); }
          50%  { transform: translateX(calc(var(--drift-x) * 0.6)); }
          100% { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
