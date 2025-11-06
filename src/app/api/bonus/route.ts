import { NextResponse } from 'next/server';
import { readBonus, writeBonus, type BonusState } from './_store';

// GET → current state
export async function GET() {
  const state = await readBonus();
  return NextResponse.json(state, { headers: { 'cache-control': 'no-store' } });
}

// POST → mutate state with simple actions
// body: { action: "...", payload?: {...} }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { action, payload } = body || {};
  let state = await readBonus();

  switch (action) {
    case 'open': {
      const { round, reward, closesAt } = payload || {};
      state.round = typeof round === 'number' ? round : state.round;
      state.reward = typeof reward === 'number' ? reward : state.reward;
      state.status = 'open';
      state.openedAt = Date.now();
      state.closesAt = typeof closesAt === 'number' ? closesAt : state.closesAt;
      state.winner = null;
      state.claimDeadlineAt = null;
      state.claimedBy = null;
      break;
    }

    case 'close-window': {
      // typically called at burn time
      state.status = 'picking';
      break;
    }

    case 'rollover-100': {
      // add 100% to next round and advance round
      state.history.push({ ...state, archivedAt: Date.now() });
      state = {
        round: state.round + 1,
        reward: state.reward * 2,
        status: 'open',
        openedAt: Date.now(),
        closesAt: payload?.closesAt ?? null,
        winner: null,
        claimDeadlineAt: null,
        claimedBy: null,
        history: state.history,
      } as BonusState;
      break;
    }

    case 'mark-paid': {
      // after sending payout
      state.status = 'paid';
      break;
    }

    default:
      return NextResponse.json({ error: 'unknown-action' }, { status: 400 });
  }

  await writeBonus(state);
  return NextResponse.json(state);
}
