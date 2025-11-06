import { NextResponse } from 'next/server';
import { readBonus, writeBonus, hashToInt } from '../_store';

// POST body: { burnTxSig: string, buyers: string[] }
export async function POST(req: Request) {
  const { burnTxSig, buyers } = await req.json().catch(() => ({}));
  if (!burnTxSig || !Array.isArray(buyers) || buyers.length === 0) {
    return NextResponse.json({ error: 'invalid-input' }, { status: 400 });
  }

  const state = await readBonus();
  if (state.status !== 'picking') {
    return NextResponse.json({ error: `bad-status:${state.status}` }, { status: 409 });
  }

  const uniq = Array.from(new Set(buyers.filter(Boolean)));
  const idx = hashToInt(burnTxSig) % uniq.length;
  const winner = uniq[idx];

  state.winner = { address: winner, pickedAt: Date.now(), burnTxSig };
  state.status = 'claim';
  state.claimDeadlineAt = Date.now() + 5 * 60 * 1000; // 5 minutes
  await writeBonus(state);

  return NextResponse.json({
    round: state.round,
    winner,
    buyersCount: uniq.length,
    burnTxSig,
    claimDeadlineAt: state.claimDeadlineAt,
  });
}
