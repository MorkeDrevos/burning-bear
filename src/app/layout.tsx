// src/app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The Burning Bear – the classiest arsonist in crypto.',
  description: 'Live buybacks and burns with on-chain TX links.',
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
      </body>
    </html>
  );
}
