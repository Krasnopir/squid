import { Clock } from 'lucide-react';

import { useCountdown } from '@/hooks/useCountdown';

export function Timer({ endsAt, label }: { endsAt: string | null | undefined; label?: string }) {
  const seconds = useCountdown(endsAt);
  return (
    <div className="flex items-center gap-2">
      <Clock size={18} className="text-[var(--trust-gold)]" />
      <span className="timer-ring text-lg">{seconds}s</span>
      {label && <span className="text-sm text-[var(--app-hint)]">{label}</span>}
    </div>
  );
}
