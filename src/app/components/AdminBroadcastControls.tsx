'use client';

import React, { useEffect, useMemo, useState } from 'react';

type StateJson = { schedule?: { nextBurnAt?: number } };

function parseHashQS(): URLSearchParams {
  const h = window.location.hash || '';
  return new URLSearchParams(h.split('?')[1] || '');
}

function setHashQS(qs: URLSearchParams) {
  // Always keep "#broadcast" prefix
  const s = qs.toString();
  window.location.hash = `#broadcast${s ? `?${s}` : ''}`;
}

function getRoundFromLower(lower?: string | null): number | null {
  if (!lower) return null;
  const parts = lower.split('|');
  const maybe = (parts[1] || '').match(/\d+/)?.[0];
  return maybe ? Number(maybe) : null;
}

function setRoundInLower(lower: string | null, round: number): string {
  const parts = (lower || 'Campfire Bonus|Round 1').split('|');
  const p0 = parts[0] || 'Campfire Bonus';
  return `${p0}|Round ${round}`;
}

export default function AdminBroadcastControls() {
  const [qs, setQs] = useState<URLSearchParams | null>(null);
  const [nextBurnAt, setNextBurnAt] = useState<number | null>(null);

  // Local editable fields
  const [round, setRound] = useState<number>(1);
  const [reward, setReward] = useState<number>(1_000_000);
  const [deadlineISO, setDeadlineISO] = useState<string>('');
  const [claimMinutes, setClaimMinutes] = useState<number>(5);
  const [mode, setMode] = useState<'standard' | 'compact'>('standard');

  useEffect(() => {
    const q = parseHashQS();
    setQs(q);

    // Pull initial values from hash
    const r = Number(q.get('reward') ?? '1000000');
    setReward(Number.isFinite(r) && r > 0 ? r : 1_000_000);

    const lr = getRoundFromLower(q.get('lower'));
    setRound(lr ?? 1);

    const cm = Number(q.get('claimMinutes') ?? '5');
    setClaimMinutes(Number.isFinite(cm) && cm > 0 ? cm : 5);

    const m = (q.get('mode') || '').toLowerCase() === 'compact' ? 'compact' : 'standard';
    setMode(m as 'standard' | 'compact');

    const dl = q.get('deadline');
    if (dl) setDeadlineISO(dl);

    // Fetch next burn (for “Set to next burn”)
    fetch(`https://burningbear.camp/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: StateJson) => setNextBurnAt(d?.schedule?.nextBurnAt ?? null))
      .catch(() => {});
  }, []);

  const nowIso = useMemo(() => new Date().toISOString().replace('.000Z', 'Z'), []);

  if (!qs) return null;

  // Helpers to write back
  const writeAndApply = (patch: Partial<Record<string, string | null>>) => {
    const q = new URLSearchParams(qs.toString());
    Object.entries(patch).forEach(([k, v]) => {
      if (v === null) q.delete(k);
      else q.set(k, v);
    });
    // Ensure broadcast stays on
    if (!q.get('on')) q.set('on', '1');
    setQs(q);
    setHashQS(q);
  };

  const bumpRound = (n = 1) => {
    const newRound = Math.max(1, round + n);
    setRound(newRound);
    const newLower = setRoundInLower(qs.get('lower'), newRound);
    writeAndApply({ lower: newLower });
  };

  const bumpReward = (delta: number) => {
    const v = Math.max(0, (Number.isFinite(reward) ? reward : 0) + delta);
    setReward(v);
    writeAndApply({ reward: String(v) });
  };

  const setRewardExact = () => {
    const v = Math.max(0, reward || 0);
    writeAndApply({ reward: String(v) });
  };

  const setDeadlineISOExact = () => {
    if (!deadlineISO) {
      writeAndApply({ deadline: null });
      return;
    }
    // Let the viewer decide; we just write ISO (must be valid)
    const t = Date.parse(deadlineISO);
    if (!Number.isNaN(t)) writeAndApply({ deadline: new Date(t).toISOString().replace('.000Z', 'Z') });
  };

  const addMinutesToDeadline = (min: number) => {
    const base = Date.parse(deadlineISO || nowIso);
    const t = isNaN(base) ? Date.now() : base;
    const next = new Date(t + min * 60_000).toISOString().replace('.000Z', 'Z');
    setDeadlineISO(next);
    writeAndApply({ deadline: next });
  };

  const setToNextBurn = () => {
    if (!nextBurnAt) return;
    const iso = new Date(nextBurnAt).toISOString().replace('.000Z', 'Z');
    setDeadlineISO(iso);
    writeAndApply({ deadline: iso });
  };

  const applyClaimMinutes = () => {
    const cm = Math.max(1, Math.floor(claimMinutes || 5));
    setClaimMinutes(cm);
    writeAndApply({ claimMinutes: String(cm) });
  };

  const applyMode = (m: 'standard' | 'compact') => {
    setMode(m);
    writeAndApply({ mode: m === 'compact' ? 'compact' : 'standard' });
  };

  const clearDeadline = () => {
    setDeadlineISO('');
    writeAndApply({ deadline: null });
  };

  return (
    <div
      className="fixed right-4 bottom-4 z-[120] text-[13px]"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="rounded-2xl border border-amber-400/25 bg-black/60 backdrop-blur-md shadow-[0_10px_40px_rgba(0,0,0,.45)] text-amber-100 w-[360px] max-w-[92vw]">
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
          <div className="font-bold text-amber-200">Campfire Admin</div>
          <div className="text-[11px] text-white/65">#broadcast controls</div>
        </div>

        <div className="p-4 space-y-4">
          {/* Row: Round + Reward */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-white/70 mb-1">Round</div>
              <div className="flex gap-2">
                <input
                  value={round}
                  onChange={(e) => setRound(Math.max(1, Number(e.target.value) || 1))}
                  onBlur={() => writeAndApply({ lower: setRoundInLower(qs.get('lower'), Math.max(1, round)) })}
                  className="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5"
                  inputMode="numeric"
                />
                <button onClick={() => bumpRound(-1)} className="px-2 rounded-md border border-white/15 bg-white/10">-</button>
                <button onClick={() => bumpRound(+1)} className="px-2 rounded-md border border-white/15 bg-white/10">+</button>
              </div>
            </div>

            <div>
              <div className="text-xs text-white/70 mb-1">Reward (BBURN)</div>
              <div className="flex gap-2">
                <input
                  value={reward}
                  onChange={(e) => setReward(Math.max(0, Number(e.target.value) || 0))}
                  onBlur={setRewardExact}
                  className="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5"
                  inputMode="numeric"
                />
              </div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => bumpReward(+500_000)} className="px-2 rounded-md border border-white/15 bg-white/10">+500k</button>
                <button onClick={() => bumpReward(+1_000_000)} className="px-2 rounded-md border border-white/15 bg-white/10">+1M</button>
                <button onClick={() => bumpReward(-500_000)} className="px-2 rounded-md border border-white/15 bg-white/10">-500k</button>
              </div>
            </div>
          </div>

          {/* Deadline */}
          <div>
            <div className="text-xs text-white/70 mb-1">Deadline (ISO 8601 UTC)</div>
            <div className="flex gap-2">
              <input
                value={deadlineISO}
                onChange={(e) => setDeadlineISO(e.target.value)}
                onBlur={setDeadlineISOExact}
                placeholder="YYYY-MM-DDTHH:MM:SSZ"
                className="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5 font-mono text-[12px]"
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <button onClick={() => addMinutesToDeadline(+5)} className="px-2 rounded-md border border-white/15 bg-white/10">+5m</button>
              <button onClick={() => addMinutesToDeadline(+15)} className="px-2 rounded-md border border-white/15 bg-white/10">+15m</button>
              <button onClick={() => addMinutesToDeadline(+30)} className="px-2 rounded-md border border-white/15 bg-white/10">+30m</button>
              <button onClick={() => addMinutesToDeadline(+60)} className="px-2 rounded-md border border-white/15 bg-white/10">+60m</button>
              <button onClick={setToNextBurn} disabled={!nextBurnAt} className="px-2 rounded-md border border-white/15 bg-white/10 disabled:opacity-50">Set to next burn</button>
              <button onClick={clearDeadline} className="px-2 rounded-md border border-white/15 bg-white/10">Clear</button>
            </div>
          </div>

          {/* Claim minutes + Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs text-white/70 mb-1">Claim window (min)</div>
              <div className="flex gap-2">
                <input
                  value={claimMinutes}
                  onChange={(e) => setClaimMinutes(Math.max(1, Number(e.target.value) || 5))}
                  onBlur={applyClaimMinutes}
                  className="w-full rounded-md bg-white/10 border border-white/15 px-2 py-1.5"
                  inputMode="numeric"
                />
                <button onClick={applyClaimMinutes} className="px-2 rounded-md border border-white/15 bg-white/10">Apply</button>
              </div>
            </div>
            <div>
              <div className="text-xs text-white/70 mb-1">Mode</div>
              <div className="flex gap-2">
                <button
                  onClick={() => applyMode('standard')}
                  className={`px-3 py-1.5 rounded-md border ${mode === 'standard' ? 'border-amber-300/40 bg-amber-500/15' : 'border-white/15 bg-white/10'}`}
                >
                  Standard
                </button>
                <button
                  onClick={() => applyMode('compact')}
                  className={`px-3 py-1.5 rounded-md border ${mode === 'compact' ? 'border-amber-300/40 bg-amber-500/15' : 'border-white/15 bg-white/10'}`}
                >
                  Compact
                </button>
              </div>
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button onClick={() => writeAndApply({})} className="px-3 py-1.5 rounded-md border border-white/15 bg-white/10">Refresh</button>
            <a
              className="px-3 py-1.5 rounded-md border border-amber-300/25 bg-amber-500/10 text-amber-100"
              href="https://burningbear.camp/#broadcast?on=1"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open broadcast
            </a>
            <a
              className="px-3 py-1.5 rounded-md border border-white/15 bg-white/10"
              href="https://x.com/burningbearcamp"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open X
            </a>
          </div>
        </div>
      </div>

      {/* Draggable handle (optional visual only) */}
      <div className="mt-2 text-[11px] text-white/50 text-right select-none">admin panel • local only</div>
    </div>
  );
}
