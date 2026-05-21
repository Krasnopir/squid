import type { DilemmaChoice, RoomPlayer } from '@/types';

export interface DilemmaResult {
  outcome: 'split' | 'risk';
  endMatch: boolean;
  splitCount: number;
  riskCount: number;
}

export function resolveDilemma(
  alive: RoomPlayer[],
  choices: Map<number, DilemmaChoice>,
): DilemmaResult {
  const aliveIds = alive.map(p => p.userId);
  let split = 0;
  let risk = 0;
  for (const id of aliveIds) {
    const c = choices.get(id);
    if (c === 'split') split++;
    else if (c === 'risk') risk++;
    else risk++;
  }
  if (split > risk) return { outcome: 'split', endMatch: true, splitCount: split, riskCount: risk };
  if (risk > split) return { outcome: 'risk', endMatch: false, splitCount: split, riskCount: risk };
  const outcome = Math.random() > 0.5 ? 'split' : 'risk';
  return { outcome, endMatch: outcome === 'split', splitCount: split, riskCount: risk };
}
