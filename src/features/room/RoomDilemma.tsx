import { motion } from 'framer-motion';

import { castDilemma } from '@/api/roomApi';
import { Timer } from '@/components/ui/Timer';
import { getTelegramUser } from '@/lib/telegram';
import type { Room } from '@/types';

export function RoomDilemma({ room, onUpdate }: { room: Room; onUpdate: (r: Room) => void }) {
  const alive = room.players.filter(p => p.isAlive);
  const me = getTelegramUser();
  const myChoice = alive.find(p => p.userId === me.id)?.dilemmaChoice;

  const choose = async (choice: 'split' | 'risk') => {
    const r = await castDilemma(room.id, choice);
    onUpdate(r);
  };

  return (
    <div className="page-scroll page-pad flex flex-col gap-6 items-center">
      <Timer endsAt={room.phaseEndsAt} label="Дилемма" />
      <h2 className="text-2xl font-bold text-center">Разделить или рискнуть?</h2>
      <div className="pot-badge text-lg">Банк: {room.pot} монет</div>
      <p className="text-center text-sm text-[var(--app-hint)] max-w-xs">
        Split — большинство делит банк и матч заканчивается. Risk — игра продолжается, банк растёт.
      </p>
      <div className="flex gap-3 w-full max-w-sm">
        <motion.button
          whileTap={{ scale: 0.96 }}
          className={`btn-split flex-1 py-5 font-bold text-lg ${myChoice === 'split' ? 'ring-2 ring-white/70' : ''}`}
          onClick={() => choose('split')}
          disabled={!!myChoice}
        >
          Split
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.96 }}
          className={`btn-risk flex-1 py-5 font-bold text-lg ${myChoice === 'risk' ? 'ring-2 ring-white/70' : ''}`}
          onClick={() => choose('risk')}
          disabled={!!myChoice}
        >
          Risk
        </motion.button>
      </div>
      {myChoice && (
        <p className="text-sm text-[var(--app-hint)]">
          Выбор принят. Результат откроется после остальных игроков или таймера.
        </p>
      )}
      <div className="flex gap-2 flex-wrap justify-center">
        {alive.map(p => (
          <span
            key={p.userId}
            className="text-xs px-2 py-1 rounded-full"
            style={{
              background: p.dilemmaChoice === 'split' ? 'rgba(34,197,94,0.2)' : p.dilemmaChoice === 'risk' ? 'rgba(196,30,58,0.2)' : 'rgba(255,255,255,0.06)',
            }}
          >
            {p.displayName.slice(0, 8)}
            {p.dilemmaChoice ? (p.dilemmaChoice === 'split' ? ' ✓' : ' ⚡') : ' …'}
          </span>
        ))}
      </div>
    </div>
  );
}
