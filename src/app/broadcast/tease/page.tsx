'use client';

import React from 'react';

/**
 * The Burning Bear — Broadcast Tease Overlay
 *
 * URL controls (all optional):
 *   title    = main line (default: "🔥 Something’s heating up at the Campfire…")
 *   sub      = small line under title
 *   live     = 1 to show the red LIVE pill
 *
 *   // separate "Live in" countdown (NOT the burn timer)
 *   revealAt / at = ISO 8601 string or epoch ms (e.g., 2025-11-06T11:45:00Z)
 *   revealIn / in = duration like "10m", "1h20m", "45s", "1h", "90m30s"
 *
 *   // layout & aesthetics
 *   y       = vertical position in vh (center of the plate)   (default 60)
 *   w       = inner plate max width in px                     (default 980)
 *   h       = plate height px                                 (default 96)
 *   op      = plate bg opacity [0..1]                         (default .86)
 *   blur    = backdrop blur px                                (default 10)
 *   r       = border radius px                                (default 16)
 *   align   = left|center|right                               (default center)
 *
 *   // alignment with site container
 *   wrap    = outer content width to match (px)               (default 1180)
 *   dx      = horizontal nudge px (+ right, - left)           (default 0)
 *   pad     = inner side padding px                           (default 22)
 *
 *   // extras
 *   roll    = 1 to show rollover strip                        (default 1)
 *   curtain = 1 to draw a soft dim bar behind the plate       (default 0)
 *   ca      = curtain alpha [0..1]                            (default .25)
 *   cblur   = curtain blur px                                 (default 2)
 */

export default function Tease() {
  const [qs, setQs] = React.useState<URLSearchParams | null>(null);
  const [now, setNow] = React.useState<number>(Date.now());
  const [revealTarget, setRevealTarget] = React.useState<number | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setQs(new URLSearchParams(window.location.search));
    }
  }, []);

  // tick clock for countdown
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // ---- helpers
  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  function parseDuration(str: string): number | null {
    // supports "1h20m30s", "90m", "45s", "2h"
    const re = /(\d+)(h|m|s)/gi;
    let m: RegExpExecArray | null;
    let total = 0;
    let hits = 0;
    while ((m = re.exec(str))) {
      const n = Number(m[1]);
      const u = m[2].toLowerCase();
      if (u === 'h') total += n * 3600;
      else if (u === 'm') total += n * 60;
      else if (u === 's') total += n;
      hits++;
    }
    return hits ? total * 1000 : null;
  }

  function fmtHMS(ms: number): string {
    const t = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(t / 3600);
    const m = Math.floor((t % 3600) / 60);
    const s = t % 60;
    return `${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }

  // ---- query params (safe defaults)
  const title =
    (qs?.get('title') ?? "🔥 Something’s heating up at the Campfire…").trim();
  const sub = (qs?.get('sub') ?? '').trim();
  const livePill = (qs?.get('live') ?? '1') === '1';

  // aliases for the *separate* go-live countdown
  const revealAt = qs?.get('revealAt') ?? qs?.get('at');
  const revealIn = qs?.get('revealIn') ?? qs?.get('in');

  const bandTopVh = Number(qs?.get('y') ?? 60);
  const plateW = Number(qs?.get('w') ?? 980);
  const plateH = Number(qs?.get('h') ?? 96);
  const opacity = clamp01(Number(qs?.get('op') ?? 0.86));
  const blur = Number(qs?.get('blur') ?? 10);
  const radius = Number(qs?.get('r') ?? 16);
  const align = (qs?.get('align') ?? 'center') as 'left' | 'center' | 'right';

  const wrapW = Number(qs?.get('wrap') ?? 1180);
  const dx = Number(qs?.get('dx') ?? 0);
  const pad = Number(qs?.get('pad') ?? 22);

  const showRollover = (qs?.get('roll') ?? '1') === '1';
  const curtain = (qs?.get('curtain') ?? '0') === '1';
  const curtainAlpha = clamp01(Number(qs?.get('ca') ?? 0.25));
  const curtainBlur = Number(qs?.get('cblur') ?? 2);

  // compute reveal target
  React.useEffect(() => {
    // Note: guard SSR
    if (!revealAt && !revealIn) {
      setRevealTarget(null);
      return;
    }

    // "in" has priority if both provided
    if (revealIn) {
      const dur = parseDuration(revealIn);
      if (dur != null) {
        setRevealTarget(Date.now() + dur);
        return;
      }
    }

    if (revealAt) {
      // accept epoch ms or ISO
      const n = Number(revealAt);
      if (Number.isFinite(n) && n > 0) {
        setRevealTarget(n);
      } else {
        const d = new Date(revealAt);
        if (!Number.isNaN(d.getTime())) {
          setRevealTarget(d.getTime());
        } else {
          setRevealTarget(null);
        }
      }
    }
  }, [revealAt, revealIn]);

  const remainingReveal = revealTarget != null ? revealTarget - now : NaN;
  const hasCountdown = Number.isFinite(remainingReveal) && remainingReveal > 0;

  // ---- layout styles
  const container: React.CSSProperties = {
    position: 'fixed',
    inset: 0,
    pointerEvents: 'none',
    zIndex: 1_000_000,
    background: 'transparent',
  };

  const justify =
    align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

  const plateWrap: React.CSSProperties = {
    position: 'absolute',
    top: `${bandTopVh}vh`,
    left: '50%',
    transform: `translate(calc(-50% + ${dx}px), -50%)`,
    width: `min(96vw, ${wrapW}px)`,
    display: 'flex',
    justifyContent: justify,
  };

  const plate: React.CSSProperties = {
    width: `min(100%, ${plateW}px)`,
    height: plateH,
    borderRadius: radius,
    padding: `16px ${pad}px`,
    background: `rgba(12,10,8, ${opacity})`,
    border: '1px solid rgba(255,235,210,.16)',
    boxShadow:
      '0 22px 64px rgba(0,0,0,.55), inset 0 0 38px rgba(255,200,140,.06)',
    backdropFilter: `blur(${blur}px)`,
    WebkitBackdropFilter: `blur(${blur}px)`,
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    alignItems: 'center',
    gap: 14,
  };

  const livePillStyle: React.CSSProperties = {
    display: livePill ? 'inline-flex' : 'none',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 999,
    background: 'rgba(60,16,16,.78)',
    border: '1px solid rgba(255,120,120,.35)',
    color: '#ffd7c9',
    fontWeight: 900,
    fontSize: 13,
    lineHeight: 1,
    whiteSpace: 'nowrap',
    filter: 'drop-shadow(0 0 8px rgba(255,70,70,.35))',
  };

  const liveDot: React.CSSProperties = {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: '#ff4747',
    boxShadow: '0 0 14px #ff4747',
  };

  const liveClock: React.CSSProperties = {
    marginLeft: 8,
    padding: '6px 8px',
    borderRadius: 8,
    background: 'rgba(255,255,255,.08)',
    border: '1px solid rgba(255,255,255,.15)',
    fontWeight: 800,
    fontSize: 12,
    color: '#ffe7d6',
  };

  const titleStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 'clamp(18px, 2.2vw, 28px)',
    letterSpacing: '.2px',
    color: '#ffedd6',
    textShadow:
      '0 0 28px rgba(255,200,120,.28), 0 1px 0 rgba(0,0,0,.5)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const subStyle: React.CSSProperties = {
    gridColumn: '1 / -1',
    marginTop: 8,
    fontWeight: 700,
    fontSize: 12,
    color: '#ffe0bd',
    opacity: 0.9,
  };

  const rollStyle: React.CSSProperties = {
    gridColumn: '1 / -1',
    marginTop: 6,
    fontSize: 12,
    fontWeight: 700,
    color: '#ffcf9d',
    opacity: 0.85,
  };

  const curtainWrap: React.CSSProperties = {
    position: 'absolute',
    top: `${bandTopVh}vh`,
    left: '50%',
    transform: `translate(calc(-50% + ${dx}px), -50%)`,
    width: `min(96vw, ${wrapW}px)`,
    height: plateH,
    borderRadius: radius,
    background: `rgba(0,0,0,${curtainAlpha})`,
    filter: `blur(${curtainBlur}px)`,
  };

  return (
    <>
      <div style={container}>
        {/* optional dim bar */}
        {curtain && <div style={curtainWrap} />}

        {/* main plate */}
        <div style={plateWrap}>
          <div style={plate}>
            {/* LIVE + countdown */}
            <span style={livePillStyle}>
              <span style={liveDot} />
              LIVE
              {hasCountdown && (
                <span style={liveClock}>
                  in {fmtHMS(remainingReveal)}
                </span>
              )}
            </span>

            {/* Title */}
            <div style={titleStyle}>{title}</div>

            {/* Subtitle (optional) */}
            {sub && <div style={subStyle}>{sub}</div>}

            {/* Rollover strip (optional) */}
            {showRollover && (
              <div style={rollStyle}>
                ⏳ If the prize isn’t claimed in 5 minutes, it rolls over to the next Campfire round.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Force full transparency for OBS */}
      <style jsx global>{`
        html, body, #__next, :root { background: transparent !important; }
        html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; }
      `}</style>
    </>
  );
}
