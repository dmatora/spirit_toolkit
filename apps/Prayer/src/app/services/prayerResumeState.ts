import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PrayerId } from '@spirit/prayer-feature';

const STORAGE_KEY = 'prayer/resumeState/v1';
const PERSIST_DEBOUNCE_MS = 400;
const COMPLETION_THRESHOLD_PX = 48;

export const PRAYER_AUTO_RETURN_TIMEOUT_MS = 6 * 60 * 60 * 1000;

export type PrayerResumeState = {
  prayerId: PrayerId;
  scrollY: number;
  maxScrollableY: number;
  lastActiveAt: number;
  isCompleted: boolean;
};

type PrayerResumeListener = (state: PrayerResumeState | null) => void;

type PrayerResumePayload = Partial<PrayerResumeState> | null;

let currentState: PrayerResumeState | null = null;
let isHydrated = false;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

const listeners = new Set<PrayerResumeListener>();

const warn = (error: unknown, context: string) => {
  console.warn(`[prayerResumeState] ${context}`, error);
};

const notifyListeners = () => {
  listeners.forEach((listener) => {
    try {
      listener(currentState);
    } catch (error) {
      warn(error, 'listener');
    }
  });
};

const normalizePrayerId = (value: unknown): PrayerId | null =>
  typeof value === 'string' && value.length > 0 ? (value as PrayerId) : null;

const normalizeNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
};

const parseStoredState = (raw: string | null): PrayerResumeState | null => {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as PrayerResumePayload;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }

    const prayerId = normalizePrayerId(parsed.prayerId);
    if (!prayerId) {
      return null;
    }

    const scrollY = normalizeNumber(parsed.scrollY);
    const maxScrollableY = normalizeNumber(parsed.maxScrollableY);
    const lastActiveAt = normalizeNumber(parsed.lastActiveAt);
    const isCompleted = Boolean(parsed.isCompleted);

    return {
      prayerId,
      scrollY: Math.min(scrollY, maxScrollableY || scrollY),
      maxScrollableY,
      lastActiveAt,
      isCompleted,
    };
  } catch (error) {
    warn(error, 'parse');
    return null;
  }
};

const persistNow = async () => {
  try {
    if (!currentState) {
      await AsyncStorage.removeItem(STORAGE_KEY);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(currentState));
  } catch (error) {
    warn(error, 'persist');
  }
};

const schedulePersist = () => {
  if (persistTimer) {
    clearTimeout(persistTimer);
  }

  persistTimer = setTimeout(() => {
    persistTimer = null;
    void persistNow();
  }, PERSIST_DEBOUNCE_MS);
};

const commitState = (
  nextState: PrayerResumeState | null
): PrayerResumeState | null => {
  currentState = nextState;
  isHydrated = true;
  schedulePersist();
  notifyListeners();
  return currentState;
};

export const hydratePrayerResumeState =
  async (): Promise<PrayerResumeState | null> => {
    if (isHydrated) {
      return currentState;
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      currentState = parseStoredState(raw);
    } catch (error) {
      warn(error, 'hydrate');
      currentState = null;
    }

    isHydrated = true;
    return currentState;
  };

export const getPrayerResumeStateSync = (): PrayerResumeState | null =>
  currentState;

export const subscribeToPrayerResumeState = (
  listener: PrayerResumeListener
): (() => void) => {
  listeners.add(listener);
  if (isHydrated) {
    listener(currentState);
  }

  return () => {
    listeners.delete(listener);
  };
};

export const startPrayerSession = (
  prayerId: PrayerId,
  timestampMs: number = Date.now()
): PrayerResumeState =>
  commitState({
    prayerId,
    scrollY: 0,
    maxScrollableY: 0,
    lastActiveAt: Math.max(0, Math.round(timestampMs)),
    isCompleted: false,
  }) as PrayerResumeState;

export const touchPrayerSession = (
  prayerId: PrayerId,
  timestampMs: number = Date.now()
): PrayerResumeState => {
  const nextTimestamp = Math.max(0, Math.round(timestampMs));

  if (currentState?.prayerId === prayerId) {
    return commitState({
      ...currentState,
      lastActiveAt: nextTimestamp,
    }) as PrayerResumeState;
  }

  return startPrayerSession(prayerId, nextTimestamp);
};

export const recordPrayerScrollProgress = (input: {
  prayerId: PrayerId;
  scrollY: number;
  maxScrollableY: number;
  timestampMs?: number;
}): PrayerResumeState => {
  const nextScrollY = normalizeNumber(input.scrollY);
  const nextMaxScrollableY = normalizeNumber(input.maxScrollableY);
  const clampedScrollY =
    nextMaxScrollableY > 0
      ? Math.min(nextScrollY, nextMaxScrollableY)
      : nextScrollY;
  const nextTimestamp = normalizeNumber(input.timestampMs ?? Date.now());
  const isCompleted =
    nextMaxScrollableY > 0 &&
    nextMaxScrollableY - clampedScrollY <= COMPLETION_THRESHOLD_PX;

  return commitState({
    prayerId: input.prayerId,
    scrollY: clampedScrollY,
    maxScrollableY: nextMaxScrollableY,
    lastActiveAt: nextTimestamp,
    isCompleted,
  }) as PrayerResumeState;
};

export const canResumePrayer = (
  state: PrayerResumeState | null
): state is PrayerResumeState =>
  Boolean(state && !state.isCompleted && state.scrollY > 0);

export const isPrayerSessionExpired = (
  state: PrayerResumeState | null,
  nowMs: number = Date.now()
): boolean => {
  if (!state) {
    return false;
  }

  return nowMs - state.lastActiveAt >= PRAYER_AUTO_RETURN_TIMEOUT_MS;
};

export const flushPrayerResumeState = async (): Promise<void> => {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }

  await persistNow();
};
