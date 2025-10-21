'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';

// ---- CONFIG (edit these) ----
const TOKEN_SYMBOL = 'BEAR';
const TOKEN_NAME = 'The Burning Bear';
const TOKEN_ADDRESS = 'So1ana111111111111111111111111111111111111111'; // put the real CA here
const INITIAL_SUPPLY = 1_000_000_000; // 1B
const BURN_INTERVAL_MS = 600_000; // 10 minutes

// ---- helpers ----
const rr = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
const fmt = (n: number) => n.toLocaleString();
const fakeTx = () => {
  const c = '0123456789abcdef';
  let s = '0x';
  for (let i = 0; i < 64; i++) s += c[(Math.random() * c.length) | 0];
  return s;
};

type Burn = { id: string; ts: number; amount: number; tx: string };

export default function Page() {
  // hydration guard to avoid SSR/client mismatches
  const [ready, setReady] = useState(false);

  // countdown
  const [now, setNow] = useState(0);
  const [nextAt, setNextAt] = useState<number>(0);
  const ticking = useRef<NodeJS.Timer | null>(null);
  const burning = useRef(false);

  // demo burn state (for UI until we wire real chain)
  const [burns, setBurns] = useState<Burn[]>([]);
  const [totalBurned, setTotalBurned] = useState(0);
  const [displayBurned, setDisplayBurned] = useState(0);

  // copy feedback
  const [copied, setCopied] = useState(false);

  // init on mount
  useEffect(() => {
    setReady(true);
    const t = Date.now();
    setNow(t);
    setNextAt(t + BURN_INTERVAL_MS);

    // seed demo burns (just a couple)
    const seed: Burn[] = [
      { id: 'seed_1', ts: t - 2 * 3600_000, amount: 3_100_000, tx: fakeTx() },
      { id: 'seed_2', ts: t - 1 * 3600_000, amount: 2_450_000, tx: fakeTx() },
    ];
    setBurns(seed);
    const seeded = seed.reduce((s, b) => s + b.amount, 0);
    setTotalBurned(seeded);
    setDisplayBurned(seeded);
  }, []);

  // 1-second clock
  useEffect(() => {
    if (!ready) return;
    if (ticking.current) clearInterval(ticking.current);
    ticking.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (ticking.current) clearInterval(ticking.current);
      ticking.current = null;
    };
  }, [ready]);

  // smooth number animation for the “Current Supply” tile
  useEffect(() => {
    if (!ready) return;
    let raf = 0;
    const step = () => {
      setDisplayBurned((cur) => {
        if (cur === totalBurned) return cur;
        const diff = totalBurned - cur;
        const delta = Math.max(1, Math.round(diff * 0.16));
        return cur + Math.min(diff, delta);
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [ready, totalBurned]);

  // countdown → trigger auto burn at 0 (demo)
  useEffect(() => {
    if (!ready || !nextAt) return;
    if (!burning.current && now >= nextAt) doBurn(false);
  }, [ready, now, nextAt]);

  const doBurn = (manual: boolean) => {
    if (burning.current && !manual) return;
    burning.current = true;

    const n = {
      id: `b_${Date.now()}`,
      ts: Date.now(),
      amount: rr(900_000, 4_800_000),
      tx: fakeTx(),
    };
    setBurns((p) => [n, ...p].slice(0, 18)); // keep ~18 visible
    setTotalBurned((t) => t + n.amount);
    setNextAt(Date.now() + BURN_INTERVAL_MS);

    setTimeout(() => (burning.current = false), 60);
  };

  const countdown = useMemo(() => {
    const target = nextAt || Date.now() + BURN_INTERVAL_MS;
    const diff = Math.max(0, target - now);
    const m = Math.floor(diff / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return { m, s };
  }, [nextAt, now]);

  const timeAgo = (ts: number) => {
    const d = Math.floor((Date.now() - ts) / 1000);
    if (d < 60) return `${d}s ago`;
    if (d < 3600) return `${Math.floor(d / 60)}m ago`;
    if (d < 86400) return `${Math.floor(d / 3600)}h ago`;
    return `${Math.floor(d / 86400)}d ago`;
  };

  const copyCA = async () => {
    await navigator.clipboard.writeText(TOKEN_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  if (!ready) return <div style={{ height: '100vh', background: '#0b1712' }} />;

  const currentSupplyExact = Math.max(0, INITIAL_SUPPLY - totalBurned);
  const currentSupplyDisplay = Math.max(0, INITIAL_SUPPLY - displayBurned);

  return (
    <main className="min-h-screen bg-[#0b1712] text-[#f7efe2]">
      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur bg-[#0b1712]/70 border-b border-[#1c3a2e]">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 hover:opacity-90 transition">
            <div className="h-12 w-12 rounded-full overflow-hidden ring-2 ring-[#ffcc7a] bg-[#2a5a43]">
              <img src="/img/coin-logo.png" alt="Burning Bear coin" className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight">
              <div className="text-xl md:text-2xl font-semibold">{TOKEN_NAME}</div>
              <div className="text-xs text-[#cbd8cf]">${TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#live" className="text-[#ffcc7a] hover:drop-shadow-[0_0_6px_rgba(255,204,122,.6)]">Live Burns</a>
            <a href="#how" className="text-[#ffcc7a] hover:drop-shadow-[0_0_6px_rgba(255,204,122,.6)]">How It Works</a>
            <a
              href="https://x.com/MorkeDrevos"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#ffcc7a] hover:drop-shadow-[0_0_6px_rgba(255,204,122,.6)]"
            >
              Community
            </a>
          </nav>

          <div className="hidden sm:flex items-center gap-2 rounded-full bg-[#11281e] border border-[#2b4a39] px-4 py-2">
            <code className="text-xs md:text-sm text-[#ffe5bd] tracking-wide">
              {TOKEN_ADDRESS.slice(0, 6)}…{TOKEN_ADDRESS.slice(-6)}
            </code>
            <button
              onClick={copyCA}
              className="px-3 py-1.5 rounded-full bg-[#ffcc7a] text-[#0b1712] text-xs md:text-sm font-bold"
            >
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
        <div className="h-1 bg-[linear-gradient(90deg,#214e3c,#3e7a5f)]" />
      </header>

{/* HERO */}
<section className="relative overflow-hidden bg-[#0b1712]">
  <video
    src="/img/burning-bear.mp4"  // 👈 rename file in GitHub to lowercase .mp4
    poster="/img/burning-bear-frame.jpg"
    autoPlay
    muted
    loop
    playsInline
    className="absolute inset-0 w-full h-full object-cover brightness-[0.55]"
  />
  <div className="absolute inset-0 bg-gradient-to-b from-[#0b1712]/40 via-[#0b1712]/60 to-[#0b1712]/85" />

  <div className="relative z-10 flex items-center justify-center min-h-[700px] text-center px-6">
    <div className="w-full max-w-6xl mx-auto backdrop-blur-[1.2px] bg-[#0b1712]/35 p-6 md:p-8 rounded-3xl">
      <h1 className="text-[34px] md:text-[56px] leading-[1.15] text-[#FFE7B0] font-semibold drop-shadow-[0_4px_18px_rgba(255,172,70,.35)]">
        Meet <span className="text-[#FFD27F]">The Burning Bear</span> —{' '}
        <span className="text-[#EFC97E]/90">the classiest arsonist in crypto.</span>
      </h1>

      {/* Countdown (whiter & bigger) */}
      <div className="mt-6 flex flex-col items-center gap-1">
        <span className="text-xs md:text-sm tracking-widest uppercase text-white/85">Next burn in</span>
        <div className="text-ember text-[42px] md:text-[66px] leading-none text-white font-bold">
          {String(countdown.m).padStart(2, '0')}m {String(countdown.s).padStart(2, '0')}s
        </div>
      </div>

      <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        <Stat label="Initial Supply" value={INITIAL_SUPPLY} />
        <Stat label="Burned (demo)" value={displayBurned} accent />
        <Stat label="Current Supply" value={currentSupplyDisplay} />
      </div>

      <div className="mt-6">
        <button
          onClick={copyCA}
          className="rounded-full bg-[#ffcc7a] hover:bg-[#ffc35f] text-[#0b1712] font-bold px-6 py-3 shadow-ember"
        >
          {copied ? 'Copied!' : 'Copy CA'}
        </button>
      </div>
    </div>
  </div>
</section>

      {/* LIVE BURN LOG */}
      <section id="live" className="mx-auto max-w-7xl px-4 py-10 pb-24">
        <div className="flex items-center justify-between">
          <h3 className="text-3xl md:text-4xl font-semibold">Live Burn Log</h3>
          <button
            onClick={() => doBurn(true)}
            className="text-xs md:text-sm px-3 py-2 rounded-lg bg-[#214e3c] border border-[#2b6a52] text-[#ffe0a6]"
          >
            Simulate Burn
          </button>
        </div>
        <p className="mt-2 text-sm text-[#cfe3d8]">Demo data — TX links open explorer.</p>

        <div className="mt-6 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {burns.map((b) => (
            <article key={b.id} className="bg-[#091711]/80 rounded-2xl p-4 border border-[#21422f] shadow-ember">
              <div className="flex items-start gap-3">
                <div className="h-12 w-12 rounded-full bg-[radial-gradient(circle,#ffcc7a,#ff7a4b)] grid place-items-center text-[#0b1712] font-extrabold">
                  🔥
                </div>
                <div className="flex-1">
                  <div className="text-sm text-[#ffcc7a] font-semibold">
                    Burn • {fmt(b.amount)} {TOKEN_SYMBOL}
                  </div>
                  <div className="mt-1 text-xs text-[#cfe3d8]">{timeAgo(b.ts)}</div>
                </div>
                <a
                  href={`https://explorer.solana.com/tx/${b.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#ffcc7a] underline"
                >
                  TX
                </a>
              </div>
              <div className="mt-3 h-2 rounded-full bg-[#0c2219] overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#ffb36b] to-[#ff7a4b] animate-[pulse_1.8s_ease-in-out_infinite]"
                  style={{ width: `${Math.min(100, Math.round((b.amount / 4_800_000) * 100))}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="mx-auto max-w-7xl px-4 pb-16 pt-2">
        <h3 className="text-3xl md:text-4xl font-semibold">How it works</h3>
        <div className="mt-4 grid md:grid-cols-3 gap-4 text-[#e9f3ec]">
          <InfoCard title="80% → Buy & Burn">
            Creator fees auto-buy $BEAR and burn them live — the campfire never sleeps.
          </InfoCard>
          <InfoCard title="20% → Team + Marketing">
            Fuels growth, creators, memes, and keeping the vibes bright.
          </InfoCard>
          <InfoCard title="Transparent">
            Every burn is posted with TX link & timestamp. Public wallets, public camp.
          </InfoCard>
        </div>
      </section>

      {/* FOOTER (centered bedtime story disclaimer) */}
      <footer className="border-t border-[#183228] bg-[#0b1712] text-center">
        <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-[#cbd8cf] space-y-4 leading-relaxed">
          <p className="italic text-[#e9cfa2]">
            Once upon a bear market, one dapper bear decided to fight the winter the only way he knew how, with fire. 🔥
            Now every transaction adds more logs to the blaze. No fake hype. Just steady, satisfying burns.
            <br/><br/>
            ${TOKEN_SYMBOL} is a meme token with no intrinsic value or expectation of financial return.
            Entertainment only. Always DYOR.
          </p>
          <div className="text-xs mt-6 opacity-75">
            © {new Date().getFullYear()} {TOKEN_NAME} — The Classiest Arsonist in Crypto
          </div>
        </div>
      </footer>
    </main>
  );
}

function Stat({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`p-4 rounded-2xl border ${accent ? 'bg-[#120d05]/80 border-[#3d2a12]' : 'bg-[#091711]/80 border-[#21422f]'}`}>
      <div className="text-[11px] uppercase tracking-widest text-[#e9cfa2]/80">{label}</div>
      <div className={`mt-1 ${accent ? 'text-[#ffd79a]' : 'text-[#ffe0a6]'} text-[22px] md:text-[26px] font-semibold`}>
        {fmt(value)}
      </div>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 rounded-xl bg-[#081f16] border border-[#183228]">
      <div className="font-semibold">{title}</div>
      <div className="text-sm mt-2">{children}</div>
    </div>
  );
}
