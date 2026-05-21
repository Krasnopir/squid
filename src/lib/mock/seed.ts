import type { CosmeticItem, LeaderboardEntry, UserProfile } from '@/types';
import { getTelegramUser } from '@/lib/telegram';
import { SIGNUP_COINS } from '@/lib/config';

export function seedProfile(): UserProfile {
  const u = getTelegramUser();
  return {
    id: u.id,
    firstName: u.first_name,
    username: u.username,
    level: 3,
    xp: 240,
    xpToNext: 400,
    gamesPlayed: 45,
    wins: 12,
    globalRank: 152,
    coins: SIGNUP_COINS,
    stars: 0,
  };
}

export const SEED_COSMETICS: CosmeticItem[] = [
  { id: 'neon', name: 'Неон', category: 'avatar', price: 120, preview: '🟣' },
  { id: 'mask', name: 'Маска', category: 'avatar', price: 200, preview: '🎭' },
  { id: 'crown', name: 'Корона', category: 'avatar', price: 500, preview: '👑' },
  { id: 'fire', name: 'Огонь', category: 'emote', price: 80, preview: '🔥' },
  { id: 'skull', name: 'Череп', category: 'emote', price: 150, preview: '💀' },
  { id: 'vip_room', name: 'VIP комната', category: 'upgrade', price: 300, preview: '⭐' },
];

export const SEED_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, userId: 1, displayName: 'CryptoKing', username: 'cryptoking', wins: 89, score: 12400 },
  { rank: 2, userId: 2, displayName: 'DarkLord', username: 'darklord', wins: 76, score: 10200 },
  { rank: 3, userId: 3, displayName: 'NeonFox', username: 'neonfox', wins: 64, score: 8900 },
  { rank: 4, userId: 4, displayName: 'TrustMaster', username: 'trustmaster', wins: 52, score: 7100 },
  { rank: 5, userId: 5, displayName: 'Shadow', username: 'shadow', wins: 41, score: 5800 },
];
