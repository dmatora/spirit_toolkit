import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  calculateLiturgicalPeriod,
  createOrdinaryLiturgicalPeriod,
  getLiturgicalPeriodInfoForKey,
  isLiturgicalPeriodKey,
  type LiturgicalPeriodInfo,
  type LiturgicalPeriodKey,
} from '../utils/liturgicalPeriods';

const STORAGE_KEY = 'liturgicalCalendar/settings/v1';
const NOTICE_STORAGE_KEY = 'liturgicalCalendar/periodNotice/v1';

export type LiturgicalCalendarSettings = {
  autoDetect: boolean;
  manualPeriod: LiturgicalPeriodKey;
};

export type EffectiveLiturgicalCalendar = {
  settings: LiturgicalCalendarSettings;
  period: LiturgicalPeriodInfo;
  isReady: boolean;
};

export const DEFAULT_LITURGICAL_CALENDAR_SETTINGS: LiturgicalCalendarSettings = {
  autoDetect: true,
  manualPeriod: 'ordinary',
};

export const SAFE_LITURGICAL_CALENDAR_SETTINGS: LiturgicalCalendarSettings = {
  autoDetect: false,
  manualPeriod: 'ordinary',
};

type Listener = () => void;

const listeners = new Set<Listener>();

let memorySettings: LiturgicalCalendarSettings | null = null;

const cloneSettings = (
  settings: LiturgicalCalendarSettings,
): LiturgicalCalendarSettings => ({
  autoDetect: settings.autoDetect,
  manualPeriod: settings.manualPeriod,
});

const sanitizeSettings = (
  value: unknown,
  fallback: LiturgicalCalendarSettings,
): LiturgicalCalendarSettings => {
  if (typeof value !== 'object' || value === null) {
    return cloneSettings(fallback);
  }

  const candidate = value as Partial<LiturgicalCalendarSettings>;
  if (
    typeof candidate.autoDetect !== 'boolean' ||
    !isLiturgicalPeriodKey(candidate.manualPeriod)
  ) {
    return cloneSettings(fallback);
  }

  return {
    autoDetect: candidate.autoDetect,
    manualPeriod: candidate.manualPeriod,
  };
};

const notifyListeners = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

export const subscribeLiturgicalCalendarSettings = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const ensureLiturgicalCalendarSettingsInitialized = async (): Promise<void> => {
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existing) {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(DEFAULT_LITURGICAL_CALENDAR_SETTINGS),
      );
      memorySettings = cloneSettings(DEFAULT_LITURGICAL_CALENDAR_SETTINGS);
    }
  } catch (error) {
    console.warn('[liturgicalCalendar] Failed to initialize settings', error);
  }
};

export const getLiturgicalCalendarSettings =
  async (): Promise<LiturgicalCalendarSettings> => {
    if (memorySettings) {
      return cloneSettings(memorySettings);
    }

    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        memorySettings = cloneSettings(DEFAULT_LITURGICAL_CALENDAR_SETTINGS);
        return cloneSettings(memorySettings);
      }

      const parsed = JSON.parse(raw) as unknown;
      memorySettings = sanitizeSettings(
        parsed,
        SAFE_LITURGICAL_CALENDAR_SETTINGS,
      );
      return cloneSettings(memorySettings);
    } catch (error) {
      console.warn('[liturgicalCalendar] Failed to read settings', error);
      memorySettings = cloneSettings(SAFE_LITURGICAL_CALENDAR_SETTINGS);
      return cloneSettings(memorySettings);
    }
  };

export const setLiturgicalCalendarSettings = async (
  nextSettings: Partial<LiturgicalCalendarSettings>,
): Promise<LiturgicalCalendarSettings> => {
  const current = await getLiturgicalCalendarSettings();
  const merged = sanitizeSettings(
    {
      ...current,
      ...nextSettings,
    },
    SAFE_LITURGICAL_CALENDAR_SETTINGS,
  );

  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch (error) {
    console.warn('[liturgicalCalendar] Failed to persist settings', error);
  }

  memorySettings = cloneSettings(merged);
  notifyListeners();
  return cloneSettings(merged);
};

export const resolveLiturgicalCalendarSync = (
  settings: LiturgicalCalendarSettings = SAFE_LITURGICAL_CALENDAR_SETTINGS,
  now: Date = new Date(),
): EffectiveLiturgicalCalendar => {
  try {
    const sanitized = sanitizeSettings(
      settings,
      SAFE_LITURGICAL_CALENDAR_SETTINGS,
    );

    const period = sanitized.autoDetect
      ? calculateLiturgicalPeriod(now)
      : getLiturgicalPeriodInfoForKey(sanitized.manualPeriod, now);

    return {
      settings: sanitized,
      period,
      isReady: true,
    };
  } catch (_error) {
    return {
      settings: cloneSettings(SAFE_LITURGICAL_CALENDAR_SETTINGS),
      period: createOrdinaryLiturgicalPeriod(now, true),
      isReady: true,
    };
  }
};

export const getEffectiveLiturgicalCalendar = async (
  now: Date = new Date(),
): Promise<EffectiveLiturgicalCalendar> => {
  try {
    const settings = await getLiturgicalCalendarSettings();
    return resolveLiturgicalCalendarSync(settings, now);
  } catch (error) {
    console.warn('[liturgicalCalendar] Failed to resolve effective period', error);
    return {
      settings: cloneSettings(SAFE_LITURGICAL_CALENDAR_SETTINGS),
      period: createOrdinaryLiturgicalPeriod(now, true),
      isReady: true,
    };
  }
};

export const createInitialLiturgicalCalendarState = (
  now: Date = new Date(),
): EffectiveLiturgicalCalendar => ({
  settings: cloneSettings(SAFE_LITURGICAL_CALENDAR_SETTINGS),
  period: createOrdinaryLiturgicalPeriod(now),
  isReady: false,
});

const getPeriodNoticeSignature = (period: LiturgicalPeriodInfo): string => {
  const startDate = period.startsAt?.toISOString().slice(0, 10) ?? 'floating';
  return `${period.key}:${startDate}`;
};

export const shouldShowLiturgicalPeriodNotice = async (
  period: LiturgicalPeriodInfo,
): Promise<boolean> => {
  if (period.key === 'ordinary') {
    return false;
  }

  try {
    const lastSeen = await AsyncStorage.getItem(NOTICE_STORAGE_KEY);
    return lastSeen !== getPeriodNoticeSignature(period);
  } catch (error) {
    console.warn('[liturgicalCalendar] Failed to read notice state', error);
    return false;
  }
};

export const markLiturgicalPeriodNoticeSeen = async (
  period: LiturgicalPeriodInfo,
): Promise<void> => {
  try {
    await AsyncStorage.setItem(NOTICE_STORAGE_KEY, getPeriodNoticeSignature(period));
  } catch (error) {
    console.warn('[liturgicalCalendar] Failed to persist notice state', error);
  }
};
