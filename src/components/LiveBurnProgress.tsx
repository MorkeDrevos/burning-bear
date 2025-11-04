"use client";
import React, { useEffect, useState } from "react";

type Props = {
  nextBurnAt: number;
  burnIntervalMs: number;
  width?: number;
};

export default function LiveBurnProgress({
  nextBurnAt,
  burnIntervalMs,
  width = 24,
}: Props) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const msRemaining = Math.max(0, nextBurnAt - now);
  const ratio = Math.min(1, Math.max(0, 1 - msRemaining / Math.max(1, burnIntervalMs)));
  const filled = Math.round(ratio * width);
  const empty = Math.max(0, width - filled);
  const bar = "[" + "█".repeat(filled) + "░".repeat(empty) + "]";

  const fmt = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  };

  return (
    <div className="font-mono text-[15px] sm:text-base tracking-tight text-amber-100/90">
      <span className="mr-2">{bar}</span>
      <span>
        Next burn in <span className="font-semibold">{fmt(msRemaining)}</span>
      </span>
    </div>
  );
}
