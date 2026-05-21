import type { Phase } from '@/types';

export interface SchedulerState {
  aliveCount: number;
  roundIndex: number;
  mode: 'classic' | 'duel';
}

export function nextPhase(state: SchedulerState): Phase {
  const { aliveCount, roundIndex, mode } = state;
  if (mode === 'duel' || aliveCount <= 2) return 'finals';
  if (roundIndex === 1 && aliveCount >= 3) return 'dilemma';
  return 'vote';
}

export function estimateTotalRounds(startCount: number, hasDilemma: boolean): number {
  if (startCount <= 2) return 1;
  const eliminations = startCount - 1;
  return eliminations + (hasDilemma && startCount >= 3 ? 0 : 0);
}
