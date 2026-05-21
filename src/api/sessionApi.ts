import { mapProfile } from '@/api/mapProfile';
import { hasSupabase } from '@/lib/config';
import { getSupabase } from '@/lib/supabase';
import { getTelegramUser } from '@/lib/telegram';
import type { UserProfile } from '@/types';

let ensurePromise: Promise<UserProfile | null> | null = null;

export async function ensureRemoteUser(): Promise<UserProfile | null> {
  if (!hasSupabase) return null;
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    const sb = getSupabase();
    if (!sb) return null;

    const user = getTelegramUser();
    const { data, error } = await sb.rpc('ensure_user', {
      p_telegram_user: {
        id: user.id,
        first_name: user.first_name,
        username: user.username ?? null,
        avatar_url: user.photo_url ?? null,
      },
    });

    if (error) {
      ensurePromise = null;
      throw error;
    }

    return mapProfile(data as Record<string, unknown> | null);
  })();

  return ensurePromise;
}
