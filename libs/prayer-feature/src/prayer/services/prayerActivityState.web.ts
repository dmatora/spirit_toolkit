export type PrayerActivityListener = (timestamp: number | null) => void;

const PRAYER_ACTIVITY_STORAGE_KEY = 'prayer/activity/lastScrollAt/v1';
const LAST_NOTIFY_INTERVAL_MS = 1000;
const PERSIST_DEBOUNCE_MS = 10000;
const SESSION_RESET_THRESHOLD_MS = 5 * 60 * 1000;

const hasLocalStorage =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

type PrayerActivityStoragePayload = {
  lastActivity?: number | null;
  sessionStart?: number | null;
};

const defaultPayload: PrayerActivityStoragePayload = {
  lastActivity: null,
  sessionStart: null,
};

let memoryPayload: PrayerActivityStoragePayload = { ...defaultPayload };
let lastActivityTimestamp: number | null = null;
let sessionStartTimestamp: number | null = null;
let isHydrated = false;
const listeners = new Set<PrayerActivityListener>();
let persistTimer: ReturnType<typeof setTimeout> | null = null;

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

const readFromStorage = (): PrayerActivityStoragePayload => {
  if (!hasLocalStorage) {
    return memoryPayload;
  }

  try {
    const raw = window.localStorage.getItem(PRAYER_ACTIVITY_STORAGE_KEY);
    if (!raw) {
      return defaultPayload;
    }

    const parsed = JSON.parse(raw) as PrayerActivityStoragePayload | number | null;
    if (parsed && typeof parsed === 'object') {
      return {
        lastActivity: readTimestamp(parsed.lastActivity),
        sessionStart:
          readTimestamp(parsed.sessionStart) ?? readTimestamp(parsed.lastActivity),
      };
    }

    const numericValue = readTimestamp(parsed);
    if (numericValue !== null) {
      return { lastActivity: numericValue, sessionStart: numericValue };
    }

    return defaultPayload;
  } catch (error) {
    console.warn('[prayerActivityState]', error);
    return defaultPayload;
  }
};

const writeToStorage = (payload: PrayerActivityStoragePayload) => {
  if (!hasLocalStorage) {
    memoryPayload = {
      lastActivity: payload.lastActivity ?? null,
      sessionStart: payload.sessionStart ?? null,
    };
    return;
  }

  try {
    const hasAnyValue =
      payload.lastActivity !== null && typeof payload.lastActivity !== 'undefined'
        ? true
        : payload.sessionStart !== null && typeof payload.sessionStart !== 'undefined';

    if (!hasAnyValue) {
      window.localStorage.removeItem(PRAYER_ACTIVITY_STORAGE_KEY);
    } else {
      window.localStorage.setItem(PRAYER_ACTIVITY_STORAGE_KEY, JSON.stringify(payload));
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
    writeToStorage({
      lastActivity: lastActivityTimestamp,
      sessionStart: sessionStartTimestamp,
    });
  }, PERSIST_DEBOUNCE_MS);
};

export const hydratePrayerActivityFromStorage = async (): Promise<number | null> => {
  if (isHydrated) {
    return lastActivityTimestamp;
  }

  const payload = readFromStorage();
  lastActivityTimestamp = payload.lastActivity ?? null;
  sessionStartTimestamp =
    payload.sessionStart ?? (lastActivityTimestamp !== null ? lastActivityTimestamp : null);
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
