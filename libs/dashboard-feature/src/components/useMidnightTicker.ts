import { useEffect, useState } from 'react';

export const useMidnightTicker = (referenceDate?: Date): Date => {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (referenceDate) {
      return;
    }

    let timeout: ReturnType<typeof setTimeout> | undefined;

    const scheduleNextMidnight = () => {
      const current = new Date();
      const nextMidnight = new Date(
        current.getFullYear(),
        current.getMonth(),
        current.getDate() + 1,
      );
      const timeoutMs = Math.max(0, nextMidnight.getTime() - current.getTime());
      timeout = setTimeout(() => {
        setNow(new Date());
        scheduleNextMidnight();
      }, timeoutMs);
    };

    scheduleNextMidnight();

    return () => {
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, [referenceDate]);

  return referenceDate ?? now;
};
