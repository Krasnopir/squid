import { Button } from '@telegram-apps/telegram-ui';
import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, Check, Copy, Users } from 'lucide-react';
import { useState } from 'react';

import { leaveRoom, setRoomReady, startRoom } from '@/api/roomApi';
import { PlayerGrid } from '@/components/ui/PlayerGrid';
import { Timer } from '@/components/ui/Timer';
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
  const navigate = useNavigate();
  const myPlayer = room.players.find(p => p.userId === me.id);
  const isHost = room.hostId === me.id;
  const readyCount = room.players.filter(p => p.isReady).length;
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const canStart = room.players.length >= 2 && room.players.every(p => p.isReady);

  const toggleReady = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await setRoomReady(room.id, !myPlayer?.isReady);
      onUpdate(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось изменить готовность');
    } finally {
      setBusy(false);
    }
  };

  const handleStart = async () => {
    setError('');
    setBusy(true);
    try {
      const r = await startRoom(room.id);
      onUpdate(r);
      hapticNotification('success');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось начать игру');
    } finally {
      setBusy(false);
    }
  };

  const copyCode = async () => {
    await navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const invite = async () => {
    const url = `${window.location.origin}?startapp=room_${room.code}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = async () => {
    setError('');
    setBusy(true);
    try {
      await leaveRoom(room.id);
      onUpdate({ ...room, status: 'cancelled', players: [] });
      navigate({ to: '/' });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось выйти из комнаты');
    } finally {
      setBusy(false);
    }
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

      <div className="card-surface p-3 text-center text-sm text-[var(--app-hint)]">
        Ставка: <span className="font-semibold text-[var(--trust-gold)]">{room.entryFee}</span> монет.
        Списание произойдет только при старте.
      </div>

      {room.players.length >= 2 && room.phaseEndsAt && (
        <div className="card-surface flex items-center justify-between p-4">
          <span className="text-sm text-[var(--app-hint)]">Автостарт</span>
          <Timer endsAt={room.phaseEndsAt} />
        </div>
      )}

      <PlayerGrid players={room.players} />

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-2 mt-auto">
        <Button
          mode={myPlayer?.isReady ? 'gray' : 'filled'}
          stretched
          size="l"
          onClick={toggleReady}
          disabled={busy}
        >
          {myPlayer?.isReady ? 'Не готов' : 'Готов'}
        </Button>
        {isHost && (
          <button
            type="button"
            className="btn-primary w-full py-4 text-base disabled:opacity-45"
            onClick={handleStart}
            disabled={busy || !canStart}
          >
            {room.players.length < 2 ? 'Нужен второй игрок' : 'Начать игру'}
          </button>
        )}
        <Button mode="plain" stretched onClick={invite}>
          Пригласить друзей
        </Button>
        <Button mode="plain" stretched onClick={handleLeave} disabled={busy}>
          Выйти из комнаты
        </Button>
      </div>
    </div>
  );
}
