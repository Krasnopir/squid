import { useState } from 'react';

import { SEED_COSMETICS } from '@/lib/mock/seed';
import { useSessionStore } from '@/store/sessionStore';
import type { CosmeticItem } from '@/types';

const TABS: CosmeticItem['category'][] = ['upgrade', 'avatar', 'emote'];

export function ShopPage() {
  const [tab, setTab] = useState<CosmeticItem['category']>('avatar');
  const { profile, addCoins } = useSessionStore();
  const items = SEED_COSMETICS.filter(c => c.category === tab);

  const buy = (item: CosmeticItem) => {
    if (profile.coins < item.price) return;
    addCoins(-item.price);
  };

  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <h1 className="text-xl font-bold">Магазин</h1>
      <div className="flex gap-2">
        {TABS.map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium ${
              tab === t ? 'bg-[var(--trust-gold)]/20 text-[var(--trust-gold)]' : 'bg-white/5 text-[var(--app-hint)]'
            }`}
          >
            {t === 'upgrade' ? 'Улучшения' : t === 'avatar' ? 'Аватары' : 'Эмоции'}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => buy(item)}
            className="card-surface p-4 flex flex-col items-center gap-2 active:scale-95"
          >
            <span className="text-4xl">{item.preview}</span>
            <p className="font-medium text-sm">{item.name}</p>
            <p className="text-xs text-[var(--trust-gold)]">{item.price} монет</p>
          </button>
        ))}
      </div>
    </div>
  );
}
