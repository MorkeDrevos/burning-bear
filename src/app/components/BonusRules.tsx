export default function BonusRules({ jupUrl }: { jupUrl: string }) {
  return (
    <section id="bonus" className="mx-auto max-w-6xl px-4 pt-10 pb-8">
      <div className="rounded-2xl border border-amber-400/20 bg-white/[0.04] backdrop-blur-md p-6 md:p-8">
        <h3 className="text-2xl md:text-3xl font-bold text-amber-300">
          Campfire Bonus Round 1 — 1,000,000 $BBURN
        </h3>
        <p className="mt-2 text-white/70">
          Buy any amount of $BBURN before the next burn. One buyer wins{' '}
          <span className="font-semibold text-amber-200">1,000,000 $BBURN</span>.
          Claim within <span className="font-semibold text-amber-200">5 minutes</span> or the full prize rolls over to the next burn.
        </p>

        <ul className="mt-5 space-y-2 text-white/75 text-sm md:text-base">
          <li>• <b>Window:</b> now → next burn confirmation (snapshot at burn TX).</li>
          <li>• <b>Entries:</b> 1 entry per buy (multiple buys = multiple entries).</li>
          <li>• <b>Eligibility:</b> normal buyer wallets only; LP/contract/treasury/team excluded.</li>
          <li>• <b>Winner pick:</b> hash(last burn tx) selects an index from eligible wallets.</li>
          <li>• <b>Claim:</b> winner has 5 minutes to claim.</li>
          <li>• <b>Rollover:</b> unclaimed → 100% added to the next Campfire Bonus.</li>
          <li>• <b>Payout:</b> sent from treasury; tx posted in the Live Burn Log.</li>
          <li>• <b>Anti-abuse:</b> wash/self-swaps may be disqualified. Void where prohibited.</li>
        </ul>

        <div className="mt-5 flex flex-wrap gap-3">
          <a
            href={jupUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-400
                       text-[#120d05] font-semibold px-4 py-2 ring-1 ring-amber-300/40 hover:brightness-110"
          >
            Buy $BBURN on Jupiter
          </a>
          <a href="#log" className="inline-flex items-center gap-2 rounded-xl border border-white/12 bg-white/5 px-4 py-2 text-white/80 hover:bg-white/10">
            See Live Burn Log
          </a>
        </div>
      </div>
    </section>
  );
}
