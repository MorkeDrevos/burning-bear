'use client';
import { useEffect, useMemo, useState } from 'react';

export type Burn = { id: string; amount: number; sol?: number; timestamp: number | string; tx: string; };
export type StateJson = {
  stats: { initialSupply: number; burned: number; currentSupply: number; buybackSol?: number; priceUsdPerSol?: number; };
  schedule?: { burnIntervalMinutes?: number; burnIntervalMs?: number; nextBurnAt?: number; lastBurnAt?: number; };
  burns?: Burn[];
};

const toMs = (ts: number | string) => (typeof ts === 'number' ? ts : Date.parse(ts));

export function useStateData() {
  const [data, setData] = useState<StateJson | null>(null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  useEffect(() => {
    let alive = true;
    fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.json())
      .then((d: StateJson) => {
        if (!alive) return;
        const s: any = { ...(d.schedule ?? {}) };
        const burnMins = typeof s.burnIntervalMinutes === 'number' ? s.burnIntervalMinutes : 60;
        if (s.burnIntervalMs == null) s.burnIntervalMs = burnMins * 60 * 1000;
        if (s.nextBurnAt == null) s.nextBurnAt = Date.now() + (s.burnIntervalMs ?? 0);
        const burns = (d.burns ?? []).map(b => ({ ...b, timestamp: toMs(b.timestamp) }))
                                      .filter(b => Number.isFinite(b.timestamp as number));
        setData({ ...d, schedule: s, burns });
      }).catch(() => {});
    return () => { alive = false; };
  }, []);
  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);
  const burnAt = data?.schedule?.nextBurnAt ?? null;
  const nextBurnMs = burnAt ? burnAt - now : Number.POSITIVE_INFINITY;
  const burnsSorted = useMemo(() => {
    const arr = (data?.burns ?? []) as Array<Burn & { timestamp: number }>;
    return arr.slice().sort((a, b) => b.timestamp - a.timestamp);
  }, [data]);
  return { data, burnsSorted, nextBurnMs, INITIAL, BURNED, CURRENT };
}

export const fmtInt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
