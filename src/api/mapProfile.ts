import { SIGNUP_COINS } from '@/lib/config';
import { getTelegramUser } from '@/lib/telegram';
import type { UserProfile } from '@/types';

export function mapProfile(raw: Record<string, unknown> | null): UserProfile {
  const user = getTelegramUser();

  return {
    id: Number(raw?.id ?? user.id),
    firstName: String(raw?.firstName ?? raw?.first_name ?? user.first_name),
    username: raw?.username ? String(raw.username) : user.username,
    level: Number(raw?.level ?? 1),
    xp: Number(raw?.xp ?? 0),
    xpToNext: Number(raw?.xpToNext ?? raw?.xp_to_next ?? 100),
    gamesPlayed: Number(raw?.gamesPlayed ?? raw?.games_played ?? 0),
    wins: Number(raw?.wins ?? 0),
    globalRank: Number(raw?.globalRank ?? raw?.global_rank ?? 0),
    coins: Number(raw?.coins ?? SIGNUP_COINS),
    stars: Number(raw?.stars ?? 0),
  };
}
