import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  useFocusEffect,
  useNavigation,
  useRoute,
  type RouteProp,
} from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  PrayerScreen as BasePrayerScreen,
  type PrayerId,
} from '@spirit/prayer-feature';

import type { PrayerStackParamList } from '../navigation/PrayerNavigator';
import { addJournalEntry } from '../services/journalDb';
import { triggerSync } from '../services/journalSync';
import {
  canResumePrayer,
  flushPrayerResumeState,
  getPrayerResumeStateSync,
  hydratePrayerResumeState,
  isPrayerSessionExpired,
  PRAYER_AUTO_RETURN_TIMEOUT_MS,
  recordPrayerScrollProgress,
  startPrayerSession,
  touchPrayerSession,
} from '../services/prayerResumeState';

type BasePrayerScreenProps = React.ComponentProps<typeof BasePrayerScreen>;
type Props = Omit<
  BasePrayerScreenProps,
  'initialScrollY' | 'onScrollPositionChange'
>;
type PrayerProgressUpdate = Parameters<
  NonNullable<BasePrayerScreenProps['onScrollPositionChange']>
>[0];
type PrayerRoute = RouteProp<PrayerStackParamList, 'Молитва'>;
type PrayerNavigation = NativeStackNavigationProp<
  PrayerStackParamList,
  'Молитва'
>;

const PrayerScreen = (props: Props) => {
  const route = useRoute<PrayerRoute>();
  const navigation = useNavigation<PrayerNavigation>();
  const [initialScrollY, setInitialScrollY] = useState(0);
  const autoReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFocusedRef = useRef(false);
  const skipNextExpiryCheckRef = useRef(false);

  const routePrayerId = route.params?.prayerId;
  const resumeSavedPosition = Boolean(route.params?.resumeSavedPosition);
  const resolvedId = (props.prayerId ?? routePrayerId ?? 'liturgy') as PrayerId;

  const clearAutoReturnTimer = useCallback(() => {
    if (autoReturnTimerRef.current) {
      clearTimeout(autoReturnTimerRef.current);
      autoReturnTimerRef.current = null;
    }
  }, []);

  const navigateHomeDueToInactivity = useCallback(() => {
    clearAutoReturnTimer();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Список молитв' }],
    });

    const parentNavigation = navigation.getParent();
    parentNavigation?.navigate('Главная');
  }, [clearAutoReturnTimer, navigation]);

  const scheduleAutoReturnFrom = useCallback(
    (lastActiveAt: number) => {
      clearAutoReturnTimer();

      const remainingMs =
        PRAYER_AUTO_RETURN_TIMEOUT_MS -
        (Date.now() - Math.max(0, lastActiveAt));

      if (remainingMs <= 0) {
        if (isFocusedRef.current) {
          navigateHomeDueToInactivity();
        }
        return;
      }

      autoReturnTimerRef.current = setTimeout(() => {
        if (isFocusedRef.current) {
          navigateHomeDueToInactivity();
        }
      }, remainingMs);
    },
    [clearAutoReturnTimer, navigateHomeDueToInactivity]
  );

  const checkForExpiredSession = useCallback(async (): Promise<boolean> => {
    if (skipNextExpiryCheckRef.current) {
      skipNextExpiryCheckRef.current = false;
      const currentState = getPrayerResumeStateSync();
      scheduleAutoReturnFrom(currentState?.lastActiveAt ?? Date.now());
      return false;
    }

    const currentState =
      getPrayerResumeStateSync() ?? (await hydratePrayerResumeState());

    if (
      currentState?.prayerId === resolvedId &&
      isPrayerSessionExpired(currentState)
    ) {
      navigateHomeDueToInactivity();
      return true;
    }

    scheduleAutoReturnFrom(
      currentState?.prayerId === resolvedId
        ? currentState.lastActiveAt
        : Date.now()
    );

    return false;
  }, [navigateHomeDueToInactivity, resolvedId, scheduleAutoReturnFrom]);

  useEffect(() => {
    let cancelled = false;

    setInitialScrollY(0);
    skipNextExpiryCheckRef.current = resumeSavedPosition;

    if (!resumeSavedPosition) {
      const nextState = startPrayerSession(resolvedId, Date.now());
      scheduleAutoReturnFrom(nextState.lastActiveAt);

      return () => {
        cancelled = true;
      };
    }

    const hydrateResumeState = async () => {
      const savedState = await hydratePrayerResumeState();
      if (cancelled) {
        return;
      }

      if (savedState?.prayerId === resolvedId && canResumePrayer(savedState)) {
        setInitialScrollY(savedState.scrollY);
      }

      const nextState = touchPrayerSession(resolvedId, Date.now());
      scheduleAutoReturnFrom(nextState.lastActiveAt);
    };

    void hydrateResumeState();

    return () => {
      cancelled = true;
    };
  }, [resolvedId, resumeSavedPosition, scheduleAutoReturnFrom]);

  useEffect(() => {
    if (resumeSavedPosition) {
      return;
    }

    let cancelled = false;

    addJournalEntry(resolvedId)
      .then(() => {
        if (cancelled) {
          return;
        }

        console.log(`[PrayerScreen] journal entry added for '${resolvedId}'`);
        triggerSync();
      })
      .catch((error) => {
        if (!cancelled) {
          console.error('[PrayerScreen] failed to add journal entry', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [resolvedId, resumeSavedPosition]);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;
      void checkForExpiredSession();

      const subscription = AppState.addEventListener(
        'change',
        (nextAppState: AppStateStatus) => {
          if (nextAppState === 'active') {
            void checkForExpiredSession();
            return;
          }

          clearAutoReturnTimer();
          void flushPrayerResumeState();
        }
      );

      return () => {
        isFocusedRef.current = false;
        clearAutoReturnTimer();
        subscription.remove();
        void flushPrayerResumeState();
      };
    }, [checkForExpiredSession, clearAutoReturnTimer])
  );

  const handleScrollPositionChange = useCallback(
    (update: PrayerProgressUpdate) => {
      const nextState = recordPrayerScrollProgress(update);
      scheduleAutoReturnFrom(nextState.lastActiveAt);
    },
    [scheduleAutoReturnFrom]
  );

  return (
    <BasePrayerScreen
      {...props}
      prayerId={resolvedId}
      initialScrollY={initialScrollY}
      onScrollPositionChange={handleScrollPositionChange}
    />
  );
};

export default PrayerScreen;
