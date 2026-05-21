import type { DilemmaChoice, RoomPlayer } from '@/types';

export interface DilemmaResult {
  outcome: 'split' | 'risk';
  endMatch: boolean;
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
  if (split > risk) return { outcome: 'split', endMatch: true };
  if (risk > split) return { outcome: 'risk', endMatch: false };
  return { outcome: Math.random() > 0.5 ? 'split' : 'risk', endMatch: split >= risk };
}
