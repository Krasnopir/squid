import { Timer } from '@/components/ui/Timer';
import type { Room } from '@/types';

export function RoomDilemmaReveal({ room }: { room: Room }) {
  const result = room.lastDilemmaResult;
  const split = result?.splitCount ?? 0;
  const risk = result?.riskCount ?? 0;
  const outcome = result?.outcome ?? 'risk';

  return (
    <div className="page-scroll page-pad flex min-h-full flex-col items-center justify-center gap-5 text-center">
      <Timer endsAt={room.phaseEndsAt} label="Решение" />
      <p className="text-sm font-semibold text-[var(--trust-gold)]">Дилемма вскрыта</p>
      <h1 className="text-3xl font-bold">
        {outcome === 'split' ? 'Большинство делит банк' : 'Комната идет дальше'}
      </h1>
      <div className="grid w-full max-w-sm grid-cols-2 gap-3">
        <div className="card-surface p-4">
          <p className="text-3xl font-bold text-[var(--trust-green)]">{split}</p>
          <p className="text-sm text-[var(--app-hint)]">Split</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-3xl font-bold text-[var(--trust-red)]">{risk}</p>
          <p className="text-sm text-[var(--app-hint)]">Risk</p>
        </div>
      </div>
      <p className="max-w-xs text-sm text-[var(--app-hint)]">
        {outcome === 'split'
          ? 'Банк будет разделен между выжившими игроками.'
          : `Банк увеличится на ${room.entryFee * room.players.filter(p => p.isAlive).length} монет.`}
      </p>
    </div>
  );
}
