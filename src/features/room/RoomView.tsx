import { useRoomSync } from '@/hooks/useRoomSync';
import { useRoomStore } from '@/store/roomStore';
import type { Room } from '@/types';

import { RoomDilemma } from './RoomDilemma';
import { RoomElimination } from './RoomElimination';
import { RoomFinals } from './RoomFinals';
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

  if (room.status === 'waiting' || room.phase === 'lobby') {
    return <RoomLobby room={room} onUpdate={onUpdate} />;
  }
  if (room.phase === 'vote') return <RoomVote room={room} onUpdate={onUpdate} />;
  if (room.phase === 'dilemma') return <RoomDilemma room={room} onUpdate={onUpdate} />;
  if (room.phase === 'reveal_elimination') return <RoomElimination room={room} />;
  if (room.phase === 'finals') return <RoomFinals room={room} onUpdate={onUpdate} />;
  if (room.phase === 'results') return <RoomResults room={room} />;

  return <RoomLobby room={room} onUpdate={onUpdate} />;
}
