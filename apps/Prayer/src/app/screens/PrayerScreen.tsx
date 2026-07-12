import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  CommonActions,
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
  PRAYER_AUTO_RETURN_TIMEOUT_MS,
  recordPrayerScrollProgress,
  startPrayerSession,
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
  // Captured at mount; never updated. Used together with the persisted
  // `lastActiveAt` to compute the inactivity budget. The persisted
  // timestamp reflects only physical scroll events, so the screen open
  // time is the source of truth for the 6h grace period — without it,
  // a stale disk entry (>6h old) would force an immediate return
  // the moment the user re-enters the prayer via the Home card.
  const screenOpenedAtRef = useRef(Date.now());

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

      // Use the most recent activity reference: either the last physical
      // scroll (persisted on disk) or the moment the screen was opened
      // (in-memory only). This gives the user a fresh 6h grace period
      // each time the prayer screen is entered, without forcing a write
      // to the persisted `lastActiveAt` just for opening the screen.
      // `lastActiveAt` is already non-negative — normalized by the
      // service layer (`normalizeNumber` / `startPrayerSession`).
      const screenOpenedAt = screenOpenedAtRef.current;
      const effectiveActiveAt = Math.max(lastActiveAt, screenOpenedAt);
      const remainingMs =
        PRAYER_AUTO_RETURN_TIMEOUT_MS - (Date.now() - effectiveActiveAt);

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
      // No persisted activity yet — 0 lets `max()` fall through to
      // `screenOpenedAt` so the user still gets the full 6h grace period.
      scheduleAutoReturnFrom(currentState?.lastActiveAt ?? 0);
      return false;
    }

    const currentState =
      getPrayerResumeStateSync() ?? (await hydratePrayerResumeState());

    // NOTE: do not short-circuit on `isPrayerSessionExpired(currentState)`.
    // A stale disk entry is the very case we want to recover from — the
    // 6h budget is measured from `max(lastActiveAt, screenOpenedAt)`,
    // so a freshly opened screen always gets a fresh grace period.
    scheduleAutoReturnFrom(
      currentState?.prayerId === resolvedId ? currentState.lastActiveAt : 0
    );

    return false;
  }, [resolvedId, scheduleAutoReturnFrom]);

  useEffect(() => {
    let cancelled = false;

    setInitialScrollY(0);
    skipNextExpiryCheckRef.current = resumeSavedPosition;

    if (!resumeSavedPosition) {
      // Brand-new reading session. We still need to create the persisted
      // state so subsequent scroll events have a session to attach to,
      // but the initial `lastActiveAt` is intentionally 0 — opening the
      // screen is not a prayer act. The 6h grace period comes from
      // `screenOpenedAtRef` via `scheduleAutoReturnFrom`'s `max()`.
      const nextState = startPrayerSession(resolvedId, 0);
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

      // Resuming a saved session. Do NOT call `touchPrayerSession` here:
      // merely opening the prayer screen is not a prayer act. We pass
      // the persisted `lastActiveAt` through as-is (0 when the saved
      // state is missing or for a different prayer) so the inactivity
      // budget is measured from `max(savedLastActive, screenOpenedAt)`.
      const persistedActiveAt =
        savedState?.prayerId === resolvedId ? savedState.lastActiveAt : 0;
      scheduleAutoReturnFrom(persistedActiveAt);
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

  const handleOpenSettings = useCallback(() => {
    navigation.getParent()?.dispatch(CommonActions.navigate('Настройки'));
  }, [navigation]);

  return (
    <BasePrayerScreen
      {...props}
      prayerId={resolvedId}
      initialScrollY={initialScrollY}
      onScrollPositionChange={handleScrollPositionChange}
      onOpenSettings={handleOpenSettings}
    />
  );
};

export default PrayerScreen;
