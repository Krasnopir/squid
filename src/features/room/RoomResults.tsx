import { motion } from 'framer-motion';
import { Link } from '@tanstack/react-router';
import { Share2, Trophy } from 'lucide-react';

import { getTelegramUser, hapticNotification, shareResult } from '@/lib/telegram';
import { useSessionStore } from '@/store/sessionStore';
import type { Room } from '@/types';

export function RoomResults({ room }: { room: Room }) {
  const me = getTelegramUser();
  const { profile, addCoins, setProfile } = useSessionStore();
  const won = room.winnerId === me.id;
  const alive = room.players.filter(p => p.isAlive);
  const splitWin = !room.winnerId && room.status === 'finished';

  const claim = () => {
    const amount = splitWin
      ? Math.floor(room.pot / Math.max(1, alive.length))
      : won
        ? room.pot
        : 0;
    if (amount > 0) {
      addCoins(amount);
      setProfile({
        wins: profile.wins + (won ? 1 : 0),
        gamesPlayed: profile.gamesPlayed + 1,
        xp: profile.xp + (won ? 50 : 15),
      });
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
        {won || splitWin ? `+${splitWin ? Math.floor(room.pot / alive.length) : room.pot} монет` : 'Повезёт в следующий раз'}
      </p>
      <div className="player-avatar alive mx-auto w-20 h-20 text-2xl border-[var(--trust-gold)]">
        {me.first_name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <button type="button" className="btn-primary py-4 w-full" onClick={claim}>
          Забрать награду
        </button>
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
