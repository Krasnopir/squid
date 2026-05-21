import { Button } from '@telegram-apps/telegram-ui';
import { useTonConnectUI } from '@tonconnect/ui-react';
import { Coins, Star } from 'lucide-react';

import { useMock } from '@/lib/config';
import { useSessionStore } from '@/store/sessionStore';

export function WalletPage() {
  const [tonConnectUI] = useTonConnectUI();
  const { profile, addCoins } = useSessionStore();

  const topUpMock = () => addCoins(500);

  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <h1 className="text-xl font-bold">Кошелёк</h1>
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 mb-2">
          <Coins size={18} className="text-[var(--trust-gold)]" />
          <span className="text-sm text-[var(--app-hint)]">Монеты</span>
        </div>
        <p className="text-2xl font-bold">{profile.coins.toLocaleString()}</p>
        <p className="text-xs text-[var(--app-hint)] mt-1">Только для игр и косметики. Без вывода.</p>
      </div>
      <div className="card-surface p-4">
        <div className="flex items-center gap-2 mb-2">
          <Star size={18} fill="#FFD700" color="#FFD700" />
          <span className="text-sm text-[var(--app-hint)]">Telegram Stars</span>
        </div>
        <p className="text-2xl font-bold">{profile.stars}</p>
      </div>
      {useMock ? (
        <Button stretched size="l" onClick={topUpMock}>
          +500 монет (демо)
        </Button>
      ) : (
        <Button stretched size="l" disabled>
          Покупка Stars отключена
        </Button>
      )}
      <Button
        mode="gray"
        stretched
        onClick={() => tonConnectUI.openModal()}
      >
        {tonConnectUI.connected ? 'TON подключён' : 'Подключить TON'}
      </Button>
    </div>
  );
}
