import { ShoppingBag } from 'lucide-react';

export function ShopPage() {
  return (
    <div className="page-scroll page-pad flex flex-col gap-4">
      <h1 className="text-xl font-bold">Магазин</h1>
      <div className="card-surface flex flex-col items-center gap-3 p-6 text-center">
        <ShoppingBag size={36} className="text-[var(--trust-gold)]" />
        <p className="font-semibold">Магазин отключен</p>
        <p className="text-sm text-[var(--app-hint)]">
          Вернем раздел, когда будут реальные предметы, покупка и применение. Фейковые аватары убраны.
        </p>
      </div>
    </div>
  );
}
