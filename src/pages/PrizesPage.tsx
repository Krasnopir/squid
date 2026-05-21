import { useQuery } from '@tanstack/react-query';
import { Trophy } from 'lucide-react';

import { fetchLeaderboard } from '@/api/profileApi';

export function PrizesPage() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: fetchLeaderboard,
  });

  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <h1 className="text-xl font-bold">Рейтинг</h1>
      <p className="text-sm text-[var(--app-hint)]">Только реальные завершенные матчи.</p>
      {isLoading && <p className="text-sm text-[var(--app-hint)]">Загружаем рейтинг…</p>}
      {error && <p className="text-sm text-red-400">Не удалось загрузить рейтинг</p>}
      {!isLoading && !error && data.length === 0 && (
        <div className="card-surface flex flex-col items-center gap-3 p-6 text-center">
          <Trophy size={36} className="text-[var(--trust-gold)]" />
          <p className="font-semibold">Рейтинг пока пуст</p>
          <p className="text-sm text-[var(--app-hint)]">
            Первые победы появятся здесь после реальных завершенных игр.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-2">
        {data.map(entry => (
          <div
            key={entry.userId}
            className="card-surface p-3 flex items-center gap-3"
          >
            <span
              className={`w-8 text-center font-bold ${
                entry.rank <= 3 ? 'text-[var(--trust-gold)]' : 'text-[var(--app-hint)]'
              }`}
            >
              {entry.rank}
            </span>
            <div className="player-avatar w-10 h-10 text-xs">
              {entry.displayName.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{entry.displayName}</p>
              <p className="text-xs text-[var(--app-hint)]">
                {entry.username ? `@${entry.username}` : 'без username'} · {entry.gamesPlayed ?? 0} игр
              </p>
            </div>
            <span className="text-sm font-semibold text-[var(--trust-gold)]">
              {entry.score.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
