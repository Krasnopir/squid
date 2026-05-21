import { SIGNUP_COINS } from '@/lib/config';
import { getTelegramUser } from '@/lib/telegram';
import type { UserProfile } from '@/types';

function numberOr(value: unknown, fallback: number): number {
  const n = Number(value ?? fallback);
  return Number.isFinite(n) ? n : fallback;
}

export function mapProfile(raw: Record<string, unknown> | null): UserProfile {
  const user = getTelegramUser();

  return {
    id: numberOr(raw?.id, user.id),
    firstName: String(raw?.firstName ?? raw?.first_name ?? user.first_name),
    username: raw?.username ? String(raw.username) : user.username,
    level: numberOr(raw?.level, 1),
    xp: numberOr(raw?.xp, 0),
    xpToNext: numberOr(raw?.xpToNext ?? raw?.xp_to_next, 100),
    gamesPlayed: numberOr(raw?.gamesPlayed ?? raw?.games_played, 0),
    wins: numberOr(raw?.wins, 0),
    globalRank: numberOr(raw?.globalRank ?? raw?.global_rank, 0),
    coins: numberOr(raw?.coins, SIGNUP_COINS),
    stars: numberOr(raw?.stars, 0),
  };
}
