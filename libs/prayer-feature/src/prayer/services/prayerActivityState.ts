import AsyncStorage from '@react-native-async-storage/async-storage';

export type PrayerActivityListener = (timestamp: number | null) => void;

const PRAYER_ACTIVITY_STORAGE_KEY = 'prayer/activity/lastScrollAt/v1';
const LAST_NOTIFY_INTERVAL_MS = 1000;
const PERSIST_DEBOUNCE_MS = 10000;

let lastActivityTimestamp: number | null = null;
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

const schedulePersist = () => {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(async () => {
    persistTimer = null;
    try {
      if (lastActivityTimestamp === null) {
        await AsyncStorage.removeItem(PRAYER_ACTIVITY_STORAGE_KEY);
      } else {
        await AsyncStorage.setItem(
          PRAYER_ACTIVITY_STORAGE_KEY,
          JSON.stringify(lastActivityTimestamp),
        );
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
      const parsed = Number(JSON.parse(raw));
      if (!Number.isNaN(parsed)) {
        lastActivityTimestamp = parsed;
      } else {
        lastActivityTimestamp = null;
      }
    } else {
      lastActivityTimestamp = null;
    }
  } catch (error) {
    console.warn('[prayerActivityState]', error);
    lastActivityTimestamp = null;
  }

  isHydrated = true;
  return lastActivityTimestamp;
};

export const getLastPrayerActivitySync = (): number | null => lastActivityTimestamp;

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
  lastActivityTimestamp = timestamp;
  isHydrated = true;
  schedulePersist();

  if (previous !== null && timestamp - previous < LAST_NOTIFY_INTERVAL_MS) {
    return;
  }

  notifyListeners();
};
