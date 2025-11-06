import { promises as fs } from 'fs';
import path from 'path';

export type BonusState = {
  round: number;
  reward: number; // BBURN
  status: 'open' | 'picking' | 'claim' | 'rolled' | 'paid';
  openedAt: number | null;
  closesAt: number | null;
  winner: null | { address: string; pickedAt: number; burnTxSig: string };
  claimDeadlineAt: number | null;
  claimedBy: null | { address: string; at: number };
  history: Array<any>;
};

const FILE = path.join(process.cwd(), 'public', 'data', 'bonus.json');

export async function readBonus(): Promise<BonusState> {
  const raw = await fs.readFile(FILE, 'utf8');
  return JSON.parse(raw);
}

export async function writeBonus(state: BonusState) {
  const json = JSON.stringify(state, null, 2);
  await fs.writeFile(FILE, json, 'utf8');
  return state;
}

// deterministic hash → int
export function hashToInt(s: string) {
  let h = 0 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}
