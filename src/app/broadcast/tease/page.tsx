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
const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

function fmtHMS(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  return `${h.toString()}h ${m.toString().padStart(2, '0')}m ${s
    .toString()
    .padStart(2, '0')}s`;
}

function rollForward(next: number, intervalMs: number, nowTs: number) {
  if (!Number.isFinite(next) || !Number.isFinite(intervalMs) || intervalMs <= 0)
    return null;
  if (nowTs <= next) return next;
  const k = Math.ceil((nowTs - next) / intervalMs);
  return next + k * intervalMs;
}

/* ========= Page ========= */
export default function Tease() {
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  const [now, setNow] = React.useState<number>(Date.now());
  const [target, setTarget] = React.useState<number | null>(null);

  // URL params (safe after mount)
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setQs(new URLSearchParams(window.location.search));
    }
  }, []);

  // Controls (with sensible defaults)
  const title =
    (qs?.get('title') ?? '🎥 Something’s heating up at the Campfire…').trim();
  const sub = (qs?.get('sub') ?? 'Stay near the flames.').trim();
  const note =
    (qs?.get('note') ??
      "If the prize isn’t claimed in 5 minutes, it rolls over to the next Campfire. 🔥").trim();

  const livePill = (qs?.get('live') ?? '1') === '1'; // show pill
  const align = (qs?.get('align') ?? 'center') as 'left' | 'center' | 'right';

  // Plate + position
  const bandTopVh = Number(qs?.get('y') ?? 62); // vertical position (vh)
  const plateW = Number(qs?.get('w') ?? 1180); // max width (px)
  const plateH = Number(qs?.get('h') ?? 116); // height (px)
  const opacity = clamp01(Number(qs?.get('op') ?? 0.92));
  const blur = Number(qs?.get('blur') ?? 14);
  const radius = Number(qs?.get('r') ?? 18);

  // Optional curtain to dim hero (helps hide H1 / CA)
  const useCurtain = (qs?.get('curtain') ?? '1') === '1';
  const coverH = Number(qs?.get('coverH') ?? 520); // height of dim area
  const cop = clamp01(Number(qs?.get('cop') ?? 0.70)); // opacity of curtain
  const fadeMs = Number(qs?.get('fadeMs') ?? 1200);

  // OPTIONAL explicit target override:
  //   ?at=2025-11-06T12:00:00Z  (ISO UTC)
  //   ?in=600  (seconds) or minutes if > 10? We'll treat as minutes when >= 60.
  const atParam = qs?.get('at');
  const inParam = qs?.get('in');

  // Ticker
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Resolve target time:
  // 1) explicit at/in
  // 2) from /data/state.json schedule (nextBurnAt or lastBurnAt + interval)
  React.useEffect(() => {
    let alive = true;

    async function resolveTarget() {
      // Explicit overrides first
      if (atParam) {
        const t = Date.parse(atParam);
        if (Number.isFinite(t)) {
          setTarget(t);
          return;
        }
      }
      if (inParam) {
        const n = Number(inParam);
        if (Number.isFinite(n) && n > 0) {
          // interpret >= 60 as minutes, otherwise seconds
          const ms = n >= 60 ? n * 60_000 : n * 1_000;
          setTarget(Date.now() + ms);
          return;
        }
      }

      // Else, load schedule
      try {
        const r = await fetch(`/data/state.json?t=${Date.now()}`, {
          cache: 'no-store',
        });
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
        let next: number | null =
          typeof s.nextBurnAt === 'number' ? s.nextBurnAt : null;

        if (next == null && typeof s.lastBurnAt === 'number' && burnIntervalMs) {
          next = s.lastBurnAt + burnIntervalMs;
        }
        if (next != null && burnIntervalMs) {
          const rolled = rollForward(next, burnIntervalMs, nowTs);
          setTarget(rolled ?? next);
        } else {
          setTarget(next ?? null);
        }
      } catch {
        // silent; keep target as-is
      }
    }

    resolveTarget();
    const id = setInterval(resolveTarget, 20_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [atParam, inParam]);

  const remainingMs = target != null ? target - now : Number.POSITIVE_INFINITY;
  const isLiveNow = Number.isFinite(remainingMs) && remainingMs <= 0;

  // ===== Styles =====
  const container: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 999999,
    background: 'transparent',
  };

  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const plateWrap: React.CSSProperties = {
    position: 'absolute',
    top: `${bandTopVh}vh`,
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(96vw, 1680px)',
    display: 'flex',
    justifyContent: justify,
  };

  const plate: React.CSSProperties = {
    width: `min(100%, ${plateW}px)`,
    height: plateH,
    borderRadius: radius,
    padding: '16px 22px',
    background: `rgba(12,10,8, ${opacity})`,
    border: '1px solid rgba(255,235,210,.16)',
    boxShadow:
      '0 22px 64px rgba(0,0,0,.55), inset 0 0 40px rgba(255,200,140,.06)',
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gridTemplateRows: 'auto auto',
    alignItems: 'center',
    columnGap: 14,
    rowGap: 6,
  };

  const pill: React.CSSProperties = {
    display: livePill ? 'inline-flex' : 'none',
    alignItems: 'center',
    gap: 10,
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(60,16,16,.80)',
    border: '1px solid rgba(255,120,120,.35)',
    color: '#ffd7c9',
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    filter: 'drop-shadow(0 0 8px rgba(255,70,70,.35))',
  };

  const dot: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: '#ff4747',
    boxShadow: '0 0 14px #ff4747',
    opacity: isLiveNow ? 1 : 0.9,
  };

  const headline: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 'clamp(18px, 2.2vw, 22px)',
    letterSpacing: '.2px',
    color: '#ffedd6',
    textShadow: '0 1px 0 rgba(0,0,0,.65)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  };

  const subline: React.CSSProperties = {
    gridColumn: '2 / span 1',
    fontWeight: 700,
    fontSize: 12,
    color: '#ffe8c9',
    opacity: 0.9,
  };

  const noteline: React.CSSProperties = {
    gridColumn: '2 / span 1',
    fontWeight: 600,
    fontSize: 11,
    color: '#e6c7a3',
    opacity: 0.85,
  };

  // Curtain strip to soften & hide H1/CA beneath
  const curtainWrap: React.CSSProperties = {
    position: 'absolute',
    top: `${bandTopVh - 8}vh`,
    left: 0,
    width: '100%',
    height: coverH,
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
    display: useCurtain ? 'block' : 'none',
  };

  const curtain: React.CSSProperties = {
    width: '100%',
    height: '100%',
    background: `linear-gradient(
      to bottom,
      rgba(8,6,5, ${cop}) 0%,
      rgba(8,6,5, ${Math.max(0, cop - 0.18)}) 60%,
      rgba(8,6,5, 0) 100%
    )`,
    borderTop: '1px solid rgba(255,235,210,.08)',
    borderBottom: '1px solid rgba(255,235,210,.05)',
    animation: `curtainFade ${fadeMs}ms ease both`,
  };

  return (
    <>
      <div style={container}>
        {/* Curtain to gently hide H1 / copy CA zone */}
        <div style={curtainWrap}>
          <div style={curtain} />
        </div>

        {/* Plate */}
        <div style={plateWrap}>
          <div style={plate}>
            {/* LIVE pill with countdown inside */}
            <span style={pill}>
              <span style={dot} />
              {isLiveNow ? (
                <>LIVE&nbsp;NOW</>
              ) : Number.isFinite(remainingMs) ? (
                <>LIVE&nbsp;in&nbsp;{fmtHMS(remainingMs)}</>
              ) : (
                <>LIVE</>
              )}
            </span>

            {/* Headline */}
            <div style={headline}>{title}</div>

            {/* Sub + note rows (optional) */}
            {sub && <div style={subline}>{sub}</div>}
            {note && <div style={noteline}>{note}</div>}
          </div>
        </div>
      </div>

      {/* Keep the whole overlay transparent */}
      <style jsx global>{`
        @keyframes curtainFade {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
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
