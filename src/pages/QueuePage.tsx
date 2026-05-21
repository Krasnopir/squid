import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

import { enqueueQuickGame } from '@/api/roomApi';
import { useRoomStore } from '@/store/roomStore';

export function QueuePage() {
  const navigate = useNavigate();
  const { queueStatus, setQueueStatus, setRoom } = useRoomStore();
  const [error, setError] = useState('');

  useEffect(() => {
    setQueueStatus('searching');
    let cancelled = false;
    (async () => {
      try {
        setError('');
        const room = await enqueueQuickGame(6);
        if (cancelled) return;
        setRoom(room);
        setQueueStatus('matched');
        navigate({ to: '/room/$roomId', params: { roomId: room.id } });
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Не удалось найти матч');
          setQueueStatus('idle');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, setQueueStatus, setRoom]);

  return (
    <div className="page-scroll page-pad flex flex-col items-center justify-center gap-4 min-h-[60vh]">
      <Loader2 size={48} className="animate-spin text-[var(--trust-red)]" />
      <h2 className="text-xl font-bold">Ищем игроков…</h2>
      <p className="text-sm text-[var(--app-hint)] text-center max-w-xs">
        {queueStatus === 'searching'
          ? 'Подбираем комнату. Если мало людей — добавим ботов для старта.'
          : 'Комната найдена!'}
      </p>
      {error && <p className="text-sm text-red-400 text-center max-w-xs">{error}</p>}
    </div>
  );
}
