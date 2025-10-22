'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Jua, Karla, Playfair_Display, Jura } from 'next/font/google';

// ------------------------------
// Fonts
// ------------------------------
const jua = Jua({ weight: '400', subsets: ['latin'] });
const karla = Karla({ weight: ['400', '600', '700'], subsets: ['latin'] });
const playfair = Playfair_Display({ weight: ['700', '900'], subsets: ['latin'] });
const jura = Jura({ weight: ['600', '700'], subsets: ['latin'] });

// ------------------------------
// Config
// ------------------------------
const TOKEN_SYMBOL = 'BEAR';
const TOKEN_NAME = 'Burning Bear';
const TOKEN_ADDRESS = 'So1ana111111111111111111111111111111111111111'; // replace with real CA
const BURN_INTERVAL_MS = 600_000; // 10 minutes
const INITIAL_SUPPLY = 1_000_000_000; // 1B

// ------------------------------
// Helpers
// ------------------------------
const rr = (min: number, max: number) => Math.floor(min + Math.random() * (max - min + 1));
const fmt = (n: number) => n.toLocaleString();
const fakeTx = () => {
  const c = '0123456789abcdef';
  let s = '0x';
  for (let i = 0; i < 64; i++) s += c[(Math.random() * c.length) | 0];
  return s;
};

// ------------------------------
// Page Component
// ------------------------------
export default function Page() {
  const [hydrated, setHydrated] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [copied, setCopied] = useState(false);
  const [burns, setBurns] = useState<{ id: string; ts: number; amount: number; tx: string }[]>([]);
  const [totalBurned, setTotalBurned] = useState(0);
  const [displayBurned, setDisplayBurned] = useState(0);
  const [nextBurnAt, setNextBurnAt] = useState<number>(() => Date.now() + BURN_INTERVAL_MS);

  const clockRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const burningRef = useRef(false);

  useEffect(() => setHydrated(true), []);

  // ------------------------------
  // Seed demo burns
  // ------------------------------
  useEffect(() => {
    if (!hydrated || burns.length) return;
    const seed = [
      { id: 'b1', ts: Date.now() - 3600000 * 3, amount: 2_000_000, tx: fakeTx() },
      { id: 'b2', ts: Date.now() - 3600000 * 1.5, amount: 3_500_000, tx: fakeTx() },
    ];
    setBurns(seed);
    const t = seed.reduce((s, b) => s + b.amount, 0);
    setTotalBurned(t);
    setDisplayBurned(t);
  }, [hydrated, burns.length]);

  // ------------------------------
  // Clock tick every second
  // ------------------------------
  useEffect(() => {
    if (!hydrated) return;
    if (clockRef.current) clearInterval(clockRef.current);
    clockRef.current = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      if (clockRef.current) clearInterval(clockRef.current);
      clockRef.current = null;
    };
  }, [hydrated]);

  // ------------------------------
  // Animate total burned counter
  // ------------------------------
  useEffect(() => {
    if (!hydrated) return;
    let raf = 0;
    const step = () => {
      setDisplayBurned((cur) => {
        if (cur === totalBurned) return cur;
        const diff = totalBurned - cur;
        const delta = Math.max(1, Math.round(diff * 0.14));
        return cur + Math.min(diff, delta);
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [hydrated, totalBurned]);

  // ------------------------------
  // Simulated burns
  // ------------------------------
  const doBurn = (manual = false) => {
    if (burningRef.current && !manual) return;
    burningRef.current = true;

    const amount = rr(900_000, 4_800_000);
    const n = { id: `b_${Date.now()}`, ts: Date.now(), amount, tx: fakeTx() };

    setBurns((p) => [n, ...p].slice(0, 15));
    setTotalBurned((t) => t + amount);
    setNextBurnAt(Date.now() + BURN_INTERVAL_MS);

    setTimeout(() => (burningRef.current = false), 50);
  };

  // Auto burn when timer hits zero
  useEffect(() => {
    if (!hydrated) return;
    if (!burningRef.current && now >= nextBurnAt) {
      doBurn(false);
    }
  }, [hydrated, now, nextBurnAt]);

  // Countdown
  const countdown = useMemo(() => {
    const diff = Math.max(0, nextBurnAt - now);
    const m = Math.floor(diff / 60000);
    const s = Math.floor(diff / 1000) % 60;
    return { m, s };
  }, [nextBurnAt, now]);

  const timeAgo = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const copyCA = async () => {
    await navigator.clipboard.writeText(TOKEN_ADDRESS);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // ------------------------------
  // Supply calculations (auto-updating)
  // ------------------------------
  const currentSupplyExact = useMemo(
    () => Math.max(0, INITIAL_SUPPLY - totalBurned),
    [totalBurned]
  );
  const currentSupplyDisplay = useMemo(
    () => Math.max(0, INITIAL_SUPPLY - displayBurned),
    [displayBurned]
  );

  if (!hydrated) return <div style={{ background: '#0b1712', height: '100vh' }} />;

  // ------------------------------
  // Page Render
  // ------------------------------
  return (
    <main className={`${karla.className} min-h-screen bg-[#0b1712] text-[#f7efe2]`}>
      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur bg-[#0b1712]/70 border-b border-[#1c3a2e]">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
          <div onClick={scrollTop} className="flex items-center gap-4 cursor-pointer hover:opacity-90 transition">
            <div className="h-14 w-14 md:h-16 md:w-16 rounded-full overflow-hidden ring-2 ring-[#ffcc7a] bg-[#2a5a43]">
              <img src="/img/coin-logo.png" alt="Burning Bear coin" className="w-full h-full object-cover" />
            </div>
            <div className="leading-tight">
              <div className={`${jua.className} text-2xl md:text-3xl`}>{TOKEN_NAME}</div>
              <div className="text-xs md:text-sm text-[#cbd8cf]">${TOKEN_SYMBOL} • Live Burn Camp</div>
            </div>
          </div>

          {/* NAV */}
          <nav className={`${jua.className} hidden md:flex gap-8 text-lg`}>
            <a href="#tokenomics" className="text-[#ffcc7a] hover:drop-shadow-[0_0_8px_rgba(255,204,122,.6)]">Tokenomics</a>
            <a href="#live" className="text-[#ffcc7a] hover:drop-shadow-[0_0_8px_rgba(255,204,122,.6)]">Live Burns</a>
            <a href="#how" className="text-[#ffcc7a] hover:drop-shadow-[0_0_8px_rgba(255,204,122,.6)]">How It Works</a>
            <a href="https://x.com/MorkeDrevos" target="_blank" rel="noopener noreferrer" className="text-[#ffcc7a] hover:drop-shadow-[0_0_8px_rgba(255,204,122,.6)]">
              Community
            </a>
          </nav>

          {/* Copy CA */}
          <div className="hidden sm:flex items-center gap-2 rounded-full bg-[#11281e] border border-[#2b4a39] px-4 py-2">
            <code className="text-xs md:text-sm text-[#ffe5bd] tracking-wide">
              {TOKEN_ADDRESS.slice(0, 6)}…{TOKEN_ADDRESS.slice(-6)}
            </code>
            <button onClick={copyCA} className="px-3 py-1.5 rounded-full bg-[#ffcc7a] text-[#0b1712] text-xs md:text-sm font-bold">
              {copied ? 'Copied!' : 'Copy CA'}
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <video
          src="/img/burning-bear.MP4"
          poster="/img/burning-bear-frame.jpg"
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-[700px] object-cover brightness-[0.55]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0b1712]/40 via-[#0b1712]/55 to-[#0b1712]/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
          <div className="max-w-4xl backdrop-blur-[1px] bg-[#0b1712]/35 p-6 rounded-3xl">
            <h1 className={`${playfair.className} text-[38px] md:text-[72px] leading-[1.08] text-[#FFE7B0] drop-shadow-[0_4px_16px_rgba(255,180,80,.45)]`}>
              Meet <span className="text-[#FFD27F]">Burning Bear</span> —<br className="hidden md:block" />
              <em className="not-italic text-[#EFC97E]/90">the classiest arsonist in crypto.</em>
            </h1>

            <div className="mt-5 text-sm md:text-base uppercase tracking-wide text-[#ffebb7]/80">
              Total Burned (demo)
            </div>

            <div className={`${jua.className} mt-1 text-[60px] md:text-[100px] leading-[0.95] text-[#ffe0a6] drop-shadow-[0_10px_40px_rgba(255,160,80,.35)]`}>
              {fmt(displayBurned)} BEAR
            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              <span className="text-xs md:text-sm tracking-widest uppercase text-[#e9cfa2]/80">
                Next burn in
              </span>
              <div className={`${jura.className} text-[32px] md:text-[48px] text-[#FFD27F]/95 drop-shadow-[0_0_10px_rgba(255,210,127,.5)]`}>
                {countdown.m.toString().padStart(2, '0')}m {countdown.s.toString().padStart(2, '0')}s
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPLY BOARD (new) */}
      <section className="mx-auto max-w-7xl px-4 mt-6">
        <div className="grid md:grid-cols-3 gap-4">
          <SupplyCard label="Initial Supply" value={INITIAL_SUPPLY} />
          <SupplyCard label="Burned (demo)" value={displayBurned} accent />
          <SupplyCard label="Current Supply" value={currentSupplyDisplay} />
        </div>
      </section>

      {/* TOKENOMICS */}
      <section id="tokenomics" className="mx-auto max-w-7xl px-4 py-10">
        <h3 className={`${jua.className} text-3xl md:text-4xl`}>Tokenomics</h3>
        <p className="mt-2 text-sm text-[#cfe3d8]">Simple. Transparent. Built to burn.</p>

        <div className="mt-6 grid md:grid-cols-5 gap-4">
          <article className="p-5 rounded-2xl bg-[#091711]/85 border border-[#21422f]">
            <div className="text-xs uppercase tracking-widest text-[#e9cfa2]/80">Supply</div>
            <div className="text-2xl mt-2 text-[#ffe0a6]">{fmt(INITIAL_SUPPLY)}</div>
          </article>
          <article className="p-5 rounded-2xl bg-[#091711]/85 border border-[#21422f]">
            <div className="text-xs uppercase tracking-widest text-[#e9cfa2]/80">Current</div>
            <div className="text-2xl mt-2 text-[#ffe0a6]">{fmt(currentSupplyExact)}</div>
          </article>
          <article className="p-5 rounded-2xl bg-[#091711]/85 border border-[#21422f]">
            <div className="text-xs uppercase tracking-widest text-[#e9cfa2]/80">Buybacks + Burns</div>
            <div className="text-2xl mt-2 text-[#ffe0a6]">80%</div>
          </article>
          <article className="p-5 rounded-2xl bg-[#091711]/85 border border-[#21422f]">
            <div className="text-xs uppercase tracking-widest text-[#e9cfa2]/80">Team + Marketing</div>
            <div className="text-2xl mt-2 text-[#ffe0a6]">20%</div>
          </article>
          <article className="p-5 rounded-2xl bg-[#091711]/85 border border-[#21422f]">
            <div className="text-xs uppercase tracking-widest text-[#e9cfa2]/80">Taxes</div>
            <div className="text-2xl mt-2 text-[#ffe0a6]">0% — pure meme energy</div>
          </article>
        </div>
      </section>

      {/* LIVE BURN LOG */}
      <section id="live" className="mx-auto max-w-7xl px-4 py-10 pb-24">
        <div className="flex items-center justify-between">
          <h3 className={`${jua.className} text-3xl md:text-4xl`}>Live Burn Log</h3>
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
                  className="h-full bg-gradient-to-r from-[#ffb36b] to-[#ff7a4b] animate-pulse"
                  style={{ width: `${Math.min(100, Math.round((b.amount / 4_800_000) * 100))}%` }}
                />
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS (extra top space already via pb-24 above) */}
      <section id="how" className="mx-auto max-w-7xl px-4 pb-12 pt-2">
        <h3 className={`${jua.className} text-3xl md:text-4xl`}>How it works</h3>
        <div className="mt-4 grid md:grid-cols-3 gap-4 text-[#e9f3ec]">
          <div className="p-5 rounded-xl bg-[#081f16] border border-[#183228]">
            <div className="font-semibold">80% → Buy & Burn</div>
            <div className="text-sm mt-2">Creator fees auto-buy $BEAR and burn them live.</div>
          </div>
          <div className="p-5 rounded-xl bg-[#081f16] border border-[#183228]">
            <div className="font-semibold">20% → Team + Marketing</div>
            <div className="text-sm mt-2">Funds campaigns, growth, and keeping the fire alive.</div>
          </div>
          <div className="p-5 rounded-xl bg-[#081f16] border border-[#183228]">
            <div className="font-semibold">Transparent</div>
            <div className="text-sm mt-2">Every burn is logged with TX link & timestamp.</div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#183228] bg-[#0b1712] text-center">
        <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-[#cbd8cf] space-y-4 leading-relaxed">
          <p className="italic text-[#e9cfa2]">
            Once upon a bear market, one dapper bear decided to fight the winter the only way he knew how, with fire. 🔥
            Now every transaction adds more logs to the blaze. No fake hype. Just steady, satisfying burns.
            <br />
            <br />
            ${TOKEN_SYMBOL} is a meme token with no intrinsic value or expectation of financial return.
            Entertainment only. Always DYOR.
          </p>
          <div className="text-xs mt-6 opacity-75">
            © {new Date().getFullYear()} {TOKEN_NAME} — The Classiest Arsonist in Crypto
          </div>
        </div>
      </footer>

      <style jsx>{`
        .shadow-ember { box-shadow: 0 18px 60px rgba(255, 176, 96, 0.18); }
        @keyframes pulse { 0%{opacity:.95;transform:translateY(0);}50%{opacity:.65;transform:translateY(-3px);}100%{opacity:.95;transform:translateY(0);} }
        .animate-pulse { animation: pulse 1.8s ease-in-out infinite; }
      `}</style>
    </main>
  );
}

// ------------------------------
// Small Supply card component
// ------------------------------
function SupplyCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <article className={`p-5 rounded-2xl border ${accent ? 'bg-[#120d05] border-[#3d2a12]' : 'bg-[#091711]/85 border-[#21422f]'}`}>
      <div className="text-xs uppercase tracking-widest text-[#e9cfa2]/80">{label}</div>
      <div className={`mt-2 ${accent ? 'text-[#ffd79a]' : 'text-[#ffe0a6]'} text-2xl`}>{fmt(value)}</div>
    </article>
  );
}
