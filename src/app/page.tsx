'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

// Config
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';
const TOKEN_ADDRESS = 'So1ana...111111';
const BURN_INTERVAL_MS = 10 * 60 * 1000;

// Demo Data
type Burn = {
  id: string;
  amount: number;
  timestamp: number;
  tx: string;
};

// Helper functions
function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function fakeTx() {
  const chars = '0123456789abcdef';
  let s = 'https://explorer.solana.com/tx/';
  for (let i = 0; i < 64; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

function fmtInt(n: number) {
  return n.toLocaleString('en-US');
}

// Component
export default function Page() {
  const [burns, setBurns] = useState<Burn[]>([
    { id: '1', amount: 3100000, timestamp: Date.now() - 2 * 3600 * 1000, tx: fakeTx() },
    { id: '2', amount: 2450000, timestamp: Date.now() - 1 * 3600 * 1000, tx: fakeTx() },
  ]);
  const [nextBurn, setNextBurn] = useState(BURN_INTERVAL_MS);
  const [now, setNow] = useState(Date.now());

  // Countdown
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    const remaining = BURN_INTERVAL_MS - ((now / 1000) % (BURN_INTERVAL_MS / 1000)) * 1000;
    setNextBurn(remaining);
  }, [now]);

  function fmtCountdown(ms: number) {
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`;
  }

  return (
    <main className="min-h-screen text-center text-[#ffedb3]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between bg-[#08160f] px-6 py-4">
        <div className="flex items-center space-x-3">
          <img src="/img/coin-logo.png" alt="Bear Logo" className="h-8 w-8" />
          <div>
            <div className="text-lg font-bold">{TOKEN_NAME}</div>
            <div className="text-xs opacity-75">{TOKEN_SYMBOL} • Live Burn Camp</div>
          </div>
        </div>
        <nav className="hidden space-x-6 md:flex">
          <Link href="#log" className="hover:text-white">
            Live Burns
          </Link>
          <Link href="#how" className="hover:text-white">
            How It Works
          </Link>
          <Link href="#community" className="hover:text-white">
            Community
          </Link>
        </nav>
        <button
          className="rounded-full bg-[#ffedb3] px-4 py-2 font-semibold text-black"
          onClick={() => navigator.clipboard.writeText(TOKEN_ADDRESS)}
        >
          Copy CA
        </button>
      </header>

      {/* Hero */}
      <section
        className="relative flex flex-col items-center justify-center bg-[#0b1712]"
        style={{
          backgroundImage: 'url(/img/fire-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '70vh',
        }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 max-w-3xl px-4">
          <h1 className="text-4xl font-extrabold md:text-6xl">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>
          <p className="mt-6 text-lg text-white/80">Next burn in</p>
          <p className="mt-2 text-5xl font-bold text-white/90">{fmtCountdown(nextBurn)}</p>

          {/* Stats */}
          <div className="mt-10 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-[#2d3b33] bg-black/40 p-4">
              <div className="text-sm opacity-70">Initial Supply</div>
              <div className="text-2xl font-bold">{fmtInt(1000000000)}</div>
            </div>
            <div className="rounded-xl border border-[#2d3b33] bg-black/40 p-4">
              <div className="text-sm opacity-70">Burned (Demo)</div>
              <div className="text-2xl font-bold">{fmtInt(5550000)}</div>
            </div>
            <div className="rounded-xl border border-[#2d3b33] bg-black/40 p-4">
              <div className="text-sm opacity-70">Current Supply</div>
              <div className="text-2xl font-bold">{fmtInt(994450000)}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Burn Log */}
      <section id="log" className="bg-[#0b1712] px-4 py-16">
        <h2 className="mb-6 text-3xl font-bold text-[#ffedb3]">Live Burn Log</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {burns.map((b) => (
            <div
              key={b.id}
              className="rounded-2xl border border-[#2d3b33] bg-black/40 p-4 text-left shadow-md"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🔥</span>
                  <div className="font-semibold">
                    Burn • {fmtInt(b.amount)} BEAR
                  </div>
                </div>
                <a href={b.tx} target="_blank" className="text-[#ffedb3] underline text-sm">
                  TX
                </a>
              </div>
              <div className="mt-2 text-sm text-white/60">
                {new Date(b.timestamp).toLocaleString('en-US', {
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  day: '2-digit',
                  month: 'short',
                })}{' '}
                ({Math.floor((Date.now() - b.timestamp) / 3600000)}h ago)
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#2d3b33]">
                <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-orange-500 to-yellow-500" />
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#2d3b33] bg-black/60 py-6 text-sm text-[#ffedb3]/80">
        <p>
          Once upon a bear market, one dapper bear decided to fight the winter the only way he knew
          how, with fire. 🔥
        </p>
      </footer>
    </main>
  );
}
