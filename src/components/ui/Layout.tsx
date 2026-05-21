import { Coins } from 'lucide-react';
import { Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';

import { BottomNav } from '@/components/ui/BottomNav';
import { expandWebApp } from '@/lib/telegram';
import { useSessionStore } from '@/store/sessionStore';

export function Layout() {
  const { profile, loading } = useSessionStore();

  useEffect(() => {
    expandWebApp();
  }, []);

  return (
    <div className="flex h-full flex-col" style={{ background: 'var(--app-bg)' }}>
      <header
        className="flex shrink-0 items-center justify-between px-4"
        style={{
          background: 'var(--app-header-bg)',
          borderBottom: '1px solid var(--border-subtle)',
          paddingTop: 'max(12px, env(safe-area-inset-top))',
          paddingBottom: 12,
        }}
      >
        <div className="flex items-center gap-2">
          <div className="mask-icon text-2xl">🎭</div>
          <span className="font-semibold text-sm">Игра на доверие</span>
        </div>
        {loading ? (
          <div className="h-8 w-20 rounded-full bg-white/10 animate-pulse" />
        ) : (
          <div className="pot-badge flex items-center gap-1 text-sm">
            <Coins size={14} />
            {profile.coins.toLocaleString()}
          </div>
        )}
      </header>
      <main className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
