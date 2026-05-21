import { useState } from 'react';

import { SEED_LEADERBOARD } from '@/lib/mock/seed';

const TABS = ['week', 'month', 'all'] as const;

export function PrizesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>('week');

  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <h1 className="text-xl font-bold">Топ игроков</h1>
      <div className="flex gap-2">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-sm font-medium ${
              tab === t
                ? 'bg-[var(--trust-red)] text-white'
                : 'bg-white/5 text-[var(--app-hint)]'
            }`}
          >
            {t === 'week' ? 'Неделя' : t === 'month' ? 'Месяц' : 'Всё время'}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {SEED_LEADERBOARD.map(entry => (
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
              <p className="text-xs text-[var(--app-hint)]">@{entry.username}</p>
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
