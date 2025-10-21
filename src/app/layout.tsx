// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Burning Bear',
  description: 'Meet The Burning Bear — the classiest arsonist in crypto.',
  icons: {
    icon: '/img/coin-logo.png',        // use PNG directly
    apple: '/img/coin-logo.png',       // iOS home screen
    shortcut: '/img/coin-logo.png',    // fallback
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0b1712] text-[#f7e6c2] font-sans">
        {children}
      </body>
    </html>
  )
}
