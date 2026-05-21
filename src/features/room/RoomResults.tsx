import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Share2, Trophy } from 'lucide-react';
import { useState } from 'react';

import { getTelegramUser, hapticNotification, shareResult } from '@/lib/telegram';
import { useSessionStore } from '@/store/sessionStore';
import type { Room } from '@/types';

export function RoomResults({ room }: { room: Room }) {
  const me = getTelegramUser();
  const { profile, addCoins, setProfile } = useSessionStore();
  const won = room.winnerId === me.id;
  const alive = room.players.filter(p => p.isAlive);
  const splitWin = !room.winnerId && room.status === 'finished';
  const reward = splitWin
    ? Math.floor(room.pot / Math.max(1, alive.length))
    : won
      ? room.pot
      : 0;
  const [claimed, setClaimed] = useState(false);

  const claim = () => {
    if (reward > 0 && !claimed) {
      addCoins(reward);
      setProfile({
        wins: profile.wins + (won ? 1 : 0),
        gamesPlayed: profile.gamesPlayed + 1,
        xp: profile.xp + (won ? 50 : 15),
      });
      setClaimed(true);
      hapticNotification('success');
    }
  };

  return (
    <div className="page-scroll page-pad flex flex-col items-center gap-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 12 }}
      >
        <Trophy size={64} className="text-[var(--trust-gold)] mx-auto" style={{ filter: 'drop-shadow(var(--glow-gold))' }} />
      </motion.div>
      <h1 className="text-3xl font-bold">
        {splitWin ? 'Банк поделён!' : won ? 'Победа!' : 'Игра окончена'}
      </h1>
      <p className="text-[var(--trust-gold)] text-xl font-semibold">
        {reward > 0 ? `+${reward} игровых монет` : 'Вы выбыли без награды'}
      </p>
      <div className="player-avatar alive mx-auto w-20 h-20 text-2xl border-[var(--trust-gold)]">
        {me.first_name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        {reward > 0 && (
          <button type="button" className="btn-primary py-4 w-full" onClick={claim} disabled={claimed}>
            {claimed ? 'Награда начислена' : 'Забрать игровые монеты'}
          </button>
        )}
        <button
          type="button"
          className="card-surface py-3 w-full flex items-center justify-center gap-2"
          onClick={() => shareResult(`Я ${won ? 'победил' : 'сыграл'} в Игре на доверие! 🎭`)}
        >
          <Share2 size={18} /> Поделиться
        </button>
        <Link to="/" className="text-[var(--app-link)] text-sm py-2">
          Ещё раз
        </Link>
      </div>
    </div>
  );
}
