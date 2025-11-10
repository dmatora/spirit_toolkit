import AsyncStorage from '@react-native-async-storage/async-storage';

export type PrayerActivityThresholds = {
  warningMinutes: number;
  dangerMinutes: number;
  focusMinutes: number;
};

export const STORAGE_KEY = 'prayer/activityConfig/v1';

export const DEFAULT_THRESHOLDS: PrayerActivityThresholds = {
  warningMinutes: 30,
  dangerMinutes: 60,
  focusMinutes: 3,
};

type PrayerActivityThresholdsListener = (thresholds: PrayerActivityThresholds) => void;
const thresholdListeners = new Set<PrayerActivityThresholdsListener>();

const notifyThresholdListeners = (thresholds: PrayerActivityThresholds) => {
  thresholdListeners.forEach((listener) => {
    try {
      listener(thresholds);
    } catch (error) {
      console.warn('[prayerActivityConfig] listener', error);
    }
  });
};

export const subscribeToPrayerActivityThresholdUpdates = (
  listener: PrayerActivityThresholdsListener,
): (() => void) => {
  thresholdListeners.add(listener);
  return () => {
    thresholdListeners.delete(listener);
  };
};

const parseMinutes = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return Math.max(0, Math.round(value));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      const parsed = Number(trimmed);
      if (!Number.isNaN(parsed)) {
        return Math.max(0, Math.round(parsed));
      }
    }
  }

  return fallback;
};

export const sanitizePrayerActivityThresholds = (
  input: Partial<PrayerActivityThresholds>,
): PrayerActivityThresholds => {
  const warning = parseMinutes(input.warningMinutes, DEFAULT_THRESHOLDS.warningMinutes);
  let danger = parseMinutes(input.dangerMinutes, DEFAULT_THRESHOLDS.dangerMinutes);
  const focus = parseMinutes(input.focusMinutes, DEFAULT_THRESHOLDS.focusMinutes);

  if (danger < warning) {
    danger = warning;
  }

  return { warningMinutes: warning, dangerMinutes: danger, focusMinutes: focus };
};

export const ensurePrayerActivityConfigInitialized = async (): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_THRESHOLDS));
    }
  } catch (error) {
    console.warn('[prayerActivityConfig]', error);
  }
};

export const getPrayerActivityThresholds = async (): Promise<PrayerActivityThresholds> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_THRESHOLDS;
    }

    const parsed = JSON.parse(raw) as Partial<PrayerActivityThresholds> | null;
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_THRESHOLDS;
    }

    return sanitizePrayerActivityThresholds(parsed);
  } catch (error) {
    console.warn('[prayerActivityConfig]', error);
    return DEFAULT_THRESHOLDS;
  }
};

export const setPrayerActivityThresholds = async (
  next: PrayerActivityThresholds,
): Promise<PrayerActivityThresholds> => {
  const sanitized = sanitizePrayerActivityThresholds(next);
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.warn('[prayerActivityConfig]', error);
  }
  notifyThresholdListeners(sanitized);
  return sanitized;
};
