'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';
const FULL_TOKEN_ADDRESS = 'CYbYmTLvVLp2xPQ5H4UqyMv9UptmzWDLnYExPsh3JRMA';

// 🔓 Public, view-only wallets
const BURN_WALLET = 'CYbYmTLvVLp2xPQ5H4UqyMv9UptmzWDLnYExPsh3JRMA';
const TREASURY_WALLET = 'FH2EathAXbSScfmb2Zn4FYVEbjLwGo7QoSNxvNxQZ5qE';
const MARKETING_WALLET = '7k5rwpdSRyutEMek5tXuNuVVKQEQyubKC9VHEZ91SwZV';

const EXPLORER = 'https://explorer.solana.com';

/* =========================
   Types
========================= */
type Burn = {
  id: string;
  amount: number;
  sol?: number;
  timestamp: number | string;
  tx: string;
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;
    priceUsdPerSol?: number;
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;
    nextBurnAt?: number;
    nextBuybackAt?: number;
    lastBurnAt?: number;
    lastBuybackAt?: number;
  };
  burns?: Burn[];
};

/* =========================
   Utils
========================= */
const truncateMiddle = (str: string, left = 6, right = 6) =>
  str.length > left + right ? `${str.slice(0, left)}…${str.slice(-right)}` : str;

const fmtInt = (n: number) => n.toLocaleString('en-US');
const fmtMoney = (n?: number) =>
  n == null || !isFinite(n)
    ? '$0.00'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

const fmtWhen = (ts: number) =>
  new Date(ts).toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

const fmtCountdown = (ms: number) => {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
};

const toMs = (ts: number | string) => (typeof ts === 'number' ? ts : Date.parse(ts));

/* =========================
   Page
========================= */
export default function Page() {
  const [data, setData] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  // tick every second
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // load JSON
  useEffect(() => {
    fetch(`/data/state.json?t=${Date.now()}`)
      .then(r => r.json())
      .then((j: StateJson) => {
        const burns = (j.burns ?? [])
          .map(b => ({ ...b, timestamp: toMs(b.timestamp) }))
          .filter(b => Number.isFinite(b.timestamp as number));
        setData({ ...j, burns });
      })
      .catch(() => {});
  }, []);

  // fetch live SOL/USD
  useEffect(() => {
    const fetchPrice = () =>
      fetch('/api/sol-price')
        .then(r => r.json())
        .then(o => o?.usd && setSolUsd(o.usd))
        .catch(() => {});
    fetchPrice();
    const id = setInterval(fetchPrice, 60_000);
    return () => clearInterval(id);
  }, []);

  const priceUsdPerSol = solUsd ?? data?.stats?.priceUsdPerSol ?? 0;

  // sort burns
  const burnsSorted = useMemo(() => {
    const arr = (data?.burns ?? []) as Array<Burn & { timestamp: number }>;
    return arr.slice().sort((a, b) => b.timestamp - a.timestamp);
  }, [data]);

  // absolute targets
  const targets = useMemo(() => {
    const s = data?.schedule ?? {};
    return {
      bb:
        s.nextBuybackAt ??
        (s.lastBuybackAt && s.buybackIntervalMs
          ? s.lastBuybackAt + s.buybackIntervalMs
          : undefined),
      burn:
        s.nextBurnAt ??
        (s.lastBurnAt && s.burnIntervalMs
          ? s.lastBurnAt + s.burnIntervalMs
          : undefined),
    };
  }, [data]);

  const nextBuybackMs = targets.bb ? targets.bb - now : 0;
  const nextBurnMs = targets.burn ? targets.burn - now : 0;

  // auto-loop timers
  useEffect(() => {
    if (!data?.schedule) return;
    setData(prev => {
      if (!prev?.schedule) return prev;
      const { buybackIntervalMs = 0, burnIntervalMs = 0 } = prev.schedule;
      let { nextBuybackAt, nextBurnAt } = prev.schedule;
      const advance = (t?: number, i?: number) => {
        if (!t || !i) return t;
        while (t <= Date.now()) t += i;
        return t;
      };
      if ((nextBuybackAt && nextBuybackAt - now <= 0) || (nextBurnAt && nextBurnAt - now <= 0)) {
        return {
          ...prev,
          schedule: {
            ...prev.schedule,
            nextBuybackAt: advance(nextBuybackAt, buybackIntervalMs),
            nextBurnAt: advance(nextBurnAt, burnIntervalMs),
          },
        };
      }
      return prev;
    });
  }, [now, data?.schedule]);

  const stats = data?.stats ?? {
    initialSupply: 0,
    burned: 0,
    currentSupply: 0,
    buybackSol: 0,
  };

  const totalUsd = stats.buybackSol! * priceUsdPerSol;
  const INITIAL = stats.initialSupply;
  const BURNED = stats.burned;
  const CURRENT = stats.currentSupply || Math.max(0, INITIAL - BURNED);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayBurns = burnsSorted.filter(b => b.timestamp >= todayStart.getTime()).length;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(FULL_TOKEN_ADDRESS);
    setCopied(true);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main id="top">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#0d1a14]/90 border-b border-white/10 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
          <Link href="#top" className="flex items-center gap-3 md:gap-4 min-w-0">
            <img src="/img/coin-logo.png" alt={TOKEN_NAME} className="h-12 w-12 md:h-14 md:w-14 rounded-full border border-amber-300/30" />
            <div>
              <div className="text-base md:text-xl font-extrabold text-amber-200">{TOKEN_NAME}</div>
              <div className="text-xs text-white/55">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </Link>
          <button
            onClick={handleCopy}
            className={`rounded-full px-4 py-2 text-sm md:text-base font-semibold transition ${
              copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'
            }`}
          >
            {copied ? 'Copied!' : 'Copy CA'}
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <video
            className="h-[66vh] w-full object-cover"
            playsInline
            autoPlay
            muted
            loop
            poster="/img/burning-bear-frame.jpg"
          >
            <source src="/img/burning-bear.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-[#0b1712]/35 to-[#0b1712]" />
        </div>

        <div className="mx-auto grid max-w-6xl gap-6 px-4 pb-10 pt-16 sm:pt-24">
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdowns */}
          <div className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <Countdown label="Next buyback in" value={fmtCountdown(nextBuybackMs)} />
            <Countdown label="Next burn in" value={fmtCountdown(nextBurnMs)} />
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Burned So Far" value={fmtInt(BURNED)} />
            <Stat label="Current Supply" value={fmtInt(CURRENT)} />
            <Stat label="Buyback Spent" value={`${stats.buybackSol?.toFixed(2)} SOL`} />
            <Stat label="Total Buyback Value" value={fmtMoney(totalUsd)} />
          </div>

          <div className="mt-3 flex flex-wrap gap-3">
            <Pill>Today: {todayBurns} burns</Pill>
            <Pill>Initial Supply: {fmtInt(INITIAL)}</Pill>
            <Pill>Live SOL: {fmtMoney(priceUsdPerSol)}</Pill>
          </div>
        </div>
      </section>

      {/* Burn Log */}
      <section id="log" className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="text-2xl font-bold mb-4">Live Burn Log</h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {burnsSorted.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-6 text-white/60">
              No burns yet.
            </div>
          )}
          {burnsSorted.map(b => (
            <BurnCard key={b.id} burn={b as Burn & { timestamp: number }} price={priceUsdPerSol} />
          ))}
        </div>
      </section>

      {/* Wallets */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h3 className="text-xl font-bold mb-3">Transparent Wallets</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <WalletCard title="Burn Wallet" address={BURN_WALLET} note="Destroyed supply lives here." />
          <WalletCard title="Treasury / Buybacks" address={TREASURY_WALLET} note="Funds for buybacks and ops." />
          <WalletCard title="Marketing" address={MARKETING_WALLET} note="Growth, creators, promos." />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-[#0d1a14] py-8 text-center text-sm text-white/60">
        <p>🔥 The Burning Bear · Built for fun, not financial advice.</p>
      </footer>
    </main>
  );
}

/* =========================
   Components
========================= */
const Countdown = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[11px] uppercase tracking-[0.25em] text-white/55">{label}</div>
    <div className="text-3xl font-extrabold text-white/85 md:text-[36px]">{value}</div>
  </div>
);

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5">
    <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
    <div className="mt-1 text-2xl font-extrabold">{value}</div>
  </div>
);

const Pill = ({ children }: { children: React.ReactNode }) => (
  <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/75">
    {children}
  </span>
);

const BurnCard = ({ burn, price }: { burn: Burn & { timestamp: number }; price: number }) => {
  const usd = burn.sol && price ? burn.sol * price : undefined;
  return (
    <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-bold text-lg">🔥 Burn • {fmtInt(burn.amount)} BEAR</div>
          <div className="text-sm text-white/60">{fmtWhen(burn.timestamp)}</div>
          {burn.sol && <div className="text-sm text-white/70">≈ {burn.sol.toFixed(4)} SOL {usd ? `(${fmtMoney(usd)})` : ''}</div>}
        </div>
        <Link href={burn.tx} target="_blank" className="text-amber-300 font-semibold text-sm hover:underline">
          TX
        </Link>
      </div>
    </div>
  );
};

const WalletCard = ({ title, address, note }: { title: string; address: string; note?: string }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5">
      <div className="text-sm font-semibold">{title}</div>
      {note && <div className="text-xs text-white/55">{note}</div>}
      <div className="mt-3 flex items-center justify-between">
        <code className="text-white/80 text-[13px] truncate">{truncateMiddle(address)}</code>
        <div className="flex gap-2">
          <a
            href={`${EXPLORER}/address/${address}`}
            target="_blank"
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm hover:bg-white/10"
          >
            View
          </a>
          <button
            onClick={handleCopy}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${
              copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'
            }`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
};
