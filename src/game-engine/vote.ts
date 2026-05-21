import type { RoomPlayer } from '@/types';

export interface VoteResult {
  eliminated: RoomPlayer[];
  reason: 'majority' | 'tie' | 'low_turnout';
}

export function resolveVote(
  alive: RoomPlayer[],
  votes: Map<number, number>,
): VoteResult {
  const aliveIds = new Set(alive.map(p => p.userId));
  const votedCount = [...votes.keys()].filter(id => aliveIds.has(id)).length;
  const turnout = alive.length > 0 ? votedCount / alive.length : 0;

  const tally = new Map<number, number>();
  for (const [, target] of votes) {
    if (!aliveIds.has(target) || target === 0) continue;
    tally.set(target, (tally.get(target) ?? 0) + 1);
  }

  if (tally.size === 0 || turnout < 0.5) {
    return {
      eliminated: pickRandom(alive, calcElimCount(alive.length, 2)),
      reason: 'low_turnout',
    };
  }

  const maxVotes = Math.max(...tally.values());
  const leaders = [...tally.entries()].filter(([, c]) => c === maxVotes).map(([id]) => id);

  if (leaders.length > 1) {
    const targets = alive.filter(p => leaders.includes(p.userId));
    return {
      eliminated: pickRandom(targets.length ? targets : alive, calcElimCount(alive.length, 2)),
      reason: 'tie',
    };
  }

  const targetId = leaders[0]!;
  const target = alive.find(p => p.userId === targetId);
  return {
    eliminated: target ? [target] : pickRandom(alive, 1),
    reason: 'majority',
  };
}

export function calcElimCount(aliveCount: number, requested: number): number {
  return Math.min(requested, Math.max(0, aliveCount - 2));
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const pool = [...arr];
  const out: T[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    out.push(pool.splice(idx, 1)[0]!);
  }
  return out;
}
