'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config / constants
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

type Burn = {
  id: string;
  amount: number;      // BEAR amount
  sol?: number;        // SOL spent (optional)
  timestamp: number;   // ms epoch (UTC)
  tx: string;          // explorer URL
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;
    priceUsdPerSol?: number; // fallback if live price fails
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;

    // easy input: "in 12m", "in 1h 30m" OR "21:30"
    nextBurnSpec?: string;
    nextBuybackSpec?: string;

    // exact targets (ms epoch UTC)
    nextBurnAt?: number;
    nextBuybackAt?: number;

    // or rolling fallback: last* + *IntervalMs
    lastBurnAt?: number;
    lastBuybackAt?: number;
  };
  burns?: Burn[];
};

/* =========================
   Small utils
========================= */
function truncateMiddle(str: string, left = 6, right = 6) {
  if (!str || str.length <= left + right + 1) return str;
  return `${str.slice(0, left)}…${str.slice(-right)}`;
}
function fmtInt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtMoney(n?: number) {
  if (!n || !isFinite(n)) return '$0.00';
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
}
function fmtWhen(ts: number) {
  const d = new Date(ts);
  return d.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}
function fmtCountdown(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0) return `${h}h ${m.toString().padStart(2, '0')}m ${s.toString().padStart(2, '0')}s`;
  return `${m}m ${s.toString().padStart(2, '0')}s`;
}
// parse "in 12m" | "in 1h 30m" | "21:30"
function parseSpecToMsNow(spec?: string): number | undefined {
  if (!spec) return undefined;
  const now = Date.now();
  const s = spec.trim().toLowerCase();

  if (s.startsWith('in')) {
    let mins = 0;
    const h = s.match(/(\d+)\s*h/);
    const m = s.match(/(\d+)\s*m/);
    if (h) mins += parseInt(h[1], 10) * 60;
    if (m) mins += parseInt(m[1], 10);
    return mins > 0 ? now + mins * 60_000 : undefined;
  }

  const hm = s.match(/^(\d{1,2}):(\d{2})$/);
  if (hm) {
    const H = parseInt(hm[1], 10);
    const M = parseInt(hm[2], 10);
    const d = new Date();
    d.setSeconds(0, 0);
    d.setHours(H, M, 0, 0);
    if (d.getTime() <= now) d.setDate(d.getDate() + 1);
    return d.getTime();
  }
  return undefined;
}

/* =========================
   Icons for header
========================= */
function CopyIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M9 9.5A2.5 2.5 0 0 1 11.5 7H17a2 2 0 0 1 2 2v5.5A2.5 2.5 0 0 1 16.5 17H11a2 2 0 0 1-2-2V9.5Z" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M7 14.5A2.5 2.5 0 0 1 4.5 12V6a2 2 0 0 1 2-2H12a2.5 2.5 0 0 1 2.5 2.5" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  );
}
function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" {...props}>
      <path d="M20 6 9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* =========================
   Header components
========================= */
function AddressPill({
  chain = 'Solana',
  address,
  onCopy,
  copied,
}: {
  chain?: string;
  address: string;
  onCopy: () => void;
  copied: boolean;
}) {
  const short = `${address.slice(0, 6)}…${address.slice(-6)}`;
  return (
    <div className="flex items-center gap-2">
      <span className="hidden md:inline select-none rounded-full bg-emerald-900/40 px-3 py-1.5 text-[13px] leading-none text-emerald-300 ring-1 ring-emerald-400/20">
        {chain}
      </span>
      <span
        className="hidden md:inline select-all rounded-full bg-black/30 px-3 py-1.5 text-[13px] leading-none text-white/85 ring-1 ring-white/10"
        title={address}
      >
        {short}
      </span>
      <button
        onClick={onCopy}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition
          ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}
        `}
        aria-live="polite"
        title={copied ? 'Copied!' : 'Copy contract address'}
      >
        {copied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
        {copied ? 'Copied' : 'Copy CA'}
      </button>
    </div>
  );
}

function SiteHeader({
  tokenName,
  tokenSymbol,
  fullAddress,
  onCopyAddress,
  copied,
}: {
  tokenName: string;
  tokenSymbol: string;
  fullAddress: string;
  onCopyAddress: () => void;
  copied: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 w-full bg-[#0c1713]/70 backdrop-blur supports-[backdrop-filter]:bg-[#0c1713]/60 border-b border-white/10">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
        <a href="#top" className="flex items-center gap-3 md:gap-4">
          <img
            src="/img/coin-logo.png"
            alt={tokenName}
            className="h-10 w-10 md:h-12 md:w-12 rounded-full shadow-[0_0_0_1px_rgba(255,255,255,.06)] ring-1 ring-black/20"
          />
          <div className="leading-tight">
            <div className="text-[15px] md:text-[18px] font-extrabold tracking-tight">
              {tokenName}
            </div>
            <div className="text-[11px] md:text-[12px] text-white/60">
              {tokenSymbol} • Live Burn Camp
            </div>
          </div>
        </a>

        <nav className="hidden md:flex items-center gap-8 text-[15px]">
          <a href="#log" className="text-white/85 hover:text-amber-300">Live Burns</a>
          <a href="#how" className="text-white/85 hover:text-amber-300">How It Works</a>
        </nav>

        <AddressPill
          chain="Solana"
          address={fullAddress}
          onCopy={onCopyAddress}
          copied={copied}
        />
      </div>
    </header>
  );
}

/* =========================
   Page
========================= */
export default function Page() {
  const [data, setData] = useState<StateJson | null>(null);
  const [solUsd, setSolUsd] = useState<number | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | null>(null);

  // tick
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // load state.json
  useEffect(() => {
    let alive = true;
    fetch('/data/state.json', { cache: 'no-store' })
      .then(r => r.json())
      .then((j: StateJson) => alive && setData(j))
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // live SOL price (fallback to stats.priceUsdPerSol)
  useEffect(() => {
    let alive = true;
    const fetchPrice = () =>
      fetch('/api/sol-price', { cache: 'no-store' })
        .then(r => r.json())
        .then(o => {
          if (!alive) return;
          if (o && typeof o.usd === 'number' && o.usd > 0) setSolUsd(o.usd);
        })
        .catch(() => {});
    fetchPrice();
    const id = window.setInterval(fetchPrice, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const priceUsdPerSol = solUsd ?? data?.stats?.priceUsdPerSol ?? null;
  const burnsSorted = useMemo(
    () => (data?.burns ?? []).slice().sort((a, b) => b.timestamp - a.timestamp),
    [data]
  );

  // next targets (buyback & burn)
  const targets = useMemo(() => {
    const s = data?.schedule ?? {};
    const nb = parseSpecToMsNow(s.nextBuybackSpec) ?? s.nextBuybackAt
      ?? (s.lastBuybackAt && s.buybackIntervalMs ? s.lastBuybackAt + s.buybackIntervalMs : undefined);
    const burn = parseSpecToMsNow(s.nextBurnSpec) ?? s.nextBurnAt
      ?? (s.lastBurnAt && s.burnIntervalMs ? s.lastBurnAt + s.burnIntervalMs : undefined);
    return { nb, burn };
  }, [data]);

  const nextBuybackMs = targets.nb ? targets.nb - now : 0;
  const nextBurnMs    = targets.burn ? targets.burn - now : 0;

  // headline stats
  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED  = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);
  const TOTAL_SOL = data?.stats?.buybackSol ?? 0;
  const TOTAL_USD = priceUsdPerSol ? TOTAL_SOL * priceUsdPerSol : undefined;

  // “Today” burns & total USD value
  const todayStart = new Date(); todayStart.setHours(0,0,0,0);
  const todaysBurns = burnsSorted.filter(b => b.timestamp >= todayStart.getTime());
  const todaysCount = todaysBurns.length;
  const totalUsdFromSolInLog = priceUsdPerSol
    ? (burnsSorted.reduce((acc, b) => acc + (b.sol ?? 0), 0) * priceUsdPerSol)
    : undefined;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(FULL_TOKEN_ADDRESS);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = FULL_TOKEN_ADDRESS;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main id="top">
      <SiteHeader
        tokenName={TOKEN_NAME}
        tokenSymbol={TOKEN_SYMBOL}
        fullAddress={FULL_TOKEN_ADDRESS}
        onCopyAddress={handleCopy}
        copied={copied}
      />

      {/* ===== Hero with burning video ===== */}
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

        <div className="mx-auto max-w-6xl px-4 pb-10 pt-16 sm:pt-24">
          <h1 className="max-w-4xl text-5xl md:text-6xl font-extrabold leading-tight">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdowns (no boxes) */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <div className="text-[12px] uppercase tracking-[0.25em] text-white/55">
                Next buyback in
              </div>
              <div className="text-[44px] md:text-[56px] font-black leading-none drop-shadow-[0_3px_10px_rgba(0,0,0,.35)]">
                {targets.nb ? fmtCountdown(nextBuybackMs) : '—'}
              </div>
            </div>
            <div>
              <div className="text-[12px] uppercase tracking-[0.25em] text-white/55">
                Next burn in
              </div>
              <div className="text-[44px] md:text-[56px] font-black leading-none drop-shadow-[0_3px_10px_rgba(0,0,0,.35)]">
                {targets.burn ? fmtCountdown(nextBurnMs) : '—'}
              </div>
            </div>
          </div>

          {/* Stat cards */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Initial Supply" value={fmtInt(INITIAL)} />
            <Stat label="Burned"         value={fmtInt(BURNED)} />
            <Stat label="Current Supply" value={fmtInt(CURRENT)} />
            <Stat label="Buyback Spent"  value={`${TOTAL_SOL.toFixed(2)} SOL`} />
          </div>

          <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Badge label={`Today: ${todaysCount} ${todaysCount === 1 ? 'burn' : 'burns'}`} />
            <Badge label={`Total Buyback Value: ${fmtMoney(TOTAL_USD)}`} />
            <Badge label={`Live SOL: ${priceUsdPerSol ? fmtMoney(priceUsdPerSol) : '$—'}`} />
          </div>
        </div>
      </section>

      {/* ===== Live Burn Log ===== */}
      <section id="log" className="mx-auto max-w-6xl px-4 pb-12">
        <h2 className="text-2xl font-bold">Live Burn Log</h2>
        <p className="mt-1 text-sm text-white/50">TX links open explorer.</p>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {burnsSorted.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-6 text-white/60">
              No burns posted yet.
            </div>
          )}
          {burnsSorted.map((b) => (
            <BurnCard key={b.id} burn={b} price={priceUsdPerSol ?? 0} />
          ))}
        </div>

        {typeof totalUsdFromSolInLog === 'number' && (
          <div className="mt-6 text-sm text-white/60">
            Total value in log ≈ <span className="font-semibold">{fmtMoney(totalUsdFromSolInLog)}</span>
          </div>
        )}
      </section>

      {/* ===== How it Works ===== */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="text-2xl font-bold">How It Works</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 text-white/85 md:grid-cols-3">
          <HowCard title="80% → Buy & Burn" body="Creator fees auto-buy $BEAR and burn them live — the campfire never sleeps." />
          <HowCard title="20% → Team + Marketing" body="Fuels growth, creators, memes, and keeping the vibes bright." />
          <HowCard title="Transparent" body="Every buyback & burn is posted with TX link & timestamp. Public wallets, public camp." />
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-white/10 bg-[#0d1a14]">
        <div className="mx-auto max-w-6xl px-4 py-6 text-center text-sm text-white/50">
          Once upon a bear market, one dapper bear decided to fight the winter the only way he knew how, with fire. 🔥
        </div>
      </footer>
    </main>
  );
}

/* =========================
   Page components
========================= */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-white/10 bg-black/25 px-4 py-2 text-sm text-white/80 ring-1 ring-white/5">
      {label}
    </div>
  );
}

function HowCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-lg font-semibold">{title}</div>
      <div className="mt-2 text-sm text-white/75">{body}</div>
    </div>
  );
}

function BurnCard({ burn, price }: { burn: Burn; price: number }) {
  const usd = burn.sol && price ? burn.sol * price : undefined;
  const ageMin = Math.max(0, (Date.now() - burn.timestamp) / 60_000);
  const brightness = Math.max(0.65, 1 - ageMin / 180);
  const progress = Math.min(1, ageMin / 10);

  return (
    <div
      className="rounded-3xl border border-white/10 bg-[#0f1f19] p-5 shadow-lg ring-emerald-500/0 transition hover:ring-2"
      style={{ filter: `brightness(${brightness})` }}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-grid h-12 w-12 place-items-center rounded-full bg-orange-200/90 text-2xl">🔥</span>
          <div>
            <div className="text-lg font-bold">Burn • {fmtInt(burn.amount)} BEAR</div>
            <div className="text-sm text-white/60">{fmtWhen(burn.timestamp)}</div>
            {burn.sol !== undefined && (
              <div className="text-sm text-white/70">
                ≈ {burn.sol.toFixed(4)} SOL {usd ? `(${fmtMoney(usd)})` : ''}
              </div>
            )}
          </div>
        </div>
        <Link
          href={burn.tx}
          target="_blank"
          className="mt-1 text-right text-sm font-semibold text-amber-300 underline-offset-2 hover:underline"
        >
          TX
        </Link>
      </div>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white/5">
        <div
          className="h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500"
          style={{ width: `${Math.floor(progress * 100)}%` }}
        />
      </div>
    </div>
  );
}
