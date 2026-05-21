import { Link, useNavigate } from '@tanstack/react-router';
import { HelpCircle, Lock, Plus, Users, Zap } from 'lucide-react';
import { useState } from 'react';

import { createRoom } from '@/api/roomApi';
import { TutorialPrompt } from '@/components/TutorialPrompt';
import { useRoomStore } from '@/store/roomStore';

export function HomePage() {
  const navigate = useNavigate();
  const setRoom = useRoomStore(s => s.setRoom);
  const [creating, setCreating] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [entryFee, setEntryFee] = useState(10);
  const [error, setError] = useState('');

  const quick = () => navigate({ to: '/queue' });

  const create = async (max: number) => {
    setError('');
    setCreating(true);
    try {
      const room = await createRoom(max, false, entryFee);
      setRoom(room);
      navigate({ to: '/room/$roomId', params: { roomId: room.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось создать комнату');
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
        onClick={() => create(maxPlayers)}
      >
        <div className="w-12 h-12 rounded-xl bg-[var(--trust-gold)]/15 flex items-center justify-center">
          <Plus className="text-[var(--trust-gold)]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">Создать комнату</p>
          <p className="text-xs text-[var(--app-hint)]">Пригласи друзей — до {maxPlayers} человек</p>
        </div>
        <Users size={18} className="text-[var(--app-hint)]" />
      </button>

      <div className="flex gap-2" aria-label="Размер комнаты">
        {[2, 3, 4, 5, 6].map(size => (
          <button
            key={size}
            type="button"
            onClick={() => setMaxPlayers(size)}
            className={`h-10 flex-1 rounded-xl text-sm font-semibold ${
              maxPlayers === size
                ? 'bg-[var(--trust-gold)]/20 text-[var(--trust-gold)]'
                : 'bg-white/5 text-[var(--app-hint)]'
            }`}
          >
            {size}
          </button>
        ))}
      </div>

      <div className="flex gap-2" aria-label="Ставка комнаты">
        {[5, 10, 15, 20].map(fee => (
          <button
            key={fee}
            type="button"
            onClick={() => setEntryFee(fee)}
            className={`h-10 flex-1 rounded-xl text-sm font-semibold ${
              entryFee === fee
                ? 'bg-[var(--trust-red)]/20 text-[var(--trust-red)]'
                : 'bg-white/5 text-[var(--app-hint)]'
            }`}
          >
            {fee}
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-[var(--app-hint)]">
        Монеты списываются только при старте игры. Если комната не собралась, баланс не трогаем.
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

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
