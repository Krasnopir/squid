import { Link } from '@tanstack/react-router';

import { useRoomSync } from '@/hooks/useRoomSync';
import { useRoomStore } from '@/store/roomStore';
import type { Room } from '@/types';

import { RoomDilemma } from './RoomDilemma';
import { RoomDilemmaReveal } from './RoomDilemmaReveal';
import { RoomElimination } from './RoomElimination';
import { RoomFinals } from './RoomFinals';
import { RoomFinalReveal } from './RoomFinalReveal';
import { RoomLobby } from './RoomLobby';
import { RoomResults } from './RoomResults';
import { RoomVote } from './RoomVote';

export function RoomView({ roomId }: { roomId: string }) {
  useRoomSync(roomId);
  const room = useRoomStore(s => s.currentRoom);
  const setRoom = useRoomStore(s => s.setRoom);

  if (!room || room.id !== roomId) {
    return (
      <div className="page-scroll page-pad flex items-center justify-center h-full">
        <p className="text-[var(--app-hint)]">Загрузка комнаты…</p>
      </div>
    );
  }

  const onUpdate = (r: Room) => setRoom(r);

  if (room.status === 'cancelled' || room.status === 'expired') {
    const title = room.status === 'expired' ? 'Комната протухла' : 'Комната закрыта';
    const text =
      room.status === 'expired'
        ? 'Игроки не собрались вовремя. Монеты не списаны.'
        : 'Все вышли до старта. Монеты не списаны.';
    return (
      <div className="page-scroll page-pad flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <h2 className="text-xl font-bold">{title}</h2>
        <p className="max-w-xs text-sm text-[var(--app-hint)]">{text}</p>
        <Link to="/" className="btn-primary px-5 py-3">
          На главную
        </Link>
      </div>
    );
  }

  if (room.status === 'waiting' || room.phase === 'lobby') {
    return <RoomLobby room={room} onUpdate={onUpdate} />;
  }
  if (room.phase === 'vote') return <RoomVote room={room} onUpdate={onUpdate} />;
  if (room.phase === 'dilemma') return <RoomDilemma room={room} onUpdate={onUpdate} />;
  if (room.phase === 'dilemma_reveal') return <RoomDilemmaReveal room={room} />;
  if (room.phase === 'reveal_elimination') return <RoomElimination room={room} />;
  if (room.phase === 'finals') return <RoomFinals room={room} onUpdate={onUpdate} />;
  if (room.phase === 'finals_reveal') return <RoomFinalReveal room={room} />;
  if (room.phase === 'results') return <RoomResults room={room} />;

  return <RoomLobby room={room} onUpdate={onUpdate} />;
}
