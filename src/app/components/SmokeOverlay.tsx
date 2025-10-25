'use client';
import React from 'react';

interface SmokeOverlayProps {
  density?: 'light' | 'medium' | 'heavy';
  area?: 'top' | 'bottom';
}

export default function SmokeOverlay({
  density = 'light',
  area = 'top',
}: SmokeOverlayProps) {
  const opacity =
    density === 'light' ? 'opacity-20' : density === 'medium' ? 'opacity-30' : 'opacity-40';

  const gradientDirection =
    area === 'top'
      ? 'bg-gradient-to-b from-white/10 via-white/5 to-transparent'
      : 'bg-gradient-to-t from-white/10 via-white/5 to-transparent';

  return (
    <div
      className={`pointer-events-none absolute inset-0 -z-10 mix-blend-screen ${opacity} ${gradientDirection} animate-smoke`}
    />
  );
}
