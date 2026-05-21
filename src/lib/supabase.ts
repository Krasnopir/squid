import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { hasSupabase } from '@/lib/config';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;

let client: SupabaseClient<Database> | null = null;

export function getSupabase(): SupabaseClient<Database> | null {
  if (!hasSupabase) return null;
  if (!client) {
    client = createClient<Database>(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
    );
  }
  return client;
}

export const supabase = getSupabase();
