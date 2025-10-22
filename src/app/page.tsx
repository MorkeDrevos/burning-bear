'use client';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';

// ==========================
// 🔥 CONFIG
// ==========================
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'Burning Bear';
const TOKEN_ADDRESS = 'So1ana11111...'; // your CA

const BURN_DATA_URL = '/data/state.json';
const COINGECKO_SOL_PRICE =
  'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';

// ==========================
// 🔹 Helpers
// ==========================
function fmtNum(n: number) {
  return n.toLocaleString('en-US');
}

function fmtLeft(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const hh = h > 0 ? `${h}h ` : '';
  return `${hh}${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
}

// ==========================
// 🔹 Main Component
// ==========================
export default function Page() {
  const [data, setData] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const [solPrice, setSolPrice] = useState<number | null>(null);

  // Fetch JSON + SOL price
  useEffect(() => {
    fetch(BURN_DATA_URL)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));

    const loadSolPrice = async () => {
      try {
        const r = await fetch(COINGECKO_SOL_PRICE);
        const j = await r.json();
        setSolPrice(j.solana.usd);
      } catch {
        setSolPrice(null);
      }
    };
    loadSolPrice();
    const i = setInterval(loadSolPrice, 60000);
    return () => clearInterval(i);
  }, []);

  // Timer
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  if (!data) return <div className="text-center p-20 text-lg">Loading...</div>;

  // Derived values
  const stats = data.stats || {};
  const burns = data.burns || [];
  const schedule = data.schedule || {};

  const burnSpec = schedule.nextBurnSpec || 'in 0m';
  const buySpec = schedule.nextBuybackSpec || 'in 0m';

  const parseSpec = (s: string) => {
    const m = s.match(/in (\d+)m/);
    return m ? now + parseInt(m[1]) * 60000 : now;
  };

  const nextBurnAt = parseSpec(burnSpec);
  const nextBuybackAt = parseSpec(buySpec);

  const totalUsd =
    solPrice && stats.buybackSol ? (stats.buybackSol * solPrice).toFixed(2) : '—';

  return (
    <main className="min-h-screen bg-[#0d1612] text-[#f5eec8]">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-8 py-5 bg-[#0d1612]/90 backdrop-blur-lg border-b border-[#1f2b25]">
        <div className="flex items-center space-x-3">
          <Link href="#top" className="flex items-center space-x-2">
            <img src="/img/globe.svg" alt="logo" className="w-10 h-10" />
            <div>
              <div className="text-lg font-bold">The Burning Bear</div>
              <div className="text-xs text-[#b1b1a5]">
                {TOKEN_SYMBOL} • Live Burn Camp
              </div>
            </div>
          </Link>
        </div>
        <nav className="flex items-center space-x-6 text-[#f5eec8] text-base font-medium">
          <Link href="#log" className="hover:text-yellow-300">
            Live Burns
          </Link>
          <Link href="#how" className="hover:text-yellow-300">
            How It Works
          </Link>
        </nav>
        <div className="flex items-center space-x-3">
          <div className="bg-green-900 text-green-200 px-3 py-1 rounded-full text-sm">
            {TOKEN_ADDRESS.slice(0, 6)}...{TOKEN_ADDRESS.slice(-5)}
          </div>
          <button
            className="bg-yellow-200 text-black font-semibold px-4 py-1 rounded-full"
            onClick={() => {
              navigator.clipboard.writeText(TOKEN_ADDRESS);
              alert('Contract address copied!');
            }}
          >
            Copy CA
          </button>
        </div>
      </header>

      {/* Hero */}
      <section
        id="top"
        className="px-8 pt-20 pb-16 text-center bg-cover bg-center"
        style={{ backgroundImage: 'url(/img/bear-bg.webp)' }}
      >
        <h1 className="text-5xl font-extrabold mb-6 leading-tight max-w-3xl mx-auto">
          Meet The Burning Bear — the classiest arsonist in crypto.
        </h1>
        <div className="flex flex-col md:flex-row justify-center gap-10 font-bold text-xl">
          <div>
            <div className="text-sm text-yellow-200 mb-1">NEXT BUYBACK IN</div>
            <div className="text-3xl text-white">{fmtLeft(nextBuybackAt - now)}</div>
          </div>
          <div>
            <div className="text-sm text-yellow-200 mb-1">NEXT BURN IN</div>
            <div className="text-3xl text-white">{fmtLeft(nextBurnAt - now)}</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 text-left max-w-4xl mx-auto">
          <div className="rounded-xl bg-[#141e19] p-4">
            <div className="text-sm text-yellow-300">INITIAL SUPPLY</div>
            <div className="text-2xl font-bold">{fmtNum(stats.initialSupply)}</div>
          </div>
          <div className="rounded-xl bg-[#141e19] p-4">
            <div className="text-sm text-yellow-300">BURNED</div>
            <div className="text-2xl font-bold">{fmtNum(stats.burned)}</div>
          </div>
          <div className="rounded-xl bg-[#141e19] p-4">
            <div className="text-sm text-yellow-300">CURRENT SUPPLY</div>
            <div className="text-2xl font-bold">{fmtNum(stats.currentSupply)}</div>
          </div>
          <div className="rounded-xl bg-[#141e19] p-4">
            <div className="text-sm text-yellow-300">BUYBACK SPENT</div>
            <div className="text-2xl font-bold">
              {stats.buybackSol?.toFixed(2)} SOL
            </div>
          </div>
          <div className="rounded-xl bg-[#141e19] p-4 col-span-2 md:col-span-1">
            <div className="text-sm text-yellow-300">BUYBACK VALUE (USD)</div>
            <div className="text-2xl font-bold">${totalUsd}</div>
          </div>
        </div>
      </section>

      {/* Live Burn Log */}
      <section id="log" className="px-8 py-10">
        <h2 className="text-2xl font-bold mb-4">Live Burn Log</h2>
        {burns.length === 0 && (
          <div className="text-[#888] bg-[#0f1814] rounded-xl p-6">
            No burns posted yet.
          </div>
        )}
        <div className="grid md:grid-cols-2 gap-6">
          {burns.map((b: any) => (
            <div
              key={b.id}
              className="rounded-2xl bg-[#0f1814] p-6 border border-[#1b2922]"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="text-3xl">🔥</div>
                  <div className="font-bold text-xl">
                    Burn • {fmtNum(b.amount)} BEAR
                  </div>
                </div>
                <a
                  href={b.tx}
                  target="_blank"
                  className="text-yellow-300 font-semibold text-sm"
                >
                  TX
                </a>
              </div>
              <div className="text-sm text-[#aaa]">
                {new Date(b.timestamp).toLocaleString('en-US', {
                  weekday: 'short',
                  hour: '2-digit',
                  minute: '2-digit',
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric'
                })}
              </div>
              <div className="mt-2 text-yellow-200 text-sm">
                ≈ {b.sol?.toFixed(4)} SOL (
                {solPrice ? `$${(b.sol * solPrice).toFixed(2)}` : '—'})
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#223229]">
                <div
                  className="h-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500"
                  style={{ width: '100%' }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="px-8 py-16 bg-[#111c16] text-[#f5eec8]">
        <h2 className="text-3xl font-bold mb-6 text-center">How It Works</h2>
        <div className="max-w-3xl mx-auto space-y-6 text-lg leading-relaxed text-[#d9d6c1]">
          <p>
            The Burning Bear campfire runs on transparency and timing. Every few minutes,
            a portion of buyback funds is used to repurchase and burn tokens forever —
            reducing supply and boosting scarcity.
          </p>
          <p>
            Each buyback and burn is recorded on the blockchain and reflected live here.
            The countdowns show exactly when the next events are scheduled to ignite.
          </p>
          <p>
            You can verify everything yourself on Solana Explorer — just follow the TX
            links in the log above 🔥
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-[#7f897d] border-t border-[#1b2922]">
        Once upon a bear market, one dapper bear decided to fight the winter the only way he knew how — with fire. 🔥
      </footer>
    </main>
  );
}
