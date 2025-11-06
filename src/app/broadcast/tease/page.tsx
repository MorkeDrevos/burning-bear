'use client';

import React from 'react';

type Schedule = {
  burnIntervalMinutes?: number;
  burnIntervalMs?: number;
  nextBurnAt?: number;
  lastBurnAt?: number;
};
type StateJson = { schedule?: Schedule };

export default function Tease() {
  const [now, setNow] = React.useState(Date.now());
  const [target, setTarget] = React.useState<number | null>(null);

  // ---- Query params (safe for SSR) -----------------------------------------
  const params =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  const mode  = (params?.get('mode')  || 'banner') as 'banner' | 'center';
  const align = (params?.get('align') || 'center') as 'left' | 'center' | 'right';
  const pos   = (params?.get('pos')   || (mode === 'banner' ? 'top' : 'center')) as
    | 'top' | 'bottom' | 'center';
  const m     = Number(params?.get('m') || 24);
  const title = params?.get('title') || `Something’s heating up at the Campfire…`;
  const icon  = params?.get('icon')  || '🎥';

  // ---- Ticker clock --------------------------------------------------------
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ---- Helpers -------------------------------------------------------------
  function rollForward(next: number, intervalMs: number, nowTs: number) {
    if (!Number.isFinite(next) || !Number.isFinite(intervalMs) || intervalMs <= 0) return null;
    if (nowTs <= next) return next;
    const k = Math.ceil((nowTs - next) / intervalMs);
    return next + k * intervalMs;
  }

  // ---- Load /data/state.json & lock to next burn --------------------------
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' });
        const d: StateJson = await r.json();
        if (!alive) return;

        const s = d?.schedule ?? {};
        const burnIntervalMs =
          typeof s.burnIntervalMs === 'number'
            ? s.burnIntervalMs
            : typeof s.burnIntervalMinutes === 'number'
            ? s.burnIntervalMinutes * 60_000
            : undefined;

        const nowTs = Date.now();

        let next: number | null = typeof s.nextBurnAt === 'number' ? s.nextBurnAt : null;
        if (next == null && typeof s.lastBurnAt === 'number' && burnIntervalMs) {
          next = s.lastBurnAt + burnIntervalMs;
        }

        if (next != null && burnIntervalMs) {
          setTarget(rollForward(next, burnIntervalMs, nowTs) ?? next);
        } else {
          setTarget(next ?? null);
        }
      } catch {/* silent */}
    };

    load();
    const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // ---- Format countdown ----------------------------------------------------
  const remainingMs = target != null ? target - now : Number.POSITIVE_INFINITY;
  const fmt = (ms: number) => {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`;
  };

  // ---- Shared styles -------------------------------------------------------
  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  // banner container (top/bottom)
  const barWrap: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    top: pos === 'top' ? m : 'auto',
    bottom: pos === 'bottom' ? m : 'auto',
    display: 'flex',
    justifyContent: justify,
    pointerEvents: 'none',
    zIndex: 99999,
  };

  // center card container
  const centerWrap: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
    zIndex: 99999,
  };

  // glass token: subtle blur, warm tint, no hard block of content
  const glass: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 12,
    padding: mode === 'banner' ? '10px 16px' : '18px 22px',
    borderRadius: 14,
    border: '1px solid rgba(255,220,160,.22)',
    background:
      'linear-gradient(180deg, rgba(20,16,10,.58), rgba(17,13,9,.52))',
    backdropFilter: 'blur(10px)',
    boxShadow:
      '0 10px 30px rgba(0,0,0,.35), inset 0 0 30px rgba(255,180,70,.08)',
    pointerEvents: 'none',
  };

  const headTxt: React.CSSProperties = {
    fontWeight: 900,
    letterSpacing: '.2px',
    color: '#ffe7c3',
    textShadow: '0 0 22px rgba(255,190,90,.22)',
    fontSize: mode === 'banner' ? '18px' : '22px',
    whiteSpace: 'nowrap',
  };

  const subTxt: React.CSSProperties = {
    fontWeight: 700,
    color: '#ffdca0',
    textShadow: '0 0 10px rgba(255,160,70,.25)',
    fontSize: mode === 'banner' ? '15px' : '17px',
    whiteSpace: 'nowrap',
  };

  // ---- Render --------------------------------------------------------------
  const body = (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 14, ...glass }}>
      <span style={{ fontSize: mode === 'banner' ? 22 : 26 }}>{icon}</span>
      <span style={headTxt}>{title}</span>
      <span style={{ opacity: .5 }}>•</span>
      <span style={subTxt}>
        ⏳ Find out in{' '}
        <strong style={{ color: '#fff3d6' }}>
          {Number.isFinite(remainingMs) ? fmt(remainingMs) : '—'}
        </strong>
      </span>
    </div>
  );

  return (
    <>
      {mode === 'center' ? (
        <div style={centerWrap}>{body}</div>
      ) : (
        <div style={barWrap}>{body}</div>
      )}

      {/* global transparency + safe page reset */}
      <style jsx global>{`
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin: 0 !important; padding: 0 !important; }
      `}</style>
    </>
  );
}
