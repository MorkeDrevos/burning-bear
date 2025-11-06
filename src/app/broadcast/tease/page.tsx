'use client';

import React from 'react';

/* ========= Types ========= */
type Schedule = {
  burnIntervalMinutes?: number;
  burnIntervalMs?: number;
  nextBurnAt?: number;
  lastBurnAt?: number;
};
type StateJson = { schedule?: Schedule };

/* ========= Helpers ========= */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const toMs = (mins?: number) =>
  typeof mins === 'number' ? mins * 60_000 : undefined;

function rollForward(next: number, intervalMs: number, nowTs: number) {
  if (!Number.isFinite(next) || !Number.isFinite(intervalMs) || intervalMs <= 0) return null;
  if (nowTs <= next) return next;
  const k = Math.ceil((nowTs - next) / intervalMs);
  return next + k * intervalMs;
}

function fmtHHMMSS(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
}

/* ========= Page ========= */
export default function Tease() {
  const [now, setNow] = React.useState<number>(Date.now());
  const [target, setTarget] = React.useState<number | null>(null);

  // Safe query parsing
  const qs = React.useMemo(
    () =>
      typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search)
        : new URLSearchParams(),
    []
  );

  // Modes & controls
  const mode = (qs.get('mode') || 'banner') as 'banner' | 'center';
  const pos = (qs.get('pos') || 'top') as 'top' | 'bottom';
  const align = (qs.get('align') || 'center') as 'left' | 'center' | 'right';
  const m = Number(qs.get('m') ?? 12); // margin
  const bg = (qs.get('bg') || 'solid') as 'glass' | 'solid';
  const alpha = clamp(Number(qs.get('alpha') ?? (mode === 'banner' ? 0.92 : 0.88)), 0, 1);
  const y = Number(qs.get('y') || 0); // vertical nudge
  const scale = Number(qs.get('scale') || 1);
  const icon = qs.get('icon') ?? '🎥';
  const title = qs.get('title') ?? "Something’s heating up at the Campfire…";

  // Clock
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Load schedule + compute next burn (and roll forward if stale)
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    let alive = true;

    const load = async () => {
      try {
        const r = await fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' });
        const d: StateJson = await r.json();
        if (!alive) return;

        const s = d?.schedule ?? {};
        const intervalMs =
          typeof s.burnIntervalMs === 'number'
            ? s.burnIntervalMs
            : toMs(s.burnIntervalMinutes);

        const nowTs = Date.now();
        let next: number | null =
          typeof s.nextBurnAt === 'number' ? s.nextBurnAt : null;

        if (next == null && typeof s.lastBurnAt === 'number' && intervalMs) {
          next = s.lastBurnAt + intervalMs;
        }
        if (next != null && intervalMs) {
          setTarget(rollForward(next, intervalMs, nowTs) ?? next);
        } else {
          setTarget(next ?? null);
        }
      } catch {
        /* swallow */
      }
    };

    load();
    const id = setInterval(load, 15_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const remainingMs = target != null ? target - now : Number.POSITIVE_INFINITY;

  /* ======= Styles ======= */
  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const bannerWrap: React.CSSProperties = {
    position: 'fixed',
    left: 0,
    right: 0,
    top: pos === 'top' ? m : 'auto',
    bottom: pos === 'bottom' ? m : 'auto',
    display: 'flex',
    justifyContent: justify,
    pointerEvents: 'none',
    zIndex: 99999,
    transform: `translateY(${y}px) scale(${scale})`,
    transformOrigin:
      align === 'left' ? 'left top' : align === 'right' ? 'right top' : 'center top',
  };

  const centerWrap: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    display: 'grid',
    placeItems: 'center',
    pointerEvents: 'none',
    zIndex: 99999,
    transform: `scale(${scale})`,
  };

  const card: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 14,
    padding: mode === 'banner' ? '12px 18px' : '22px 26px',
    borderRadius: 16,
    border: '1px solid rgba(255,220,160,.25)',
    background:
      bg === 'solid'
        ? `rgba(12,10,8,${alpha})`
        : `linear-gradient(180deg,
            rgba(20,16,10,${Math.max(alpha - 0.12, 0)}),
            rgba(17,13,9,${alpha})
          )`,
    backdropFilter: bg === 'solid' ? 'none' : 'blur(10px)',
    boxShadow:
      '0 16px 40px rgba(0,0,0,.55), inset 0 0 34px rgba(255,180,70,.08), 0 0 0 1px rgba(0,0,0,.28)',
    pointerEvents: 'none',
  };

  const headTxt: React.CSSProperties = {
    fontWeight: 900,
    letterSpacing: '.2px',
    color: '#ffe7c3',
    WebkitTextStroke: '1px rgba(0,0,0,.35)',
    textShadow:
      '0 2px 8px rgba(0,0,0,.55), 0 0 22px rgba(255,190,90,.22), 0 0 42px rgba(255,170,70,.18)',
    fontSize: mode === 'banner' ? 20 : 28,
    whiteSpace: 'nowrap',
    lineHeight: 1.2,
  };

  const subTxt: React.CSSProperties = {
    fontWeight: 800,
    color: '#ffdca0',
    WebkitTextStroke: '0.6px rgba(0,0,0,.35)',
    textShadow: '0 2px 6px rgba(0,0,0,.55), 0 0 14px rgba(255,160,70,.22)',
    fontSize: mode === 'banner' ? 16 : 18,
    whiteSpace: 'nowrap',
  };

  const timerTxt: React.CSSProperties = {
    color: '#fff3d6',
    WebkitTextStroke: '0.6px rgba(0,0,0,.3)',
    textShadow: '0 2px 6px rgba(0,0,0,.6), 0 0 12px rgba(255,210,120,.25)',
    fontWeight: 900,
  };

  const row: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };

  /* ======= UI ======= */
  const Pill = ({ children }: { children: React.ReactNode }) => (
    <span
      style={{
        marginLeft: 8,
        padding: '6px 10px',
        borderRadius: 999,
        border: '1px solid rgba(255,220,160,.25)',
        background: 'rgba(0,0,0,.35)',
        fontSize: 12,
        fontWeight: 800,
        color: '#ffe7c3',
        textShadow: '0 2px 4px rgba(0,0,0,.6)',
      }}
    >
      {children}
    </span>
  );

  const content = (
    <div style={card}>
      <div style={{ fontSize: mode === 'banner' ? 22 : 26, lineHeight: 1 }}> {icon} </div>
      <div style={row}>
        <div style={headTxt}>{title}</div>
        <div style={subTxt}>
          ⏳ Find out in{' '}
          <span style={timerTxt}>
            {Number.isFinite(remainingMs) ? fmtHHMMSS(remainingMs) : '—'}
          </span>
          {/* Optional timed badge in last 60s */}
          {Number.isFinite(remainingMs) && remainingMs <= 60_000 ? (
            <Pill>Rolls over if unclaimed</Pill>
          ) : null}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {mode === 'center' ? (
        <div style={centerWrap}>{content}</div>
      ) : (
        <div style={bannerWrap}>{content}</div>
      )}

      {/* Force full transparency for OBS */}
      <style jsx global>{`
        html,
        body,
        #__next,
        :root {
          background: transparent !important;
        }
        html,
        body {
          margin: 0 !important;
          padding: 0 !important;
          overflow: hidden !important;
        }
      `}</style>
    </>
  );
}
