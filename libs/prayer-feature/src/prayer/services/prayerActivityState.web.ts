export type PrayerActivityListener = (timestamp: number | null) => void;

const PRAYER_ACTIVITY_STORAGE_KEY = 'prayer/activity/lastScrollAt/v1';
const LAST_NOTIFY_INTERVAL_MS = 1000;
const PERSIST_DEBOUNCE_MS = 10000;

const hasLocalStorage =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

let memoryTimestamp: number | null = null;
let lastActivityTimestamp: number | null = null;
let isHydrated = false;
const listeners = new Set<PrayerActivityListener>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const readFromStorage = (): number | null => {
  if (!hasLocalStorage) {
    return memoryTimestamp;
  }

  try {
    const raw = window.localStorage.getItem(PRAYER_ACTIVITY_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = Number(JSON.parse(raw));
    if (Number.isNaN(parsed)) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn('[prayerActivityState]', error);
    return null;
  }
};

const writeToStorage = (timestamp: number | null) => {
  if (!hasLocalStorage) {
    memoryTimestamp = timestamp;
    return;
  }

  try {
    if (timestamp === null) {
      window.localStorage.removeItem(PRAYER_ACTIVITY_STORAGE_KEY);
    } else {
      window.localStorage.setItem(PRAYER_ACTIVITY_STORAGE_KEY, JSON.stringify(timestamp));
    }
  } catch (error) {
    console.warn('[prayerActivityState]', error);
  }
};

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

  persistTimer = setTimeout(() => {
    persistTimer = null;
    writeToStorage(lastActivityTimestamp);
  }, PERSIST_DEBOUNCE_MS);
};

export const hydratePrayerActivityFromStorage = async (): Promise<number | null> => {
  if (isHydrated) {
    return lastActivityTimestamp;
  }

  lastActivityTimestamp = readFromStorage();
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
