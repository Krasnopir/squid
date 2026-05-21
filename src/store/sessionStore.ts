import { create } from 'zustand';

import { useMock } from '@/lib/config';
import { seedProfile } from '@/lib/mock/seed';
import { getTelegramUser, isTMA } from '@/lib/telegram';
import type { UserProfile } from '@/types';

interface SessionState {
  user: ReturnType<typeof getTelegramUser>;
  profile: UserProfile;
  loading: boolean;
  tutorialSeen: boolean;
  setProfile: (p: Partial<UserProfile>) => void;
  addCoins: (n: number) => void;
  setLoading: (v: boolean) => void;
  markTutorialSeen: () => void;
}

export const useSessionStore = create<SessionState>((set, get) => ({
  user: getTelegramUser(),
  profile: seedProfile(),
  loading: isTMA() && !useMock,
  tutorialSeen: localStorage.getItem('trust_tutorial_seen') === '1',
  setProfile: p => set({ profile: { ...get().profile, ...p } }),
  addCoins: n => set({ profile: { ...get().profile, coins: get().profile.coins + n } }),
  setLoading: loading => set({ loading }),
  markTutorialSeen: () => {
    localStorage.setItem('trust_tutorial_seen', '1');
    set({ tutorialSeen: true });
  },
}));
