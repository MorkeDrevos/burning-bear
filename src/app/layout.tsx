import './globals.css';
import type { Metadata } from 'next';
import HeaderClient from '@/components/HeaderClient';

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
    <html lang="en" className="scroll-smooth">
      <body className="bg-[#0b1712] text-[#f7f3d6] selection:bg-amber-300/20">
        {/* all interactivity lives inside this client component */}
        <HeaderClient />

        {/* anchor for "back to top" */}
        <a id="top" className="block h-0 w-0 overflow-hidden" aria-hidden />

        {children}
      </body>
    </html>
  );
}
