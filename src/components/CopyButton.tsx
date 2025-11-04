"use client";

import { useState, useRef } from "react";
import { Check, Copy } from "lucide-react";

type CopyButtonProps = {
  value: string;
  className?: string;
  copiedMs?: number;
  label?: string;
};

export default function CopyButton({
  value,
  className = "",
  copiedMs = 1200,
  label = "Copy to clipboard",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = value;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setCopied(false), copiedMs);
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      aria-label={label}
      className={[
        "inline-flex h-9 w-9 items-center justify-center rounded-lg",
        "bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition active:scale-95",
        className,
      ].join(" ")}
    >
      <span
        className="grid place-items-center"
        aria-live="polite"
        aria-atomic="true"
      >
        {copied ? (
          <Check className="h-5 w-5 text-emerald-400" />
        ) : (
          <Copy className="h-5 w-5 text-white/80" />
        )}
      </span>
    </button>
  );
}
