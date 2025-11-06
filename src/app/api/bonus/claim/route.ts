import { NextResponse } from 'next/server';
import { readBonus, writeBonus } from '../_store';

// POST body: { address: string }
export async function POST(req: Request) {
  const { address } = await req.json().catch(() => ({}));
  if (!address) return NextResponse.json({ error: 'no-address' }, { status: 400 });

  const state = await readBonus();
  if (state.status !== 'claim' || !state.winner) {
    return NextResponse.json({ error: 'not-claimable' }, { status: 409 });
  }

  const now = Date.now();
  if (state.claimDeadlineAt && now > state.claimDeadlineAt) {
    // too late → roll 100%
    state.history.push({ ...state, rolledAt: now });
    const next = {
      round: state.round + 1,
      reward: state.reward * 2,
      status: 'open',
      openedAt: now,
      closesAt: null,
      winner: null,
      claimDeadlineAt: null,
      claimedBy: null,
      history: state.history,
    };
    await writeBonus(next as any);
    return NextResponse.json({ rolledOver: true, nextRound: next.round });
  }

  if (address !== state.winner.address) {
    return NextResponse.json({ error: 'wrong-address' }, { status: 401 });
  }

  state.claimedBy = { address, at: now };
  state.status = 'paid'; // mark as paid after you actually transfer the tokens
  await writeBonus(state);

  return NextResponse.json({ ok: true, round: state.round });
}
