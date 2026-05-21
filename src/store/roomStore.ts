import { create } from 'zustand';

import type { Room } from '@/types';

interface RoomState {
  currentRoom: Room | null;
  queueStatus: 'idle' | 'searching' | 'matched';
  setRoom: (room: Room | null) => void;
  updateRoom: (updater: (r: Room) => Room) => void;
  setQueueStatus: (s: RoomState['queueStatus']) => void;
}

export const useRoomStore = create<RoomState>(set => ({
  currentRoom: null,
  queueStatus: 'idle',
  setRoom: currentRoom => set({ currentRoom }),
  updateRoom: updater =>
    set(s => (s.currentRoom ? { currentRoom: updater(s.currentRoom) } : {})),
  setQueueStatus: queueStatus => set({ queueStatus }),
}));
