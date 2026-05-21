import { Link, useNavigate } from '@tanstack/react-router';
import { HelpCircle, Lock, Plus, Zap } from 'lucide-react';
import { useState } from 'react';

import { createRoom } from '@/api/roomApi';
import { TutorialPrompt } from '@/components/TutorialPrompt';
import { useRoomStore } from '@/store/roomStore';

export function HomePage() {
  const navigate = useNavigate();
  const setRoom = useRoomStore(s => s.setRoom);
  const [creating, setCreating] = useState(false);

  const quick = () => navigate({ to: '/queue' });

  const create = async (max: number) => {
    setCreating(true);
    try {
      const room = await createRoom(max, false);
      setRoom(room);
      navigate({ to: '/room/$roomId', params: { roomId: room.id } });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <TutorialPrompt />
      <div className="text-center py-4">
        <div className="mask-icon mx-auto mb-3">🎭</div>
        <h1 className="text-xl font-bold">Социальные игры с реальными людьми</h1>
        <p className="text-sm text-[var(--app-hint)] mt-1">Доверие. Предательство. Победа.</p>
      </div>

      <button
        type="button"
        className="card-surface p-4 flex items-center gap-4 w-full text-left active:scale-[0.98] transition"
        onClick={quick}
      >
        <div className="w-12 h-12 rounded-xl bg-[var(--trust-red)]/20 flex items-center justify-center">
          <Zap className="text-[var(--trust-red)]" />
        </div>
        <div>
          <p className="font-semibold">Быстрая игра</p>
          <p className="text-xs text-[var(--app-hint)]">Случайный матч 3–6 игроков</p>
        </div>
      </button>

      <button
        type="button"
        disabled={creating}
        className="card-surface p-4 flex items-center gap-4 w-full text-left"
        onClick={() => create(6)}
      >
        <div className="w-12 h-12 rounded-xl bg-[var(--trust-gold)]/15 flex items-center justify-center">
          <Plus className="text-[var(--trust-gold)]" />
        </div>
        <div>
          <p className="font-semibold">Создать комнату</p>
          <p className="text-xs text-[var(--app-hint)]">Пригласи друзей — до 6 человек</p>
        </div>
      </button>

      <Link
        to="/room/join"
        className="card-surface p-4 flex items-center gap-4 w-full text-left"
      >
        <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center">
          <Lock className="text-[var(--app-hint)]" />
        </div>
        <div>
          <p className="font-semibold">Приватная комната</p>
          <p className="text-xs text-[var(--app-hint)]">Вход по коду</p>
        </div>
      </Link>

      <Link
        to="/tutorial"
        className="flex items-center justify-center gap-2 text-sm text-[var(--app-link)] py-4"
      >
        <HelpCircle size={16} /> Как играть?
      </Link>
    </div>
  );
}
