import { useEffect, useMemo, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  createInitialLiturgicalCalendarState,
  getEffectiveLiturgicalCalendar,
  subscribeLiturgicalCalendarSettings,
  type EffectiveLiturgicalCalendar,
} from '../services/liturgicalCalendar';

const getDateKey = (date: Date): string => {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    return 'invalid';
  }

  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

export const useLiturgicalCalendar = (
  now: Date = new Date(),
): EffectiveLiturgicalCalendar => {
  const dateKey = useMemo(() => getDateKey(now), [now]);
  const [state, setState] = useState<EffectiveLiturgicalCalendar>(() =>
    createInitialLiturgicalCalendarState(now),
  );

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const nextState = await getEffectiveLiturgicalCalendar(now);
      if (active) {
        setState(nextState);
      }
    };

    void hydrate();

    const unsubscribe = subscribeLiturgicalCalendarSettings(() => {
      void hydrate();
    });

    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          void hydrate();
        }
      },
    );

    return () => {
      active = false;
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [dateKey, now]);

  return state;
};

export default useLiturgicalCalendar;
