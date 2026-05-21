import { Hand, Scissors, Scroll } from 'lucide-react';

import { Timer } from '@/components/ui/Timer';
import { getTelegramUser } from '@/lib/telegram';
import type { Room, RpsChoice } from '@/types';

const LABELS: Record<RpsChoice, string> = {
  rock: 'Камень',
  paper: 'Бумага',
  scissors: 'Ножницы',
};

const ICONS = {
  rock: Hand,
  paper: Scroll,
  scissors: Scissors,
} satisfies Record<RpsChoice, typeof Hand>;

export function RoomFinalReveal({ room }: { room: Room }) {
  const me = getTelegramUser();
  const alive = room.players.filter(p => p.isAlive);
  const result = room.lastFinalResult;
  const choices = new Map(result?.choices.map(c => [c.userId, c.choice]));
  const won = result?.winnerId === me.id;

  return (
    <div className="page-scroll page-pad flex min-h-full flex-col items-center justify-center gap-5 text-center">
      <Timer endsAt={room.phaseEndsAt} label="Финал" />
      <p className="text-sm font-semibold text-[var(--trust-gold)]">Выборы открыты</p>
      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        {alive.map(player => {
          const choice = choices.get(player.userId) ?? 'rock';
          const Icon = ICONS[choice];
          return (
            <div key={player.userId} className="card-surface p-4">
              <div className="player-avatar alive mx-auto mb-3">
                {player.userId === me.id ? 'Вы' : player.displayName.slice(0, 2).toUpperCase()}
              </div>
              <Icon size={32} className="mx-auto text-[var(--trust-gold)]" />
              <p className="mt-2 text-sm font-semibold">{LABELS[choice]}</p>
            </div>
          );
        })}
      </div>
      <h1 className="text-2xl font-bold">
        {result?.draw ? 'Ничья. Еще один заход.' : won ? 'Вы забрали финал' : 'Финал забрал соперник'}
      </h1>
    </div>
  );
}
