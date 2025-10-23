'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = '$BEAR';
const TOKEN_NAME = 'The Burning Bear';
const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111';

// 🔓 Public, view-only wallet addresses (set yours here)
const BURN_WALLET = 'AsH1VTFRkCdbaHNpRQMYvUvPkPqG5ndKsj2LNfF4m3Lh';
const TREASURY_WALLET = 'E8HKxwByxn4R5TfMnQpVC93JxB1soXSjnCxPEHh88DsH';
const MARKETING_WALLET = 'HLrwEbkDBDo9gDPa2ZH4sC2TowVLXuQa9NoZUMjD6rQP';

// Solana explorer base
const EXPLORER = 'https://explorer.solana.com';

/* =========================
   Types (timestamp can be number or string)
========================= */
type Burn = {
  id: string;
  amount: number;            // BEAR
  sol?: number;              // SOL spent for this burn
  timestamp: number | string; // ms since epoch OR ISO string
  tx: string;
};

type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number;       // total SOL spent on buybacks
    priceUsdPerSol?: number;   // fallback price used if API unavailable
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;
    nextBurnSpec?: string;     // "in 45m" or "21:30"
    nextBuybackSpec?: string;  // "in 12m" or "21:10"
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
function fmtWhen(tsMs: number) {
  const d = new Date(tsMs);
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
// parse "in 12m" or "21:30"
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
// normalize timestamp (string ISO → ms, number → ms)
function toMs(ts: number | string): number {
  return typeof ts === 'number' ? ts : Date.parse(ts);
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

  // tick each second
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // load JSON data (cache-busted) and normalize timestamps
  useEffect(() => {
    let alive = true;
    fetch(`/data/state.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((j: StateJson) => {
        if (!alive) return;
        // normalize burns -> numeric timestamps & drop invalid
        const burns = (j.burns ?? [])
          .map((b) => ({ ...b, timestamp: toMs(b.timestamp) }))
          .filter((b) => Number.isFinite(b.timestamp as number));
        setData({ ...j, burns });
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  // live SOL price (falls back to stats.priceUsdPerSol)
  useEffect(() => {
    let alive = true;
    const fetchPrice = () =>
      fetch('/api/sol-price', { cache: 'no-store' })
        .then((r) => r.json())
        .then((o) => {
          if (!alive) return;
          if (o && typeof o.usd === 'number' && o.usd > 0) setSolUsd(o.usd);
        })
        .catch(() => {});
    fetchPrice();
    const id = window.setInterval(fetchPrice, 60_000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const priceUsdPerSol = solUsd ?? data?.stats?.priceUsdPerSol ?? null;

  // sorted burns (new → old)
  const burnsSorted = useMemo(() => {
    const arr = (data?.burns ?? []) as Array<Burn & { timestamp: number }>;
    return arr.slice().sort((a, b) => a.timestamp - b.timestamp).reverse();
  }, [data]);

  // Next targets
  const targets = useMemo(() => {
    const s = data?.schedule ?? {};
    const nb = parseSpecToMsNow(s.nextBuybackSpec) ?? s.nextBuybackAt;
    const bb = nb ?? (s.lastBuybackAt && s.buybackIntervalMs
      ? s.lastBuybackAt + s.buybackIntervalMs : undefined);
    const nburn = parseSpecToMsNow(s.nextBurnSpec) ?? s.nextBurnAt;
    const burn = nburn ?? (s.lastBurnAt && s.burnIntervalMs
      ? s.lastBurnAt + s.burnIntervalMs : undefined);
    return { bb, burn };
  }, [data]);

  const nextBuybackMs = targets.bb ? targets.bb - now : 0;
  const nextBurnMs = targets.burn ? targets.burn - now : 0;

  const INITIAL = data?.stats?.initialSupply ?? 0;
  const BURNED = data?.stats?.burned ?? 0;
  const CURRENT = data?.stats?.currentSupply ?? Math.max(0, INITIAL - BURNED);

  const totalSolSpent = data?.stats?.buybackSol ?? 0;
  const totalUsd = priceUsdPerSol ? totalSolSpent * priceUsdPerSol : undefined;

  // “Today” and “This Week” derived stats (local time)
  const todayStart = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, []);
  const weekStart = now - 7 * 24 * 60 * 60 * 1000;

  const todayBurnsCount = useMemo(
    () => burnsSorted.filter((b) => (b.timestamp as number) >= todayStart).length,
    [burnsSorted, todayStart]
  );

  const weekStats = useMemo(() => {
    const lastWeek = burnsSorted.filter((b) => (b.timestamp as number) >= weekStart);
    const count = lastWeek.length;
    const sol = lastWeek.reduce((acc, b) => acc + (b.sol ?? 0), 0);
    const usd = priceUsdPerSol ? sol * priceUsdPerSol : undefined;
    const largest = lastWeek.reduce((m, b) => (b.amount > m ? b.amount : m), 0);
    const avgSol = count > 0 ? sol / count : 0;
    return { count, sol, usd, largest, avgSol };
  }, [burnsSorted, weekStart, priceUsdPerSol]);

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
      {/* ===== Sticky Header ===== */}
<header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/90 backdrop-blur-md shadow-lg">
  <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:py-5">
    {/* Logo + Title */}
    <Link href="#top" className="flex items-center gap-3 md:gap-4 min-w-0">
      <img
        src="/img/coin-logo.png"
        alt={TOKEN_NAME}
        className="h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg border border-amber-300/30"
      />
      <div className="leading-tight min-w-0">
        <div className="text-base md:text-xl font-extrabold text-amber-200 tracking-wide drop-shadow-[0_1px_3px_rgba(255,228,141,0.4)] truncate">
          {TOKEN_NAME}
        </div>
        <div className="text-[12px] md:text-sm text-white/55 truncate">
          {TOKEN_SYMBOL} • Live Burn Camp
        </div>
      </div>
    </Link>

    {/* Navigation */}
    <nav className="hidden items-center gap-10 text-[16px] font-semibold md:flex">
      <a
        href="#log"
        className="text-[#ffe48d] hover:text-amber-300 transition drop-shadow-[0_1px_2px_rgba(255,228,141,0.4)]"
      >
        Live Burns
      </a>
      <a
        href="#how"
        className="text-[#ffe48d] hover:text-amber-300 transition drop-shadow-[0_1px_2px_rgba(255,228,141,0.4)]"
      >
        How It Works
      </a>
    </nav>

    {/* Right side */}
    <div className="flex items-center gap-2 md:gap-3">
      <span
        className="hidden md:inline rounded-full bg-emerald-900/40 px-4 py-2 text-sm text-emerald-300 border border-emerald-500/20"
        title={FULL_TOKEN_ADDRESS}
      >
        {truncateMiddle(FULL_TOKEN_ADDRESS)}
      </span>
      <button
        onClick={handleCopy}
        className={`rounded-full px-4 py-2 text-sm md:text-base font-semibold transition
          ${copied
            ? 'bg-emerald-400 text-black'
            : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
        aria-live="polite"
      >
        {copied ? 'Copied!' : 'Copy CA'}
      </button>
    </div>
  </div>
</header>

      {/* ===== Hero with video ===== */}
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
          <h1 className="max-w-4xl text-5xl md:text-6xl font-extrabold leading-tight">
            Meet The Burning Bear — the classiest arsonist in crypto.
          </h1>

          {/* Countdowns */}
          <div className="mt-2 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/55">Next buyback in</div>
              <div className="text-4xl font-extrabold text-white/85 md:text-[44px]">
                {targets.bb ? fmtCountdown(nextBuybackMs) : '—'}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-white/55">Next burn in</div>
              <div className="text-4xl font-extrabold text-white/85 md:text-[44px]">
                {targets.burn ? fmtCountdown(nextBurnMs) : '—'}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Stat label="Initial Supply" value={fmtInt(INITIAL)} />
            <Stat label="Burned" value={fmtInt(BURNED)} />
            <Stat label="Current Supply" value={fmtInt(CURRENT)} />
            <Stat label="Buyback Spent" value={`${(data?.stats?.buybackSol ?? 0).toFixed(2)} SOL`} />
          </div>

          {/* Pill row under stats */}
          <div className="mt-3 flex flex-wrap gap-3">
            <Pill>Today: {todayBurnsCount} burns</Pill>
            <Pill>Total Buyback Value: {fmtMoney(totalUsd)}</Pill>
            <Pill>Live SOL: {priceUsdPerSol ? fmtMoney(priceUsdPerSol) : '—'}</Pill>
          </div>
        </div>
      </section>

      {/* ===== Live Burn Log ===== */}
      <section id="log" className="mx-auto max-w-6xl px-4 pt-2 pb-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-2xl font-bold">Live Burn Log</h2>
          <p className="text-sm text-white/50">TX links open explorer.</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2">
          {burnsSorted.length === 0 && (
            <div className="rounded-3xl border border-white/10 bg-[#0f1f19] p-6 text-white/60">
              No burns posted yet.
            </div>
          )}
          {burnsSorted.map((b) => (
            <BurnCard key={b.id} burn={b as Burn & { timestamp: number }} price={priceUsdPerSol ?? 0} />
          ))}
        </div>
      </section>

      {/* ===== Transparent Wallets ===== */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <h3 className="text-xl font-bold">Transparent Wallets</h3>
        <p className="mt-1 text-sm text-white/55">
          Verify everything on Solana Explorer — all wallets are public and view-only.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <WalletCard
            title="Burn Wallet"
            address={BURN_WALLET}
            note="Destroyed supply lives here forever."
          />
          <WalletCard
            title="Treasury / Buybacks"
            address={TREASURY_WALLET}
            note="Funds for buybacks and operations."
          />
          <WalletCard
            title="Marketing"
            address={MARKETING_WALLET}
            note="Growth, creators, promos."
          />
        </div>
      </section>

      {/* ===== This Week at the Campfire ===== */}
      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h3 className="text-xl font-bold">This Week at the Campfire</h3>
        <p className="mt-1 text-sm text-white/55">
          Activity in the last 7 days. Auto-updated from the live log.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatBig label="Burns" value={fmtInt(weekStats.count)} />
          <StatBig label="SOL Spent" value={`${weekStats.sol.toFixed(3)} SOL`} />
          <StatBig label="USD Value" value={fmtMoney(weekStats.usd)} />
          <StatBig label="Largest Burn (BEAR)" value={fmtInt(weekStats.largest)} />
        </div>

        <div className="mt-3">
          <Pill>Avg per burn: {weekStats.avgSol ? `${weekStats.avgSol.toFixed(3)} SOL` : '—'}</Pill>
        </div>
      </section>

      {/* ===== How it works ===== */}
      <section id="how" className="mx-auto max-w-6xl px-4 pb-16">
        <h3 className="text-xl font-bold">How It Works</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 text-white/85 md:grid-cols-3">
          <HowCard title="80% → Buy & Burn" body="Creator fees auto-buy $BEAR and burn them live — the campfire never sleeps." />
          <HowCard title="20% → Team + Marketing" body="Fuels growth, creators, memes, and keeping the vibes bright." />
          <HowCard title="Transparent" body="Every buyback & burn is posted with a TX link and timestamp." />
        </div>
      </section>

<footer className="border-t border-white/10 bg-[#0d1a14] relative">
  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
  <div className="mx-auto max-w-6xl px-4 py-10 text-center text-sm text-white/60 space-y-4">

    <p className="text-white/80 text-base font-medium">
      🔥 The Burning Bear isn’t just a meme — it’s a movement. <br />
      Transparent, alive, and always feeding the flames.
    </p>

    <div className="flex justify-center gap-6 text-white/60 text-lg">
      <a
        href="https://x.com"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-amber-300 transition"
        title="Follow on X"
      >
        <i className="fa-brands fa-x-twitter"></i>
      </a>
      <a
        href="https://t.me"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-amber-300 transition"
        title="Join Telegram"
      >
        <i className="fa-brands fa-telegram"></i>
      </a>
      <a
        href="https://dexscreener.com"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-amber-300 transition"
        title="View on DexScreener"
      >
        <i className="fa-solid fa-fire"></i>
      </a>
    </div>

    <div className="text-xs text-white/40 pt-4">
      <p>
        © {new Date().getFullYear()} The Burning Bear · Built for fun, not financial advice.  
      </p>
      <p>Stay warm, stay transparent, and keep the fire burning. 🔥</p>
    </div>
  </div>
</footer>
    </main>
  );
}

/* =========================
   Components
========================= */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-[11px] uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-2xl font-extrabold">{value}</div>
    </div>
  );
}
function StatBig({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-6 backdrop-blur">
      <div className="text-xs uppercase tracking-wider text-white/55">{label}</div>
      <div className="mt-1 text-3xl font-extrabold">{value}</div>
    </div>
  );
}
function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/75 backdrop-blur">
      {children}
    </span>
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
function BurnCard({ burn, price }: { burn: Burn & { timestamp: number }; price: number }) {
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

function WalletCard({
  title,
  address,
  note,
}: {
  title: string;
  address: string;
  note?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = address;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1200);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0f1f19]/70 p-5 backdrop-blur">
      <div className="text-sm font-semibold">{title}</div>
      {note && <div className="mt-0.5 text-xs text-white/55">{note}</div>}
      <div className="mt-3 flex items-center justify-between gap-2">
        <code className="truncate rounded-md bg-white/5 px-2 py-1 text-[13px] text-white/80">
          {truncateMiddle(address, 8, 8)}
        </code>
        <div className="flex items-center gap-2">
          <a
            href={`${EXPLORER}/address/${address}`}
            target="_blank"
            className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-sm text-white/80 hover:bg-white/10"
          >
            View
          </a>
          <button
            onClick={handleCopy}
            className={`rounded-full px-3 py-1 text-sm font-semibold transition ${copied ? 'bg-emerald-400 text-black' : 'bg-[#ffedb3] text-black hover:bg-[#ffe48d]'}`}
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>
    </div>
  );
}
