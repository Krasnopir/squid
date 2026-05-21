import { Button } from '@telegram-apps/telegram-ui';
import { Check, Copy, Users } from 'lucide-react';
import { useState } from 'react';

import { PlayerGrid } from '@/components/ui/PlayerGrid';
import { setRoomReady, startRoom } from '@/api/roomApi';
import { getTelegramUser } from '@/lib/telegram';
import { hapticNotification } from '@/lib/telegram';
import type { Room } from '@/types';

export function RoomLobby({
  room,
  onUpdate,
}: {
  room: Room;
  onUpdate: (r: Room) => void;
}) {
  const me = getTelegramUser();
  const myPlayer = room.players.find(p => p.userId === me.id);
  const isHost = room.hostId === me.id;
  const readyCount = room.players.filter(p => p.isReady).length;
  const [copied, setCopied] = useState(false);

  const toggleReady = async () => {
    const r = await setRoomReady(room.id, !myPlayer?.isReady);
    onUpdate(r);
  };

  const handleStart = async () => {
    const r = await startRoom(room.id);
    onUpdate(r);
    hapticNotification('success');
  };

  const copyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const invite = () => {
    const url = `${window.location.origin}?startapp=room_${room.code}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <div className="text-center">
        <p className="text-sm text-[var(--app-hint)]">Комната</p>
        <button type="button" onClick={copyCode} className="flex items-center justify-center gap-2 mx-auto mt-1">
          <span className="text-3xl font-bold tracking-widest">{room.code}</span>
          {copied ? <Check size={18} className="text-[var(--trust-green)]" /> : <Copy size={18} />}
        </button>
      </div>

      <div className="card-surface p-4 flex items-center justify-center gap-2">
        <Users size={20} className="text-[var(--trust-gold)]" />
        <span className="font-semibold">
          {room.players.length} / {room.maxPlayers}
        </span>
        <span className="text-sm text-[var(--app-hint)]">· {readyCount} готовы</span>
      </div>

      <PlayerGrid players={room.players} />

      <div className="flex flex-col gap-2 mt-auto">
        <Button
          mode={myPlayer?.isReady ? 'gray' : 'filled'}
          stretched
          size="l"
          onClick={toggleReady}
        >
          {myPlayer?.isReady ? 'Не готов' : 'Готов'}
        </Button>
        {isHost && (
          <button type="button" className="btn-primary w-full py-4 text-base" onClick={handleStart}>
            Начать игру
          </button>
        )}
        <Button mode="plain" stretched onClick={invite}>
          Пригласить друзей
        </Button>
      </div>
    </div>
  );
}
