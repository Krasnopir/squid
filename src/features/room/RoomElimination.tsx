import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { PlayerGrid } from '@/components/ui/PlayerGrid';
import { Timer } from '@/components/ui/Timer';
import { tickRoomState } from '@/api/roomApi';
import { hapticNotification } from '@/lib/telegram';
import type { Room } from '@/types';
import { useRoomStore } from '@/store/roomStore';

export function RoomElimination({ room }: { room: Room }) {
  const setRoom = useRoomStore(s => s.setRoom);
  const [busy, setBusy] = useState(false);
  const eliminatedIds = new Set(room.lastEliminatedIds ?? (room.lastEliminated ? [room.lastEliminated.userId] : []));
  const eliminated = room.players.filter(p => eliminatedIds.has(p.userId));
  const remaining = room.players.filter(p => p.isAlive);
  const reason = room.lastVoteResult?.reason;
  const reasonText =
    reason === 'majority'
      ? 'Большинство выбрало цель.'
      : reason === 'tie'
        ? 'Голоса разделились, система добила случайностью.'
        : 'Комната не набрала активность, система выбила случайно.';

  useEffect(() => {
    hapticNotification('warning');
  }, []);

  const advance = async () => {
    setBusy(true);
    try {
      const next = await tickRoomState(room.id);
      setRoom(next);
    } finally {
      setBusy(false);
    }
  };

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
            {eliminated.length > 1
              ? `${eliminated.map(p => p.displayName).join(', ')} выбыли`
              : `${eliminated[0]?.displayName ?? 'Игрок'} выбыл`}
          </h1>
          <p className="text-sm text-[var(--app-hint)] mt-2">{reasonText}</p>
          <div className="mt-4 flex justify-center">
            <Timer endsAt={room.phaseEndsAt} label="Следующий шаг" />
          </div>
        </motion.div>
      </AnimatePresence>
      {!!room.lastVoteResult?.tally.length && (
        <div className="card-surface w-full max-w-sm p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--app-hint)]">
            Расклад голосов
          </p>
          <div className="flex flex-col gap-2">
            {room.lastVoteResult.tally.map(row => {
              const player = room.players.find(p => p.userId === row.userId);
              return (
                <div key={row.userId} className="flex items-center justify-between text-sm">
                  <span>{player?.displayName ?? 'Игрок'}</span>
                  <span className="font-semibold text-[var(--trust-gold)]">{row.votes}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <PlayerGrid players={remaining} />
      <button type="button" className="btn-primary w-full max-w-sm py-4" onClick={advance} disabled={busy}>
        {busy ? 'Продвигаем…' : 'Продолжить'}
      </button>
    </div>
  );
}
