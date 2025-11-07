export type PrayerActivityThresholds = {
  warningMinutes: number;
  dangerMinutes: number;
};

export const STORAGE_KEY = 'prayer/activityConfig/v1';

export const DEFAULT_THRESHOLDS: PrayerActivityThresholds = {
  warningMinutes: 30,
  dangerMinutes: 60,
};

const hasLocalStorage =
  typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

let memoryThresholds: PrayerActivityThresholds = DEFAULT_THRESHOLDS;

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

  if (danger < warning) {
    danger = warning;
  }

  return { warningMinutes: warning, dangerMinutes: danger };
};

const writeToMemory = (thresholds: PrayerActivityThresholds) => {
  memoryThresholds = {
    warningMinutes: thresholds.warningMinutes,
    dangerMinutes: thresholds.dangerMinutes,
  };
};

const readFromMemory = (): PrayerActivityThresholds => ({
  warningMinutes: memoryThresholds.warningMinutes,
  dangerMinutes: memoryThresholds.dangerMinutes,
});

export const ensurePrayerActivityConfigInitialized = async (): Promise<void> => {
  if (!hasLocalStorage) {
    writeToMemory(DEFAULT_THRESHOLDS);
    return;
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_THRESHOLDS));
    }
  } catch (error) {
    console.warn('[prayerActivityConfig]', error);
  }
};

export const getPrayerActivityThresholds = async (): Promise<PrayerActivityThresholds> => {
  if (!hasLocalStorage) {
    return readFromMemory();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
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

  if (!hasLocalStorage) {
    writeToMemory(sanitized);
    return sanitized;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
  } catch (error) {
    console.warn('[prayerActivityConfig]', error);
  }

  return sanitized;
};
