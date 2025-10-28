import React from "react";
import { motion } from "framer-motion";
import {
  Lock,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  ShieldCheck,
  HelpCircle,
} from "lucide-react";

type TreasuryLockCardProps = {
  tokenSymbol: string;        // e.g. "BBURN"
  lockedAmount: number;       // e.g. 30000000
  lockedAtISO: string;        // kept for reference, not displayed now
  unlockAtISO: string;        // e.g. "2026-04-28T00:00:00Z"
  escrowUrl: string;          // e.g. "https://lock.jup.ag/escrow/..."
  escrowAddress?: string;     // optional
  recipientAddress?: string;  // optional
  small?: boolean;            // compact pill variant
};

function fmt(num: number) {
  return num.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

const Address = ({ label, value }: { label: string; value?: string }) => {
  if (!value) return null;
  const short =
    value.length > 12 ? `${value.slice(0, 6)}…${value.slice(-6)}` : value;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {}
  };
  return (
    <div className="flex items-center gap-2 text-white/70 text-xs">
      <span className="inline-flex items-center gap-1">
        <ShieldCheck className="w-3.5 h-3.5" /> {label}:
      </span>
      <code className="px-2 py-0.5 rounded bg-white/5 text-white/80">
        {short}
      </code>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-white/10"
        aria-label={`Copy ${label}`}
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export default function TreasuryLockCard(props: TreasuryLockCardProps) {
  const {
    tokenSymbol,
    lockedAmount,
    unlockAtISO,
    escrowUrl,
    escrowAddress,
    recipientAddress,
    small,
  } = props;

  const unlockLabel = new Date(unlockAtISO).toLocaleString();

  // Compact pill for header/nav usage
  if (small) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 border border-emerald-400/25 px-3 py-1 text-emerald-200 text-xs"
      >
        <Lock className="w-3.5 h-3.5" />
        <span>
          Treasury lock:{" "}
          <b className="text-white/90">
            {fmt(lockedAmount)} {tokenSymbol}
          </b>{" "}
          until {unlockLabel}
        </span>
        <a
          href={escrowUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 underline decoration-emerald-400/50 hover:text-white/90"
        >
          Verify <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </motion.div>
    );
  }

  // Full card (no progress, no countdown)
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 14 }}
      className="w-full max-w-3xl rounded-2xl border border-white/10 bg-white/5 backdrop-blur p-5 md:p-6 text-white shadow-[0_8px_40px_rgba(0,0,0,0.35)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="relative grid place-items-center w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
              <Lock className="w-5 h-5 text-emerald-300" />
            </div>
          </div>
          <div>
            <div className="text-sm uppercase tracking-wide text-white/60">
              Treasury Lock
            </div>
            <div className="text-xl md:text-2xl font-semibold">
              {fmt(lockedAmount)} {tokenSymbol} locked
            </div>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs border border-white/10 bg-white/5">
          <Clock className="w-3.5 h-3.5" />
          Unlocks {unlockLabel}
        </span>
      </div>

      {/* Addresses */}
      <div className="mt-5 grid gap-2">
        <Address label="Escrow" value={escrowAddress} />
        <Address label="Recipient (Treasury)" value={recipientAddress} />
      </div>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <a
          href={escrowUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 bg-emerald-500/20 hover:bg-emerald-500/25 border border-emerald-400/30"
        >
          <CheckCircle2 className="w-4 h-4" /> Verify on Jupiter
        </a>
        <div className="group inline-flex items-center gap-2 text-white/70 text-sm">
          <HelpCircle className="w-4 h-4" />
          <span>
            Why it matters: 3% of total supply is locked. No movement possible
            until the unlock date.
          </span>
        </div>
      </div>
    </motion.div>
  );
}
