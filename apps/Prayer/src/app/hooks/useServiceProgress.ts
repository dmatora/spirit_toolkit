import { useEffect, useMemo, useState } from 'react';
import type { ServiceSection } from '../utils/serviceMap';

const clampMinutes = (minutes: number) => (minutes < 0 ? 0 : minutes);

export const useServiceProgress = (sections: ServiceSection[]) => {
  const [startTime, setStartTime] = useState<Date | null>(() => new Date());
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const tick = () => setNow(new Date());
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setNow(new Date());
  }, [startTime]);

  const minutesSinceStart = useMemo(() => {
    if (!startTime) return null;
    const diffMs = now.getTime() - startTime.getTime();
    const diffMinutes = Math.round(diffMs / 60_000);
    return clampMinutes(diffMinutes);
  }, [now, startTime]);

  const activeSectionId = useMemo(() => {
    if (minutesSinceStart == null) return undefined;

    let current: string | undefined;
    sections.forEach((section) => {
      if (typeof section.timestamp_minutes !== 'number') return;
      if (section.timestamp_minutes <= minutesSinceStart) {
        current = section.id;
      }
    });

    return current;
  }, [minutesSinceStart, sections]);

  return {
    startTime,
    setStartTime,
    minutesSinceStart,
    activeSectionId,
  };
};
