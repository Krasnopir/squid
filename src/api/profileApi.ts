import { mapProfile } from '@/api/mapProfile';
import { ensureRemoteUser } from '@/api/sessionApi';
import { useMock } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { getTelegramUser } from '@/lib/telegram';
import type { LeaderboardEntry, UserProfile } from '@/types';

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  if (useMock) return [];
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb.rpc('get_leaderboard', { p_limit: 50 });
  if (error) throw error;

  return Array.isArray(data)
    ? (data as Record<string, unknown>[]).map((row, index) => ({
        rank: Number(row.rank ?? index + 1),
        userId: Number(row.userId ?? row.user_id),
        displayName: String(row.displayName ?? row.display_name ?? 'Игрок'),
        username: row.username ? String(row.username) : undefined,
        wins: Number(row.wins ?? 0),
        gamesPlayed: Number(row.gamesPlayed ?? row.games_played ?? 0),
        score: Number(row.score ?? 0),
      }))
    : [];
}

export async function claimRoomReward(roomId: string): Promise<{ reward: number; profile: UserProfile | null }> {
  if (useMock) return { reward: 0, profile: null };
  await ensureRemoteUser();
  const sb = getSupabase();
  if (!sb) return { reward: 0, profile: null };

  const { data, error } = await sb.rpc('claim_room_reward', {
    p_room_id: roomId,
    p_user_id: getTelegramUser().id,
  });
  if (error) throw error;

  const raw = data as Record<string, unknown> | null;
  return {
    reward: Number(raw?.reward ?? 0),
    profile: mapProfile((raw?.profile as Record<string, unknown> | null) ?? null),
  };
}
