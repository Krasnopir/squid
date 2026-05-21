import { useNavigate } from '@tanstack/react-router';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { createRoom, enqueueQuickGame } from '@/api/roomApi';
import { useRoomStore } from '@/store/roomStore';

export function QueuePage() {
  const navigate = useNavigate();
  const { queueStatus, setQueueStatus, setRoom } = useRoomStore();
  const [error, setError] = useState('');
  const searching = queueStatus === 'searching';

  useEffect(() => {
    setQueueStatus('searching');
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const search = async () => {
      if (cancelled) return;
      setError('');
      try {
        const room = await enqueueQuickGame(6);
        if (cancelled) return;
        if (room) {
          setRoom(room);
          setQueueStatus('matched');
          navigate({ to: '/room/$roomId', params: { roomId: room.id } });
          return;
        }
        timer = setTimeout(search, 2000);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Не удалось найти матч');
          setQueueStatus('idle');
        }
      }
    };

    void search();

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [navigate, setQueueStatus, setRoom]);

  const createFallbackRoom = async () => {
    setError('');
    const room = await createRoom(6, false);
    setRoom(room);
    navigate({ to: '/room/$roomId', params: { roomId: room.id } });
  };

  return (
    <div className="page-scroll page-pad flex flex-col items-center justify-center gap-4 min-h-[60vh]">
      {searching ? (
        <Loader2 size={48} className="animate-spin text-[var(--trust-red)]" />
      ) : (
        <AlertCircle size={48} className="text-red-400" />
      )}
      <h2 className="text-xl font-bold">{searching ? 'Ищем игроков…' : 'Очередь недоступна'}</h2>
      <p className="text-sm text-[var(--app-hint)] text-center max-w-xs">
        {searching
          ? 'Подбираем комнату. Если мало людей — добавим ботов для старта.'
          : 'Можно создать комнату и отправить код друзьям.'}
      </p>
      {error && <p className="text-sm text-red-400 text-center max-w-xs">{error}</p>}
      {!searching && (
        <button type="button" className="btn-primary px-5 py-3" onClick={createFallbackRoom}>
          Создать комнату
        </button>
      )}
    </div>
  );
}
