import { motion } from 'framer-motion';
import { Hand, Scissors, Scroll } from 'lucide-react';

import { castRps } from '@/api/roomApi';
import { Timer } from '@/components/ui/Timer';
import { getTelegramUser } from '@/lib/telegram';
import type { Room, RpsChoice } from '@/types';

const RPS: { choice: RpsChoice; Icon: typeof Hand; label: string }[] = [
  { choice: 'rock', Icon: Hand, label: 'Камень' },
  { choice: 'paper', Icon: Scroll, label: 'Бумага' },
  { choice: 'scissors', Icon: Scissors, label: 'Ножницы' },
];

export function RoomFinals({ room, onUpdate }: { room: Room; onUpdate: (r: Room) => void }) {
  const alive = room.players.filter(p => p.isAlive);
  const me = getTelegramUser();
  const opponent = alive.find(p => p.userId !== me.id);
  const myChoice = alive.find(p => p.userId === me.id)?.rpsChoice;

  const pick = async (choice: RpsChoice) => {
    const r = await castRps(room.id, choice);
    onUpdate(r);
  };

  return (
    <div className="page-scroll page-pad flex flex-col gap-6">
      <div className="text-center">
        <p className="text-sm text-[var(--trust-gold)] font-semibold">ФИНАЛ</p>
        <Timer endsAt={room.phaseEndsAt} />
      </div>
      <div className="flex justify-between items-center card-surface p-4">
        <div className="text-center">
          <div className="player-avatar alive mx-auto">Вы</div>
          <p className="text-xs mt-1">{myChoice ?? '…'}</p>
        </div>
        <span className="text-2xl font-bold text-[var(--trust-red)]">VS</span>
        <div className="text-center">
          <div className="player-avatar alive mx-auto">
            {opponent?.displayName.slice(0, 2).toUpperCase()}
          </div>
          <p className="text-xs mt-1">{opponent?.displayName}</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {RPS.map(({ choice, Icon, label }) => (
          <motion.button
            key={choice}
            whileTap={{ scale: 0.92 }}
            disabled={!!myChoice}
            onClick={() => pick(choice)}
            className={`card-surface flex flex-col items-center gap-2 py-6 disabled:opacity-70 ${
              myChoice === choice ? 'border-[var(--trust-gold)] bg-[var(--trust-gold)]/10' : ''
            }`}
          >
            <Icon size={36} className="text-[var(--trust-gold)]" />
            <span className="text-sm">{label}</span>
          </motion.button>
        ))}
      </div>
      {myChoice && (
        <p className="text-center text-sm text-[var(--app-hint)]">
          Выбор принят. Ждем соперника или окончание таймера.
        </p>
      )}
    </div>
  );
}
