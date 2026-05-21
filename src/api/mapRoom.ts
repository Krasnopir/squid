import type { Room } from '@/types';

export function mapRoom(raw: Record<string, unknown> | null): Room | null {
  if (!raw) return null;
  return {
    id: String(raw.id),
    code: String(raw.code),
    hostId: Number(raw.hostId),
    status: raw.status as Room['status'],
    maxPlayers: Number(raw.maxPlayers),
    mode: raw.mode as Room['mode'],
    pot: Number(raw.pot),
    phase: raw.phase as Room['phase'],
    roundIndex: Number(raw.roundIndex),
    phaseEndsAt: raw.phaseEndsAt ? String(raw.phaseEndsAt) : null,
    entryFee: Number(raw.entryFee ?? 10),
    winnerId: raw.winnerId != null ? Number(raw.winnerId) : undefined,
    players: Array.isArray(raw.players)
      ? (raw.players as Record<string, unknown>[]).map(p => ({
          userId: Number(p.userId),
          displayName: String(p.displayName),
          username: p.username ? String(p.username) : undefined,
          seat: Number(p.seat),
          isReady: Boolean(p.isReady),
          isAlive: Boolean(p.isAlive),
          isBot: Boolean(p.isBot),
          voteTarget: p.voteTarget != null ? Number(p.voteTarget) : undefined,
          dilemmaChoice: p.dilemmaChoice as Room['players'][0]['dilemmaChoice'],
          rpsChoice: p.rpsChoice as Room['players'][0]['rpsChoice'],
        }))
      : [],
  };
}
