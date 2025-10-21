'use client';
export const dynamic = 'force-dynamic';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';

// ─────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';
const TOKEN_ADDRESS = 'So1ana...111111';
const BURN_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

type Burn = {
  id: string;
  amount: number;
  timestamp: number;
  tx: string;
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────
function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fakeTx() {
  const chars = '0123456789abcdef';
  let s = 'https://explorer.solana.com/tx/0x';
  for (let i = 0; i < 64; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function fmtTimestamp(ts: number) {
  const d = new Date(ts);
  const time = d.toLocaleTimeString('en-GB', { hour12: false }); // HH:MM:SS
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }); // 22 Oct
  return `${time} • ${date}`;
}

function ago(ts: number) {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  return `${h}h ago`;
}

function seedBurns(): Burn[] {
  const now = Date.now();
  const burns: Burn[] = [];
  for (let i = 0; i < 10; i++) {
    const minutesAgo = rnd(10, 180);
    burns.push({
      id: String(now - i),
      amount: rnd(900_000, 4_600_000),
      timestamp: now - minutesAgo * 60_000,
      tx: fakeTx(),
    });
  }
  burns.sort((a, b) => b.timestamp - a.timestamp);
  return burns;
}

// ─────────────────────────────────────────────────────────────
// Page Component
// ─────────────────────────────────────────────────────────────
export default function Page() {
  const [burns, setBurns] = useState<Burn[]>(() => seedBurns());
  const [now, setNow] = useState(Date.now());
  // tick every second
useEffect(() => {
  const id = setInterval(() => setNow(Date.now()), 1000);
  return () => clearInterval(id);
}, []);
  // demo burns
  useEffect(() => {
    const id = setInterval(() => {
      setBurns((prev) => {
        const newBurn: Burn = {
          id: String(Date.now()),
          amount: rnd(900_000, 4_600_000),
          timestamp: Date.now(),
          tx: fakeTx(),
        };
        return [newBurn, ...prev].slice(0, 20);
      });
    }, rnd(30, 60) * 1000);
    return () => clearInterval(id);
  }, []);

  const nextTickMs = useMemo(() => {
    const mod = now % BURN_INTERVAL_MS;
    return BURN_INTERVAL_MS - mod;
  }, [now]);

  const mm = Math.floor(nextTickMs / 60000);
  const ss = Math.floor((nextTickMs % 60000) / 1000);
  const mmss = `${String(mm).padStart(2, '0')}m ${String(ss).padStart(2, '0')}s`;

  const initialSupply = 1_000_000_000;
  const burnedDemo = 5_550_000;
  const currentSupply = initialSupply - burnedDemo;

  const copyCA = async () => {
    try {
      await navigator.clipboard.writeText(TOKEN_ADDRESS);
      alert('Copied!');
    } catch {
      alert('Copy failed');
    }
  };

  return (
    <main className="min-h-screen text-[#ffe6b3]">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur bg-black/40 border-b border-white/5">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/img/coin-logo.png" alt="Bear coin" className="h-8 w-8 rounded-full" />
            <div className="leading-tight">
              <div className="font-semibold">{TOKEN_NAME}</div>
              <div className="text-[11px] text-white/50">{TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/80">
            <a className="hover:text-white" href="#how">How It Works</a>
            <a className="hover:text-white" href="#log">Live Burns</a>
            <a className="hover:text-white" href="#community">Community</a>
          </nav>
          <button
            onClick={copyCA}
            className="rounded-full bg-[#ffe08a] px-4 py-2 text-[#2b2b2b] text-sm font-semibold hover:brightness-95 active:translate-y-px"
          >
            Copy CA
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-white/5">
        <img
          src="/img/burning-bear-frame.jpg"
          alt="Burning Bear"
          className="absolute inset-0 h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/70 to-black/85" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 md:py-28">
          <h1 className="max-w-3xl text-4xl md:text-6xl font-extrabold leading-tight drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Softer countdown */}
          <div className="mt-8 text-white/80">
            <div className="text-xs tracking-[0.25em] uppercase">Next Burn In</div>
            <div className="mt-2 text-4xl md:text-5xl font-extrabold">
              <span className="text-white/90">{mmss}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4">
            <Stat label="Initial Supply" value={fmtInt(initialSupply)} />
            <Stat label="Burned (Demo)" value={fmtInt(burnedDemo)} accent />
            <Stat label="Current Supply" value={fmtInt(currentSupply)} />
          </div>
        </div>
      </section>

      {/* Burn log */}
      <section id="log" className="relative bg-[#07150f]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">Live Burn Log</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {burns.map((b) => <BurnCard key={b.id} burn={b} />)}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="relative bg-[#06130d] border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-6">How it works</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <InfoCard title="80% → Buy & Burn">
              Creator fees auto-buy {TOKEN_SYMBOL} and burn them live — the campfire never sleeps.
            </InfoCard>
            <InfoCard title="20% → Team & Marketing">
              Fuels growth, creators, memes, and keeping the vibes bright.
            </InfoCard>
            <InfoCard title="Transparent">
              Every burn is posted with TX link & timestamp. Public wallets, public camp.
            </InfoCard>
          </div>
        </div>
      </section>

      <footer id="community" className="bg-black border-t border-white/5">
        <div className="mx-auto max-w-6xl px-4 py-10 text-xs text-white/50">
          © {new Date().getFullYear()} The Burning Bear — The Classiest Arsonist in Crypto
        </div>
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────
// Components
// ─────────────────────────────────────────────────────────────
function Stat({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-4">
      <div className={`text-[11px] uppercase tracking-wider ${accent ? 'text-[#ffcf84]' : 'text-white/50'}`}>
        {label}
      </div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
      <div className="font-semibold text-white">{title}</div>
      <div className="text-sm mt-2 text-white/70">{children}</div>
    </div>
  );
}

function BurnCard({ burn }: { burn: Burn }) {
  const ageMs = Date.now() - burn.timestamp;
  const hours = ageMs / (60 * 60 * 1000);
  const fade = Math.max(0.6, 1 - hours * 0.1);
  const width = Math.min(100, Math.max(10, Math.floor((burn.amount / 4_600_000) * 100)));

  return (
    <div className="rounded-2xl border border-white/10 bg-black/40 p-5" style={{ opacity: fade }}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#ffcf84]/20">
            <span className="text-xl">🔥</span>
          </span>
          <div>
            <div className="text-[17px] font-bold text-[#ffcf84]">
              Burn • {fmtInt(burn.amount)} BEAR
            </div>
            <div className="text-sm text-white/60">
              {fmtTimestamp(burn.timestamp)}{' '}
              <span className="text-white/30">({ago(burn.timestamp)})</span>
            </div>
          </div>
        </div>
        <Link
          href={burn.tx}
          target="_blank"
          className="text-[#ffcf84] underline underline-offset-[6px] decoration-white/20 hover:opacity-80"
        >
          TX
        </Link>
      </div>
      <div className="mt-4 h-3 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[#ee965f] to-[#2c5748]"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
