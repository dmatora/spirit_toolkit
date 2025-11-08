import AsyncStorage from '@react-native-async-storage/async-storage';

export type PrayerActivityListener = (timestamp: number | null) => void;

const PRAYER_ACTIVITY_STORAGE_KEY = 'prayer/activity/lastScrollAt/v1';
const LAST_NOTIFY_INTERVAL_MS = 1000;
const PERSIST_DEBOUNCE_MS = 10000;
const SESSION_RESET_THRESHOLD_MS = 5 * 60 * 1000;

type PrayerActivityStoragePayload = {
  lastActivity?: number | null;
  sessionStart?: number | null;
};

let lastActivityTimestamp: number | null = null;
let sessionStartTimestamp: number | null = null;
let isHydrated = false;
const listeners = new Set<PrayerActivityListener>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener(lastActivityTimestamp);
    } catch (error) {
      console.warn('[prayerActivityState]', error);
    }
  });
};

const readTimestamp = (value: unknown): number | null => {
  if (value === null || typeof value === 'undefined') {
    return null;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isNaN(parsed)) {
    return parsed;
  }
  return null;
};

const schedulePersist = () => {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(async () => {
    persistTimer = null;
    try {
      const payload: PrayerActivityStoragePayload = {
        lastActivity: lastActivityTimestamp,
        sessionStart: sessionStartTimestamp,
      };

      const hasAnyValue = payload.lastActivity !== null || payload.sessionStart !== null;

      if (!hasAnyValue) {
        await AsyncStorage.removeItem(PRAYER_ACTIVITY_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(PRAYER_ACTIVITY_STORAGE_KEY, JSON.stringify(payload));
      }
    } catch (error) {
      console.warn('[prayerActivityState]', error);
    }
  }, PERSIST_DEBOUNCE_MS);
};

export const hydratePrayerActivityFromStorage = async (): Promise<number | null> => {
  if (isHydrated) {
    return lastActivityTimestamp;
  }

  try {
    const raw = await AsyncStorage.getItem(PRAYER_ACTIVITY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PrayerActivityStoragePayload | number | null;

      if (parsed && typeof parsed === 'object') {
        const lastActivityValue = readTimestamp(parsed.lastActivity);
        const sessionStartValue =
          readTimestamp(parsed.sessionStart) ?? readTimestamp(parsed.lastActivity);

        lastActivityTimestamp = lastActivityValue;
        sessionStartTimestamp =
          sessionStartValue ?? (lastActivityValue !== null ? lastActivityValue : null);
      } else {
        const numericValue = readTimestamp(parsed);
        lastActivityTimestamp = numericValue;
        sessionStartTimestamp = numericValue;
      }
    } else {
      lastActivityTimestamp = null;
      sessionStartTimestamp = null;
    }
  } catch (error) {
    console.warn('[prayerActivityState]', error);
    lastActivityTimestamp = null;
    sessionStartTimestamp = null;
  }

  isHydrated = true;
  return lastActivityTimestamp;
};

export const getLastPrayerActivitySync = (): number | null => lastActivityTimestamp;
export const getCurrentPrayerSessionStartSync = (): number | null => sessionStartTimestamp;

export const subscribeToPrayerActivity = (
  listener: PrayerActivityListener,
): (() => void) => {
  listeners.add(listener);
  if (isHydrated) {
    listener(lastActivityTimestamp);
  }

  return () => {
    listeners.delete(listener);
  };
};

export const recordPrayerActivity = (explicitTimestampMs?: number): void => {
  const timestamp =
    typeof explicitTimestampMs === 'number' && !Number.isNaN(explicitTimestampMs)
      ? explicitTimestampMs
      : Date.now();

  const previous = lastActivityTimestamp;
  const shouldStartNewSession =
    previous === null || timestamp - previous > SESSION_RESET_THRESHOLD_MS;

  if (shouldStartNewSession) {
    sessionStartTimestamp = timestamp;
  } else if (sessionStartTimestamp === null) {
    sessionStartTimestamp = previous;
  }

  lastActivityTimestamp = timestamp;
  isHydrated = true;
  schedulePersist();

  if (previous !== null && timestamp - previous < LAST_NOTIFY_INTERVAL_MS) {
    return;
  }

  notifyListeners();
};
