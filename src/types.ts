export type Phase =
  | 'lobby'
  | 'vote'
  | 'dilemma'
  | 'reveal_elimination'
  | 'finals'
  | 'results';

export type DilemmaChoice = 'split' | 'risk';
export type RpsChoice = 'rock' | 'paper' | 'scissors';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface RoomPlayer {
  userId: number;
  displayName: string;
  username?: string;
  avatarUrl?: string;
  seat: number;
  isReady: boolean;
  isAlive: boolean;
  isBot: boolean;
  voteTarget?: number;
  dilemmaChoice?: DilemmaChoice;
  rpsChoice?: RpsChoice;
}

export interface Room {
  id: string;
  code: string;
  hostId: number;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  mode: 'classic' | 'duel';
  pot: number;
  phase: Phase;
  roundIndex: number;
  phaseEndsAt: string | null;
  entryFee: number;
  players: RoomPlayer[];
  lastEliminated?: RoomPlayer;
  winnerId?: number;
}

export interface UserProfile {
  id: number;
  firstName: string;
  username?: string;
  level: number;
  xp: number;
  xpToNext: number;
  gamesPlayed: number;
  wins: number;
  globalRank: number;
  coins: number;
  stars: number;
}

export interface CosmeticItem {
  id: string;
  name: string;
  category: 'upgrade' | 'avatar' | 'emote';
  price: number;
  preview: string;
  owned?: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: number;
  displayName: string;
  username?: string;
  wins: number;
  score: number;
}
