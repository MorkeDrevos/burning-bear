'use client';

import { useEffect, useMemo, useState } from 'react';

type Burn = { id: string; amount: number; sol?: number; timestamp: number | string; tx: string };
type StateJson = {
  stats: { initialSupply: number; burned: number; currentSupply: number; buybackSol?: number; priceUsdPerSol?: number };
  schedule?: {
    burnIntervalMinutes?: number; buybackIntervalMinutes?: number;
    burnIntervalMs?: number; buybackIntervalMs?: number;
    nextBurnAt?: number; nextBuybackAt?: number;
    lastBurnAt?: number; lastBuybackAt?: number;
  };
  burns?: Burn[];
};

export default function useStateData() {
  const [data, setData] = useState<StateJson | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    let alive = true;
    const load = () =>
      fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
        .then(r => r.json())
        .then((d: StateJson) => {
          if (!alive) return;
          const s: any = { ...(d?.schedule ?? {}) };
          const burnM = s.burnIntervalMinutes, buyM = s.buybackIntervalMinutes;
          if (s.burnIntervalMs == null && typeof burnM === 'number') s.burnIntervalMs = burnM * 60_000;
          if (s.buybackIntervalMs == null && typeof buyM === 'number') s.buybackIntervalMs = buyM * 60_000;
          const burns = (d?.burns ?? []).map(b => ({ ...b, timestamp: typeof b.timestamp === 'number' ? b.timestamp : Date.parse(b.timestamp) }))
                                         .filter(b => Number.isFinite(b.timestamp));
          setData({ ...d, schedule: s, burns });
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 15_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const priceUsdPerSol = data?.stats?.priceUsdPerSol ?? 0;
  const burnsSorted = useMemo(() => (data?.burns ?? []).slice().sort((a: any, b: any) => (b.timestamp as number) - (a.timestamp as number)), [data]);

  const targets = useMemo(() => {
    const s = data?.schedule ?? {};
    const bb = s.nextBuybackAt ?? (s.lastBuybackAt && s.buybackIntervalMs ? s.lastBuybackAt + s.buybackIntervalMs : undefined);
    const burn = s.nextBurnAt ?? (s.lastBurnAt && s.burnIntervalMs ? s.lastBurnAt + s.burnIntervalMs : undefined);
    return { bb, burn };
  }, [data]);

  const nextBurnMs = typeof targets.burn === 'number' ? targets.burn - now : Number.POSITIVE_INFINITY;

  return { data, burnsSorted, priceUsdPerSol, nextBurnMs, now };
}

export const fmtInt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
export const fmtMoney = (n?: number) => (n == null || !isFinite(n) ? '$0.00' : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }));
export const pad2 = (n: number) => String(n).padStart(2, '0');
