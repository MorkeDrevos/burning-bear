// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react'; // 👈 added for real-time analytics

export const metadata: Metadata = {
  title: 'The Burning Bear – Solana’s Deflation Engine',
  description: 'Real burns. Real buybacks. The deflationary heartbeat of Solana.',
  icons: {
    icon: [
      { url: '/favicon.gif', type: 'image/gif' }, // 🔥 animated favicon
    ],
    shortcut: '/favicon.gif',
    apple: '/img/coin-logo.png', // optional Apple touch icon
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0b1511] text-[#f5efdb] antialiased scroll-smooth">
        {children}

        {/* 🧠 Enables real-time visitor analytics via Vercel */}
        <Analytics />
      </body>
    </html>
  );
}
