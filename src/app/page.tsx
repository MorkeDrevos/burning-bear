"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";

/* =========================
   Config
========================= */
const TOKEN_SYMBOL = "$BEAR";
const TOKEN_NAME = "The Burning Bear";
const FULL_TOKEN_ADDRESS =
  "So1ana1111111111111111111111111111111111111111111111111";

// 🔓 Public, view-only wallet addresses (set yours here)
const BURN_WALLET = "AsH1VTFRkCdbaHNpRQMYvUvPkPqG5ndKsj2LNfF4m3Lh";
const TREASURY_WALLET = "E8HKxwByxn4R5TfMnQpVC93JxB1soXSjnCxPEHh88DsH";
const MARKETING_WALLET = "HLrwEbkDBDo9gDPa2ZH4sC2TowVLXuQa9NoZUMjD6rQP";

// Solana explorer base
const EXPLORER = "https://explorer.solana.com";

/* =========================
   Types (timestamp can be number or string)
========================= */
export type Burn = {
  id: string;
  amount: number; // BEAR
  sol?: number; // SOL spent for this burn
  timestamp: number | string; // ms since epoch OR ISO string
  tx: string;
};

export type StateJson = {
  stats: {
    initialSupply: number;
    burned: number;
    currentSupply: number;
    buybackSol?: number; // total SOL spent on buybacks
    priceUsdPerSol?: number; // fallback price used if API unavailable
  };
  schedule?: {
    burnIntervalMs?: number;
    buybackIntervalMs?: number;
    nextBurnSpec?: string; // "in 45m" or "21:30"
    nextBuybackSpec?: string; // "in 12m" or "21:10"
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
  return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
}
function fmtMoney(n?: number) {
  if (!n || !isFinite(n)) return "$0.00";
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}
function fmtWhen(tsMs: number) {
  const d = new Date(tsMs);
  return d.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
function fmtCountdown(ms: number) {
  const t = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h > 0)
    return `${h}h ${m.toString().padStart(2, "0")}m ${s
      .toString()
      .padStart(2, "0")}s`;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}
// parse "in 12m" or "21:30"
function parseSpecToMsNow(spec?: string): number | undefined {
  if (!spec) return undefined;
  const now = Date.now();
  const s = spec.trim().toLowerCase();

  if (s.startsWith("in")) {
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
  return typeof ts === "number" ? ts : Date.parse(ts);
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
    fetch(`/data/state.json?t=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((j: StateJson) => {
        if (!alive) return;
        const burns = (j.burns ?? [])
          .map((b) => ({ ...b, timestamp: toMs(b.timestamp) }))
          .filter((b) => Number.isFinite(b.timestamp as number));
        setData({ ...j, burns });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // live SOL price (falls back to stats.priceUsdPerSol)
  useEffect(() => {
    let alive = true;
    const fetchPrice = () =>
      fetch("/api/sol-price", { cache: "no-store" })
        .then((r) => r.json())
        .then((o) => {
          if (!alive) return;
          if (o && typeof o.usd === "number" && o.usd > 0) setSolUsd(o.usd);
        })
        .catch(() => {});
    fetchPrice();
    const id = window.setInterval(fetchPrice, 60_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
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
    const bb =
      nb ?? (s.lastBuybackAt && s.buybackIntervalMs
        ? s.lastBuybackAt + s.buybackIntervalMs
        : undefined);
    const nburn = parseSpecToMsNow(s.nextBurnSpec) ?? s.nextBurnAt;
    const burn =
      nburn ?? (s.lastBurnAt && s.burnIntervalMs
        ? s.lastBurnAt + s.burnIntervalMs
        : undefined);
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
      const ta = document.createElement("textarea");
      ta.value = FULL_TOKEN_ADDRESS;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <main id="top" className="bg-[#0b1712] text-white min-h-screen">
      {/* ===== Sticky Header (mobile-first) ===== */}
      <header className="sticky top-0 z-30 w-full border-b border-white/10 bg-[#0d1a14]/90 backdrop-blur-md shadow-lg">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex items-center justify-between py-3 md:py-4 gap-3">
            {/* Logo + Title */}
            <Link href="#top" className="flex items-center gap-3 min-w-0">
              <img
                src="/img/coin-logo.png"
                alt={TOKEN_NAME}
                className="h-12 w-12 md:h-14 md:w-14 rounded-full shadow-lg border border-amber-300/30 shrink-0"
              />
              <div className="leading-tight min-w-0">
                <div className="text-sm md:text-xl font-extrabold text-amber-200 tracking-wide drop-shadow-[0_1px_3px_rgba(255,228,141,0.4)] truncate">
                  {TOKEN_NAME}
                </div>
                <div className="text-[11px] md:text-sm text-white/55 truncate">
                  {TOKEN_SYMBOL} • Live Burn Camp
                </div>
              </div>
            </Link>

            {/* Right-side actions (mobile shows compact) */}
            <div className="flex items-center gap-2 md:gap-3">
              <a
                href={`https://jup.ag/swap/SOL-${encodeURIComponent(FULL_TOKEN_ADDRESS)}`}
                className="hidden sm:inline-flex rounded-xl bg-emerald-500/90 hover:bg-emerald-500 text-[13px] md:text-sm font-semibold px-3 py-2 transition"
              >
                Buy on Jupiter
              </a>
              <a
                href={"#contract"}
                className="inline-flex rounded-xl bg-amber-500/90 hover:bg-amber-500 text-[13px] md:text-sm font-semibold px-3 py-2 transition"
              >
                Contract
              </a>
            </div>
          </div>

          {/* Scrollable mobile nav */}
          <nav className="-mb-px flex gap-4 overflow-x-auto pb-2 text-xs md:hidden">
            {[
              ["Overview", "#overview"],
              ["Burns", "#burns"],
              ["Schedule", "#schedule"],
              ["Wallets", "#wallets"],
              ["How to Buy", "#how"],
              ["Disclaimer", "#disclaimer"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-medium hover:bg-white/10"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section id="overview" className="mx-auto max-w-6xl px-4 pt-6 md:pt-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 items-start">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight text-amber-200">
              {TOKEN_NAME} <span className="text-amber-400">{TOKEN_SYMBOL}</span>
            </h1>
            <p className="mt-2 text-sm md:text-base text-white/80">
              90% of creator fees auto-buy back and burn. 10% fuels growth. Watch
              the bear throw more coins into the fire as burns get bigger.
            </p>

            {/* Contract box */}
            <div id="contract" className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] md:text-sm text-white/70">
                  Contract
                </div>
                <button
                  onClick={handleCopy}
                  className="rounded-lg border border-white/10 bg-white/10 px-2 py-1 text-[11px] md:text-xs hover:bg-white/15"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <code className="mt-2 block break-all text-[11px] md:text-sm text-white/90">
                {FULL_TOKEN_ADDRESS}
              </code>
              <div className="mt-2 flex flex-wrap gap-2 text-[11px] md:text-xs">
                <a
                  className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/15"
                  href={`${EXPLORER}/address/${FULL_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  View on Explorer ↗
                </a>
                <a
                  className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/15"
                  href={`https://birdeye.so/token/${FULL_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Birdeye ↗
                </a>
                <a
                  className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/15"
                  href={`https://dexscreener.com/solana/${FULL_TOKEN_ADDRESS}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  DexScreener ↗
                </a>
              </div>
            </div>
          </div>

          {/* Countdown / Stats card */}
          <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-900/20 via-black/20 to-amber-900/20 p-4 md:p-6">
            <div className="grid grid-cols-2 gap-3 md:gap-4 text-center">
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-[11px] md:text-xs text-white/70">Next Buyback</div>
                <div className="mt-1 text-lg md:text-2xl font-bold">
                  {nextBuybackMs > 0 ? fmtCountdown(nextBuybackMs) : "—"}
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3">
                <div className="text-[11px] md:text-xs text-white/70">Next Burn</div>
                <div className="mt-1 text-lg md:text-2xl font-bold">
                  {nextBurnMs > 0 ? fmtCountdown(nextBurnMs) : "—"}
                </div>
              </div>
              <div className="rounded-xl bg-white/5 p-3 col-span-2">
                <div className="text-[11px] md:text-xs text-white/70">Total SOL Spent</div>
                <div className="mt-1 text-base md:text-xl font-bold">
                  {totalSolSpent.toFixed(2)} SOL
                  {totalUsd ? <span className="text-white/70"> ({fmtMoney(totalUsd)})</span> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Burns Table ===== */}
      <section id="burns" className="mx-auto max-w-6xl px-4 mt-8 md:mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-lg md:text-2xl font-bold">Recent Burns</h2>
          <div className="text-[11px] md:text-sm text-white/70">
            Today: <span className="font-semibold text-white/90">{todayBurnsCount}</span>
          </div>
        </div>

        <div className="mt-3 overflow-x-auto rounded-2xl border border-white/10">
          <table className="min-w-full text-left text-[12px] md:text-sm">
            <thead className="bg-white/5">
              <tr>
                <th className="px-3 py-2 md:px-4">When</th>
                <th className="px-3 py-2 md:px-4">Amount (BEAR)</th>
                <th className="px-3 py-2 md:px-4">SOL Spent</th>
                <th className="px-3 py-2 md:px-4">Tx</th>
              </tr>
            </thead>
            <tbody>
              {burnsSorted.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-6 text-center text-white/60">
                    No burns yet.
                  </td>
                </tr>
              )}
              {burnsSorted.map((b) => (
                <tr key={b.id} className="odd:bg-white/0 even:bg-white/5">
                  <td className="px-3 py-2 md:px-4 whitespace-nowrap">{fmtWhen(b.timestamp as number)}</td>
                  <td className="px-3 py-2 md:px-4">{fmtInt(b.amount)}</td>
                  <td className="px-3 py-2 md:px-4">{b.sol?.toFixed(3) ?? "—"}</td>
                  <td className="px-3 py-2 md:px-4">
                    <a
                      className="inline-block max-w-[180px] truncate align-middle rounded-md bg-white/10 px-2 py-1 hover:bg-white/15"
                      href={`${EXPLORER}/tx/${b.tx}`}
                      target="_blank"
                      rel="noreferrer"
                      title={b.tx}
                    >
                      {truncateMiddle(b.tx, 8, 8)} ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Weekly stats */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-[11px] md:text-xs text-white/70">Burns (7d)</div>
            <div className="mt-1 text-base md:text-xl font-bold">{weekStats.count}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-[11px] md:text-xs text-white/70">SOL Spent (7d)</div>
            <div className="mt-1 text-base md:text-xl font-bold">{weekStats.sol.toFixed(2)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-[11px] md:text-xs text-white/70">Largest Burn (BEAR)</div>
            <div className="mt-1 text-base md:text-xl font-bold">{fmtInt(weekStats.largest)}</div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <div className="text-[11px] md:text-xs text-white/70">Avg SOL / burn</div>
            <div className="mt-1 text-base md:text-xl font-bold">{weekStats.avgSol.toFixed(2)}</div>
          </div>
        </div>
      </section>

      {/* ===== Wallets ===== */}
      <section id="wallets" className="mx-auto max-w-6xl px-4 mt-10">
        <h2 className="text-lg md:text-2xl font-bold">Public Wallets</h2>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            ["Burn Wallet", BURN_WALLET],
            ["Treasury Wallet", TREASURY_WALLET],
            ["Marketing Wallet", MARKETING_WALLET],
          ].map(([label, addr]) => (
            <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] md:text-xs text-white/70">{label}</div>
              <code className="mt-1 block break-all text-[12px] md:text-sm">{addr}</code>
              <div className="mt-2 flex gap-2 text-[11px] md:text-xs">
                <a
                  className="rounded-md bg-white/10 px-2 py-1 hover:bg-white/15"
                  href={`${EXPLORER}/address/${addr}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Explorer ↗
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== How to Buy ===== */}
      <section id="how" className="mx-auto max-w-6xl px-4 mt-10">
        <h2 className="text-lg md:text-2xl font-bold">How to Buy</h2>
        <ol className="mt-2 list-decimal pl-5 text-sm md:text-base space-y-1 text-white/85">
          <li>Get SOL in your wallet (Phantom, Solflare, Backpack).</li>
          <li>
            Use Jupiter to swap SOL for {TOKEN_SYMBOL} →
            <a
              className="ml-1 underline hover:no-underline"
              href={`https://jup.ag/swap/SOL-${encodeURIComponent(FULL_TOKEN_ADDRESS)}`}
              target="_blank"
              rel="noreferrer"
            >
              Open Jupiter ↗
            </a>
          </li>
          <li>Verify the contract address matches exactly.</li>
        </ol>
      </section>

      {/* ===== Disclaimer ===== */}
      <section id="disclaimer" className="mx-auto max-w-6xl px-4 mt-10 mb-16">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-xs md:text-sm text-white/70">
          This is a meme coin with a burn mechanic. No financial advice. No
          promises of profit. Always DYOR and never invest more than you can
          afford to lose.
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-[11px] text-white/60">
        © {new Date().getFullYear()} {TOKEN_NAME}. All fun, no guarantees.
      </footer>
    </main>
  );
}
