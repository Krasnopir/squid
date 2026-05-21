export const hasSupabase = !!(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export const useMock =
  !hasSupabase || import.meta.env.VITE_USE_MOCK === 'true';

export const ROOM_ENTRY_FEE = Number(import.meta.env.VITE_ROOM_ENTRY_FEE ?? 10);
export const SIGNUP_COINS = Number(import.meta.env.VITE_SIGNUP_COINS ?? 50);

export const PHASE_DURATIONS = {
  lobby: 0,
  vote: 30,
  dilemma: 25,
  reveal_elimination: 3,
  finals: 15,
  results: 60,
} as const;
