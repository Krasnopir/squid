import type { Room } from '@/types';

function numberOr(value: unknown, fallback: number): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function mapRoom(raw: Record<string, unknown> | null): Room | null {
  if (!raw) return null;
  if (!raw.id || !raw.code || !raw.status || !Array.isArray(raw.players)) return null;

  const maxPlayers = numberOr(raw.maxPlayers, 2);

  return {
    id: String(raw.id),
    code: String(raw.code),
    hostId: numberOr(raw.hostId, 0),
    status: raw.status as Room['status'],
    maxPlayers,
    mode: (raw.mode as Room['mode']) ?? (maxPlayers <= 2 ? 'duel' : 'classic'),
    pot: numberOr(raw.pot, 0),
    phase: (raw.phase as Room['phase']) ?? 'lobby',
    roundIndex: numberOr(raw.roundIndex, 0),
    phaseEndsAt: raw.phaseEndsAt ? String(raw.phaseEndsAt) : null,
    entryFee: numberOr(raw.entryFee, 10),
    winnerId: raw.winnerId != null ? numberOr(raw.winnerId, 0) : undefined,
    players: (raw.players as Record<string, unknown>[]).map((p, index) => ({
      userId: numberOr(p.userId, 0),
      displayName: String(p.displayName),
      username: p.username ? String(p.username) : undefined,
      seat: numberOr(p.seat, index),
      isReady: Boolean(p.isReady),
      isAlive: Boolean(p.isAlive),
      isBot: Boolean(p.isBot),
      leftAt: p.leftAt ? String(p.leftAt) : undefined,
      lastSeenAt: p.lastSeenAt ? String(p.lastSeenAt) : undefined,
      afkStrikes: numberOr(p.afkStrikes, 0),
      voteTarget: p.voteTarget != null ? numberOr(p.voteTarget, 0) : undefined,
      dilemmaChoice: p.dilemmaChoice as Room['players'][0]['dilemmaChoice'],
      rpsChoice: p.rpsChoice as Room['players'][0]['rpsChoice'],
    })),
    lastEliminatedIds: Array.isArray(raw.lastEliminatedIds)
      ? raw.lastEliminatedIds.map(id => Number(id))
      : undefined,
    lastVoteResult: raw.lastVoteResult as Room['lastVoteResult'],
    lastDilemmaResult: raw.lastDilemmaResult as Room['lastDilemmaResult'],
    lastFinalResult: raw.lastFinalResult as Room['lastFinalResult'],
  };
}
