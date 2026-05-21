import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';

import { PlayerGrid } from '@/components/ui/PlayerGrid';
import { hapticNotification } from '@/lib/telegram';
import type { Room } from '@/types';

export function RoomElimination({ room }: { room: Room }) {
  const eliminated = room.lastEliminated;
  const remaining = room.players.filter(p => p.isAlive);

  useEffect(() => {
    hapticNotification('warning');
  }, []);

  return (
    <div className="elimination-bg page-scroll page-pad flex flex-col items-center justify-center gap-6 min-h-full">
      <AnimatePresence>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: [0, -2, 2, 0] }}
            transition={{ repeat: 3, duration: 0.3 }}
            className="text-6xl mb-4"
          >
            💥
          </motion.div>
          <h1 className="text-2xl font-bold text-[var(--trust-red)]">
            {eliminated?.displayName ?? 'Игрок'} выбыл
          </h1>
          <p className="text-sm text-[var(--app-hint)] mt-2">Остальные продолжают…</p>
        </motion.div>
      </AnimatePresence>
      <PlayerGrid players={remaining} />
    </div>
  );
}
