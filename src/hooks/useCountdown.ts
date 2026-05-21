import { useEffect, useState } from 'react';

export function useCountdown(endsAt: string | null | undefined): number {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((new Date(endsAt).getTime() - now) / 1000));
}
