'use client'

import React, { useState, useEffect } from 'react'
import { Playfair_Display, Jura } from 'next/font/google'

// Fonts
const playfair = Playfair_Display({ weight: ['400', '700'], subsets: ['latin'] })
const jura = Jura({ weight: ['700'], subsets: ['latin'] })

// Config
const TOKEN_SYMBOL = 'BEAR'
const TOKEN_ADDRESS = 'So1ana111111111111111111111111111111111111111'
const BURN_INTERVAL_MS = 600000 // 10 minutes

export default function Page() {
  const [hydrated, setHydrated] = useState(false)
  const [nextBurnAt, setNextBurnAt] = useState(Date.now() + BURN_INTERVAL_MS)
  const [timeLeft, setTimeLeft] = useState(BURN_INTERVAL_MS)

  // Hydration guard
  useEffect(() => {
    setHydrated(true)
  }, [])

  // Countdown timer
  useEffect(() => {
    if (!hydrated) return
    const interval = setInterval(() => {
      const remaining = nextBurnAt - Date.now()
      if (remaining <= 0) {
        setNextBurnAt(Date.now() + BURN_INTERVAL_MS)
        setTimeLeft(BURN_INTERVAL_MS)
      } else {
        setTimeLeft(remaining)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [hydrated, nextBurnAt])

  if (!hydrated) return null

  // Format mm:ss
  const mins = String(Math.floor((timeLeft / 1000 / 60) % 60)).padStart(2, '0')
  const secs = String(Math.floor((timeLeft / 1000) % 60)).padStart(2, '0')

  return (
    <main className="relative min-h-screen text-white overflow-hidden bg-black">
      {/* Background video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-70"
      >
        <source src="/img/burning-bear.MP4" type="video/mp4" />
      </video>

      {/* Overlay */}
      <div className="relative z-10 flex flex-col justify-center items-center text-center min-h-screen bg-black/40 px-6">
        <img
          src="/img/coin-logo.png"
          alt="Burning Bear Logo"
          className="w-24 h-24 mb-4 cursor-pointer"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />

        <h1
          className={`${playfair.className} text-5xl md:text-6xl font-bold text-amber-100 drop-shadow-md`}
        >
          Meet The Burning Bear —<br />the classiest arsonist in crypto.
        </h1>

        {/* Countdown */}
        <div
          className={`${jura.className} mt-10 text-4xl md:text-6xl font-bold text-white drop-shadow-lg`}
        >
          {mins}m {secs}s
        </div>

        {/* Contract address */}
        <div className="mt-8">
          <button
            onClick={() => {
              navigator.clipboard.writeText(TOKEN_ADDRESS)
              alert('Copied contract address!')
            }}
            className="bg-amber-400 hover:bg-amber-500 text-black font-semibold px-6 py-3 rounded-full shadow-lg transition"
          >
            Copy CA
          </button>
        </div>
      </div>

      {/* Spacer for next sections */}
      <div className="h-32 bg-gradient-to-b from-black/80 to-[#0a0a0a]" />
    </main>
  )
}
