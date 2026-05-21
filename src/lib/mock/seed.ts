import type { UserProfile } from '@/types';
import { getTelegramUser } from '@/lib/telegram';
import { SIGNUP_COINS } from '@/lib/config';

export function seedProfile(): UserProfile {
  const u = getTelegramUser();
  return {
    id: u.id,
    firstName: u.first_name,
    username: u.username,
    level: 1,
    xp: 0,
    xpToNext: 100,
    gamesPlayed: 0,
    wins: 0,
    globalRank: 0,
    coins: SIGNUP_COINS,
    stars: 0,
  };
}
