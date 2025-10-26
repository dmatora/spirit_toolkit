export type MetricKey = 'liturgy' | 'communion' | (string & {});

export type Thresholds = {
  normal: number;
  warning: number;
};

export type MetricConfig = {
  title: string;
  thresholds: Thresholds;
};

export type AttendanceConfig = {
  primaryMetric: MetricKey;
  metrics: Record<MetricKey, MetricConfig>;
};

const STORAGE_KEY = 'attendance/config/v1';
const hasLocalStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const PRESETS = {
  restoring: { normal: 14, warning: 30 },
  regular: { normal: 7, warning: 21 },
  diligent: { normal: 4, warning: 14 },
} as const;

export const DEFAULT_CONFIG: AttendanceConfig = {
  primaryMetric: 'liturgy',
  metrics: {
    liturgy: {
      title: 'Посещение Литургии',
      thresholds: PRESETS.regular,
    },
    communion: {
      title: 'Причастие',
      thresholds: { normal: 14, warning: 40 },
    },
  },
};

const DEFAULT_CLONE = () => JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as AttendanceConfig;

const cloneThresholds = (source: Thresholds): Thresholds => ({
  normal: source.normal,
  warning: source.warning,
});

const cloneConfig = (config: AttendanceConfig): AttendanceConfig => ({
  primaryMetric: config.primaryMetric,
  metrics: Object.fromEntries(
    Object.entries(config.metrics).map(([key, value]) => [
      key,
      {
        title: value.title,
        thresholds: cloneThresholds(value.thresholds),
      },
    ]),
  ) as AttendanceConfig['metrics'],
});

const ensurePrimaryMetric = (config: AttendanceConfig): AttendanceConfig => {
  if (config.metrics[config.primaryMetric]) {
    return config;
  }
  return {
    ...config,
    primaryMetric: 'liturgy',
  };
};

export const sanitizeThresholds = (t: Partial<Thresholds>): Thresholds => {
  const base = DEFAULT_CONFIG.metrics.liturgy.thresholds;

  const parseValue = (value: unknown, fallback: number) => {
    if (typeof value !== 'number' || Number.isNaN(value)) {
      return fallback;
    }
    return Math.max(0, Math.round(value));
  };

  const normal = parseValue(t.normal, base.normal);
  let warning = parseValue(t.warning, Math.max(base.warning, normal));

  if (warning < normal) {
    warning = normal;
  }

  return { normal, warning };
};

const safeParseConfig = (raw: string | null): AttendanceConfig | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AttendanceConfig;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (!parsed.metrics || typeof parsed.metrics !== 'object') {
      return null;
    }
    const normalized = ensurePrimaryMetric(cloneConfig(parsed));
    return normalized;
  } catch (error) {
    console.warn('[attendanceConfig:web] Failed to parse config', error);
    return null;
  }
};

let memoryConfig: AttendanceConfig | null = null;

const readFromMemory = (): AttendanceConfig => {
  if (!memoryConfig) {
    memoryConfig = DEFAULT_CLONE();
  }
  return cloneConfig(memoryConfig);
};

const writeToMemory = (config: AttendanceConfig): void => {
  memoryConfig = cloneConfig(config);
};

export const ensureSettingsInitialized = async (): Promise<void> => {
  if (!hasLocalStorage) {
    writeToMemory(DEFAULT_CLONE());
    return;
  }

  try {
    const existing = window.localStorage.getItem(STORAGE_KEY);
    if (!existing) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
    }
  } catch (error) {
    console.warn('[attendanceConfig:web] Failed to initialize settings', error);
  }
};

export const readConfig = async (): Promise<AttendanceConfig> => {
  if (!hasLocalStorage) {
    return readFromMemory();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = safeParseConfig(raw);
    if (parsed) {
      return parsed;
    }
  } catch (error) {
    console.warn('[attendanceConfig:web] Failed to read config', error);
  }

  return DEFAULT_CLONE();
};

export const writeConfig = async (cfg: AttendanceConfig): Promise<void> => {
  if (!hasLocalStorage) {
    writeToMemory(cfg);
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch (error) {
    console.warn('[attendanceConfig:web] Failed to write config', error);
  }
};

export const getLiturgyThresholds = async (): Promise<Thresholds> => {
  const config = await readConfig();
  const liturgy = config.metrics.liturgy;
  if (liturgy && liturgy.thresholds) {
    return cloneThresholds(liturgy.thresholds);
  }
  return cloneThresholds(DEFAULT_CONFIG.metrics.liturgy.thresholds);
};

export const setLiturgyThresholds = async (next: Thresholds): Promise<AttendanceConfig> => {
  const sanitized = sanitizeThresholds(next);
  const config = await readConfig();
  const updated: AttendanceConfig = {
    ...config,
    metrics: {
      ...config.metrics,
      liturgy: {
        ...(config.metrics.liturgy ?? {
          title: 'Литургия',
          thresholds: cloneThresholds(DEFAULT_CONFIG.metrics.liturgy.thresholds),
        }),
        thresholds: sanitized,
      },
    },
  };

  await writeConfig(updated);
  return updated;
};

export const applyPresetTo = async (
  metricKey: MetricKey,
  preset: keyof typeof PRESETS,
): Promise<AttendanceConfig> => {
  const config = await readConfig();
  const presetThresholds = PRESETS[preset];
  const existingMetric = config.metrics[metricKey];
  const updated: AttendanceConfig = {
    ...config,
    metrics: {
      ...config.metrics,
      [metricKey]: {
        title: existingMetric?.title ?? String(metricKey),
        thresholds: cloneThresholds(presetThresholds),
      },
    },
  };

  await writeConfig(updated);
  return updated;
};
