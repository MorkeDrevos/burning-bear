// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import HeaderClient from '@/components/HeaderClient';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'The Burning Bear',
  description: 'Meet The Burning Bear — the classiest arsonist in crypto.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/img/coin-logo.png',
    apple: '/img/coin-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body className="bg-[#0b1712] text-[#f7f3d6] selection:bg-amber-300/20">
        {/* Header is a client component (safe for onClick, copy, etc.) */}
        <HeaderClient />

        {children}
      </body>
    </html>
  );
}
