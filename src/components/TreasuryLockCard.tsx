import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Lock, CheckCircle2, Clock, Copy, ExternalLink, ShieldCheck, HelpCircle } from "lucide-react";

/**
 * TreasuryLockCard
 * Elegant, self‑contained UI to showcase a time‑locked treasury on the landing page.
 *
 * Features
 * - Prominent "Locked until" chip with live countdown
 * - Copy‑to‑clipboard for escrow + recipient addresses
 * - "Verify on Jupiter" link
 * - Progress bar from lock start → unlock (optional)
 * - Lightweight, Tailwind‑only styling (fits dark hero sections)
 * - No external data required; pass props from your CMS/config
 */

type TreasuryLockCardProps = {
  tokenSymbol: string; // e.g. "BBURN"
  lockedAmount: number; // e.g. 30000000
  
  // ISO strings
  lockedAtISO: string; // e.g. "2025-10-28T12:00:00Z"
  unlockAtISO: string; // e.g. "2026-04-28T00:00:00Z"

  escrowUrl: string; // e.g. "https://lock.jup.ag/escrow/7ZXV..."
  escrowAddress?: string; // optional, shows copy button if provided
  recipientAddress?: string; // optional, your treasury vault

  small?: boolean; // compact variant for hero header bar
};

function fmt(num: number) {
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

function useCountdown(targetISO: string) {
  const target = useMemo(() => new Date(targetISO).getTime(), [targetISO]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = Math.max(0, target - now);
  const s = Math.floor(diff / 1000);
  const days = Math.floor(s / 86400);
  const hours = Math.floor((s % 86400) / 3600);
  const minutes = Math.floor((s % 3600) / 60);
  const seconds = s % 60;
  const done = diff === 0;

  return { days, hours, minutes, seconds, done, diffMs: diff };
}

const Address = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  const short = value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;
  const copy = async () => {
    try { await navigator.clipboard.writeText(value); } catch {}
  };
  return (
    <div className="flex items-center gap-2 text-white/70 text-xs">
      <span className="inline-flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5" /> {label}:</span>
      <code className="px-2 py-0.5 rounded bg-white/5 text-white/80">{short}</code>
      <button onClick={copy} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10" aria-label={`Copy ${label}`}>
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default function TreasuryLockCard(props: TreasuryLockCardProps) {
  const { tokenSymbol, lockedAmount, lockedAtISO, unlockAtISO, escrowUrl, escrowAddress, recipientAddress, small } = props;
  const { days, hours, minutes, seconds, done, diffMs } = useCountdown(unlockAtISO);

  const totalMs = useMemo(() => {
    const a = new Date(lockedAtISO).getTime();
    const b = new Date(unlockAtISO).getTime();
    return Math.max(1, b - a);
  }, [lockedAtISO, unlockAtISO]);
  const elapsedMs = useMemo(() => {
    const a = new Date(lockedAtISO).getTime();
    return Math.min(totalMs, Math.max(0, Date.now() - a));
  }, [lockedAtISO, totalMs]);
  const pct = Math.round((elapsedMs / totalMs) * 100);

  if (small) {
    // Compact pill for header/nav usage
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/25 px-3 py-1 text-emerald-200 text-xs"
      >
        <Lock className="w-3.5 h-3.5" />
        <span>
          Treasury lock: <b className="text-white/90">{fmt(lockedAmount)} {tokenSymbol}</b>
          {" "}until {new Date(unlockAtISO).toLocaleString()}
        </span>
        <a href={escrowUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline decoration-emerald-400/50 hover:text-white/90">
          Verify <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 120, damping: 14 }}
      className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 md:p-6 text-white shadow-[0_8px_40px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="absolute inset-0 blur-md bg-emerald-400/30 rounded-xl" />
            <div className="relative grid place-items-center w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
              <Lock className="w-5 h-5 text-emerald-300" />
            </div>
          </div>
          <div>
            <div className="text-sm uppercase tracking-wide text-white/60">Treasury Lock</div>
            <div className="text-xl md:text-2xl font-semibold">
              {fmt(lockedAmount)} {tokenSymbol} locked
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border border-white/10 bg-white/5">
          <Clock className="w-3.5 h-3.5" />
          {done ? "Unlocked" : `Unlocks ${new Date(unlockAtISO).toLocaleString()}`}
        </span>
      </div>

      {/* Progress */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-white/60">
          <span>Progress</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 mt-1 rounded-full bg-white/10 overflow-hidden">
          <motion.div className="h-full bg-emerald-400" initial={{ width: 0 }} animate={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Countdown */}
      {!done && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[{label:"Days",v:days},{label:"Hours",v:hours},{label:"Minutes",v:minutes},{label:"Seconds",v:seconds}].map((x) => (
            <div key={x.label} className="rounded-xl bg-black/30 border border-white/10 p-3 text-center">
              <div className="text-2xl font-semibold tabular-nums">{x.v.toString().padStart(2,'0')}</div>
              <div className="text-[11px] tracking-wider uppercase text-white/55">{x.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Addresses */}
      <div className="mt-4 grid gap-2">
        <Address label="Escrow" value={escrowAddress} />
        <Address label="Recipient (Treasury)" value={recipientAddress} />
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a href={escrowUrl} target="_blank" rel="noreferrer"
           className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/25 border border-emerald-400/30">
          <CheckCircle2 className="w-4 h-4" /> Verify on Jupiter
        </a>
        <div className="group inline-flex items-center gap-2 text-white/70 text-sm">
          <HelpCircle className="w-4 h-4" />
          <span>Why it matters: 3% of total supply is locked. No movement possible until the unlock date.</span>
        </div>
      </div>
    </motion.div>
  );
}

// --- Example usage (drop this into your page) ---
// <TreasuryLockCard
//   tokenSymbol="BBURN"
//   lockedAmount={30000000}
//   lockedAtISO="2025-10-28T12:00:00Z"
//   unlockAtISO="2026-04-28T00:00:00Z"
//   escrowUrl="https://lock.jup.ag/escrow/7ZXVVqndPktLXQ5FsmLMniwhUGvNFVJyKgVKR8tVpx77"
//   escrowAddress="7ZXVVqndPktLXQ5FsmLMniwhUGvNFVJyKgVKR8tVpx77"
//   recipientAddress="FH2EathAXbSScfmb2Zn4FYVEbjLwGo7QoSNxvNxQZ5qE"
// />

// For a small pill in the hero header next to your countdown:
// <TreasuryLockCard
//   tokenSymbol="BBURN"
//   lockedAmount={30000000}
//   lockedAtISO="2025-10-28T12:00:00Z"
//   unlockAtISO="2026-04-28T00:00:00Z"
//   escrowUrl="https://lock.jup.ag/escrow/7ZXVVqndPktLXQ5FsmLMniwhUGvNFVJyKgVKR8tVpx77"
//   small
// />
