export const queryKeys = {
  profile: ['profile'] as const,
  room: (id: string) => ['room', id] as const,
  leaderboard: (period: string) => ['leaderboard', period] as const,
  cosmetics: ['cosmetics'] as const,
};
