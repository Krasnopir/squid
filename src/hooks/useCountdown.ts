import { useEffect, useState } from 'react';

export function useCountdown(endsAt: string | null | undefined): number {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!endsAt) {
      setSeconds(0);
      return;
    }
    const tick = () => {
      const left = Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 1000));
      setSeconds(left);
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [endsAt]);

  return seconds;
}
