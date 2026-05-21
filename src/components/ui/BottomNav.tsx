import { Link, useRouterState } from '@tanstack/react-router';
import { Gamepad2, Trophy, User, Wallet } from 'lucide-react';

import { cn } from '@/lib/cn';

const TABS = [
  { to: '/', Icon: Gamepad2, label: 'Игра' },
  { to: '/profile', Icon: User, label: 'Профиль' },
  { to: '/wallet', Icon: Wallet, label: 'TON' },
  { to: '/prizes', Icon: Trophy, label: 'Рейтинг' },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: s => s.location.pathname });
  const hide = pathname.includes('/room/') && pathname !== '/room/join';

  if (hide) return null;

  return (
    <div className="nav-island-wrap" aria-label="Основная навигация">
      <nav className="nav-island">
        {TABS.map(({ to, Icon, label }) => {
          const active = to === '/' ? pathname === '/' : pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className={cn('nav-item rounded-2xl', active && 'active')}
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.6} />
              <span className="nav-label">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
