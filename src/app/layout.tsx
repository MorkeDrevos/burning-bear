import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Burning Bear – the classiest arsonist in crypto.',
  description: 'Live buybacks and burns with on-chain TX links.',
  icons: {
    icon: '/favicon.gif', // 🔥 use your new animated favicon
    apple: '/img/coin-logo.png',
    shortcut: '/img/coin-logo.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b1511] text-[#f5efdb] antialiased scroll-smooth">
        {children}
      </body>
    </html>
  );
}
