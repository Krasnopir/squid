export type Phase =
  | 'lobby'
  | 'vote'
  | 'dilemma'
  | 'dilemma_reveal'
  | 'reveal_elimination'
  | 'finals'
  | 'finals_reveal'
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
  leftAt?: string;
  lastSeenAt?: string;
  afkStrikes?: number;
  voteTarget?: number;
  dilemmaChoice?: DilemmaChoice;
  rpsChoice?: RpsChoice;
}

export interface Room {
  id: string;
  code: string;
  hostId: number;
  status: 'waiting' | 'playing' | 'finished' | 'cancelled' | 'expired';
  maxPlayers: number;
  mode: 'classic' | 'duel';
  pot: number;
  phase: Phase;
  roundIndex: number;
  phaseEndsAt: string | null;
  entryFee: number;
  players: RoomPlayer[];
  lastEliminated?: RoomPlayer;
  lastEliminatedIds?: number[];
  lastVoteResult?: {
    reason: 'majority' | 'tie' | 'low_turnout';
    tally: Array<{ userId: number; votes: number }>;
  };
  lastDilemmaResult?: {
    outcome: 'split' | 'risk';
    splitCount: number;
    riskCount: number;
    endMatch: boolean;
  };
  lastFinalResult?: {
    choices: Array<{ userId: number; choice: RpsChoice }>;
    winnerId?: number;
    draw: boolean;
  };
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
  gamesPlayed?: number;
  score: number;
}
