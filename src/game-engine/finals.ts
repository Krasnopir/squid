import type { RpsChoice, RoomPlayer } from '@/types';

export interface RpsResult {
  winner: RoomPlayer | null;
  draw: boolean;
}

const BEATS: Record<RpsChoice, RpsChoice> = {
  rock: 'scissors',
  paper: 'rock',
  scissors: 'paper',
};

export function resolveRps(p1: RoomPlayer, c1: RpsChoice, p2: RoomPlayer, c2: RpsChoice): RpsResult {
  if (c1 === c2) return { winner: null, draw: true };
  if (BEATS[c1] === c2) return { winner: p1, draw: false };
  return { winner: p2, draw: false };
}
