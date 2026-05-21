import { Link } from '@tanstack/react-router';
import { Button } from '@telegram-apps/telegram-ui';

import { useSessionStore } from '@/store/sessionStore';

const STEPS = [
  { n: 1, title: 'Войди или создай комнату', desc: 'Пригласи друзей по коду или быстрый матч.' },
  { n: 2, title: 'Обсуждай и голосуй', desc: 'Кого выгнать? Таймер давит — договаривайтесь.' },
  { n: 3, title: 'Выживи', desc: 'Дилемма Split/Risk и финал камень-ножницы-бумага.' },
  { n: 4, title: 'Забирай награду', desc: 'Монеты без вывода — только игра и косметика.' },
];

export function TutorialPage() {
  const markTutorialSeen = useSessionStore(s => s.markTutorialSeen);

  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <h1 className="text-xl font-bold text-center">Как играть?</h1>
      {STEPS.map(s => (
        <div key={s.n} className="card-surface p-4 flex gap-3">
          <span className="w-8 h-8 rounded-full bg-[var(--trust-red)] flex items-center justify-center font-bold shrink-0">
            {s.n}
          </span>
          <div>
            <p className="font-semibold">{s.title}</p>
            <p className="text-sm text-[var(--app-hint)]">{s.desc}</p>
          </div>
        </div>
      ))}
      <p className="text-xs text-center text-[var(--app-hint)] px-4">
        Это развлечение, не азартная игра. Нет вывода денег и ставок на реальную валюту.
      </p>
      <Link to="/" onClick={markTutorialSeen}>
        <Button stretched size="l">
          Понятно
        </Button>
      </Link>
    </div>
  );
}
