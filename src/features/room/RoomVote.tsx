import { castVote } from '@/api/roomApi';
import { PlayerGrid } from '@/components/ui/PlayerGrid';
import { Timer } from '@/components/ui/Timer';
import { getTelegramUser } from '@/lib/telegram';
import type { Room } from '@/types';

export function RoomVote({ room, onUpdate }: { room: Room; onUpdate: (r: Room) => void }) {
  const alive = room.players.filter(p => p.isAlive);
  const totalRounds = Math.max(1, room.maxPlayers - 1);
  const me = getTelegramUser();

  const vote = async (targetId: number) => {
    if (targetId === me.id) return;
    const r = await castVote(room.id, targetId);
    onUpdate(r);
  };

  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <span className="text-sm text-[var(--app-hint)]">
          Раунд {room.roundIndex + 1} / {totalRounds}
        </span>
        <Timer endsAt={room.phaseEndsAt} />
      </div>
      <h2 className="text-xl font-bold text-center">Кто должен покинуть игру?</h2>
      <p className="text-center text-sm text-[var(--app-hint)]">
        Обсудите и проголосуйте. Без большинства — случайный вылет двоих.
      </p>
      <PlayerGrid players={alive} selectable onSelect={vote} />
      <div className="pot-badge mx-auto mt-4">Банк: {room.pot} монет</div>
    </div>
  );
}
