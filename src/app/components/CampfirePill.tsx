'use client';
import Link from 'next/link';

type Props = {
  label?: string;           // e.g. "Campfire Reward"
  amount?: string;          // e.g. "1,000,000 $BBURN"
  note?: string;            // short rule line
  href?: string;            // full URL for details
};

export default function CampfirePill({
  label = 'Campfire Reward',
  amount = '1,000,000 $BBURN',
  note = 'Claim live within 5 min • rolls forward if unclaimed',
  href = 'https://burningbear.camp/#how-it-works',
}: Props) {
  return (
    <div
      className="
        mx-auto mt-4 w-fit rounded-full border border-amber-400/25
        bg-[linear-gradient(180deg,rgba(34,34,26,.75),rgba(20,20,14,.75))]
        px-5 py-2.5 shadow-[0_0_24px_rgba(255,191,73,.18)] backdrop-blur
        text-amber-50/95
      "
      style={{ boxShadow: '0 0 28px rgba(255,184,76,.15) inset' }}
    >
      <span className="mr-2">🔥🔥🔥</span>
      <span className="font-semibold">{label}:</span>{' '}
      <span className="font-extrabold tracking-wide">{amount}</span>
      <span className="mx-2 text-white/50">•</span>
      <span className="text-white/70">{note}</span>
      <span className="mx-2 text-white/40">•</span>
      <Link
        href="https://burningbear.camp/#how-it-works"
        className="underline decoration-amber-300/40 underline-offset-4 hover:text-amber-100"
        aria-label="Read how it works on burningbear.camp"
      >
        burningbear.camp/#how-it-works
      </Link>
    </div>
  );
}
