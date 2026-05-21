import { seedProfile } from '@/lib/mock/seed';
import { getTelegramUser } from '@/lib/telegram';
import type { UserProfile } from '@/types';

export function mapProfile(raw: Record<string, unknown> | null): UserProfile {
  const user = getTelegramUser();
  const fallback = seedProfile();

  return {
    ...fallback,
    id: Number(raw?.id ?? user.id),
    firstName: String(raw?.firstName ?? raw?.first_name ?? user.first_name),
    username: raw?.username ? String(raw.username) : user.username,
    level: Number(raw?.level ?? fallback.level),
    xp: Number(raw?.xp ?? fallback.xp),
    xpToNext: Number(raw?.xpToNext ?? raw?.xp_to_next ?? fallback.xpToNext),
    gamesPlayed: Number(raw?.gamesPlayed ?? raw?.games_played ?? fallback.gamesPlayed),
    wins: Number(raw?.wins ?? fallback.wins),
    globalRank: Number(raw?.globalRank ?? raw?.global_rank ?? fallback.globalRank),
    coins: Number(raw?.coins ?? fallback.coins),
    stars: Number(raw?.stars ?? fallback.stars),
  };
}
