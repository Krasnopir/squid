import { Trophy, Target, TrendingUp } from 'lucide-react';

import { useSessionStore } from '@/store/sessionStore';

export function ProfilePage() {
  const { profile } = useSessionStore();
  const xpPct = Math.round((profile.xp / profile.xpToNext) * 100);
  const rank = profile.globalRank > 0 ? `#${profile.globalRank}` : '—';

  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <div className="card-surface p-4 flex items-center gap-4">
        <div className="player-avatar alive w-16 h-16 text-xl">
          {profile.firstName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-bold text-lg">{profile.firstName}</p>
          <p className="text-sm text-[var(--trust-gold)]">
            Уровень {profile.level} · Новичок
          </p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-xs text-[var(--app-hint)] mb-1">
          <span>XP</span>
          <span>
            {profile.xp} / {profile.xpToNext}
          </span>
        </div>
        <div className="h-2 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--trust-gold)]"
            style={{ width: `${xpPct}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { Icon: Trophy, label: 'Побед', value: profile.wins },
          { Icon: Target, label: 'Игр', value: profile.gamesPlayed },
          { Icon: TrendingUp, label: 'Ранг', value: rank },
        ].map(({ Icon, label, value }) => (
          <div key={label} className="card-surface p-3 text-center">
            <Icon size={20} className="mx-auto text-[var(--trust-gold)] mb-1" />
            <p className="font-bold text-lg">{value}</p>
            <p className="text-xs text-[var(--app-hint)]">{label}</p>
          </div>
        ))}
      </div>

      <div className="card-surface p-4 flex justify-between">
        <span className="text-[var(--app-hint)]">Баланс</span>
        <span className="font-bold text-[var(--trust-gold)]">{profile.coins} монет</span>
      </div>
      <div className="card-surface p-4 flex justify-between">
        <span className="text-[var(--app-hint)]">Stars</span>
        <span className="font-bold">{profile.stars} ★</span>
      </div>
    </div>
  );
}
