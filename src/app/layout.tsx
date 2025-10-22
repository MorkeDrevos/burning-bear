// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'The Burning Bear',
  description: 'Meet The Burning Bear — the classiest arsonist in crypto.',
  icons: {
    icon: '/favicon.ico', // keep your existing favicon
    shortcut: '/img/coin-logo.png',
    apple: '/img/coin-logo.png',
  },
};

const FULL_TOKEN_ADDRESS =
  'So1ana1111111111111111111111111111111111111111111111111'; // <— replace with your real full CA

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-[#0b1712] text-[#f7f3d6] selection:bg-amber-300/20">
        {/* Sticky Header */}
        <header className="sticky top-0 z-40 w-full border-b border-white/10 bg-[#0d1a14]/80 backdrop-blur">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            {/* Logo + Title (logo clickable -> top) */}
            <Link
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="flex items-center gap-3"
            >
              <img
                src="/img/coin-logo.png"
                alt="Burning Bear"
                className="h-8 w-8 rounded-full shadow-amber-500/20"
              />
              <div className="leading-tight">
                <div className="font-extrabold">The Burning Bear</div>
                <div className="text-[11px] text-white/55">$BEAR • Live Burn Camp</div>
              </div>
            </Link>

            {/* Nav */}
            <nav className="hidden gap-8 text-sm md:flex">
              <a href="#log" className="hover:text-amber-300">Live Burns</a>
              <a href="#how" className="hover:text-amber-300">How It Works</a>
            </nav>

            {/* CA + Copy */}
            <div className="flex items-center gap-2">
              <span
                className="hidden rounded-full bg-emerald-900/40 px-3 py-1 text-xs text-emerald-300 md:inline"
                title={FULL_TOKEN_ADDRESS}
              >
                {FULL_TOKEN_ADDRESS.slice(0, 6)}…{FULL_TOKEN_ADDRESS.slice(-4)}
              </span>
              <button
                onClick={async () => {
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
                  const btn = document.getElementById('copy-ca');
                  if (btn) {
                    const old = btn.textContent;
                    btn.textContent = 'Copied!';
                    setTimeout(() => (btn.textContent = old || 'Copy CA'), 1100);
                  }
                }}
                id="copy-ca"
                className="rounded-full bg-[#ffedb3] px-3 py-1 text-sm font-semibold text-black hover:bg-[#ffe48d]"
              >
                Copy CA
              </button>
            </div>
          </div>
        </header>

        <a id="top" className="block h-0 w-0 overflow-hidden" aria-hidden />

        {children}
      </body>
    </html>
  );
}
