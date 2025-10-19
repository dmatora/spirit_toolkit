import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const getDelayUntilNextMidnight = (reference: Date): number => {
  const nextMidnight = new Date(reference);
  nextMidnight.setHours(24, 0, 0, 0);

  return nextMidnight.getTime() - reference.getTime();
};

const useEvaluationDate = (): Date => {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const midnightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const scheduleMidnightRefresh = () => {
      const timeoutId = setTimeout(() => {
        setCurrentDate(new Date());
        midnightTimeoutRef.current = scheduleMidnightRefresh();
      }, getDelayUntilNextMidnight(new Date()));

      return timeoutId;
    };

    midnightTimeoutRef.current = scheduleMidnightRefresh();

    return () => {
      if (midnightTimeoutRef.current) {
        clearTimeout(midnightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        setCurrentDate(new Date());
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return currentDate;
};

export { useEvaluationDate };
export default useEvaluationDate;
