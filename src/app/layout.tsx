// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Burning Bear',
  description: 'Meet The Burning Bear — the classiest arsonist in crypto.',
  icons: { icon: '/favicon.ico', apple: '/img/coin-logo.png', shortcut: '/img/coin-logo.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b1712] text-[#f7e6c2] font-sans selection:bg-amber-300/30">
        <a id="top" />
        {children}
      </body>
    </html>
  );
}
