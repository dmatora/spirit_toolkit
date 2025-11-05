const DEFAULT_BASE_URL = 'http://localhost:4200';
const JOURNAL_PREFIX = '/api/journal';

declare global {
  // eslint-disable-next-line no-var
  var spiritSyncApi: string | undefined;
  // eslint-disable-next-line no-var
  var spiritSyncToken: string | undefined;
  interface Window {
    spiritSyncApi?: string;
    spiritSyncToken?: string;
  }
}

type MaybeString = string | undefined;

const isReactNativeRuntime = (): boolean => {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator === 'object' &&
    // @ts-expect-error navigator might not have product in some environments
    navigator?.product === 'ReactNative'
  );
};

const loadNativeEnv = (): { api?: MaybeString; token?: MaybeString } => {
  if (!isReactNativeRuntime()) {
    return {};
  }

  try {
    // Use eval to avoid static analysis in non-native builds.
    // eslint-disable-next-line no-eval, @typescript-eslint/no-unsafe-assignment
    const nativeModule = eval('require')('@env') as Partial<{
      SPIRIT_SYNC_API?: string;
      SPIRIT_SYNC_TOKEN?: string;
    }>;
    return {
      api: nativeModule?.SPIRIT_SYNC_API,
      token: nativeModule?.SPIRIT_SYNC_TOKEN,
    };
  } catch (error) {
    console.warn('[syncConfig] Unable to load @env module', error);
    return {};
  }
};

const normalize = (value: unknown): MaybeString => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const pickFirst = (...values: Array<MaybeString | undefined>): MaybeString => {
  for (const value of values) {
    const normalized = normalize(value);
    if (normalized) {
      return normalized;
    }
  }
  return undefined;
};

const nativeEnv = loadNativeEnv();

const resolveGlobalSyncApi = (): MaybeString =>
  pickFirst(
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SPIRIT_SYNC_API : undefined,
    typeof process !== 'undefined' ? process.env?.SPIRIT_SYNC_API : undefined,
    nativeEnv.api,
    typeof window !== 'undefined' ? window.spiritSyncApi : undefined,
    typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>).spiritSyncApi : undefined,
  );

const resolveGlobalSyncToken = (): MaybeString =>
  pickFirst(
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SPIRIT_SYNC_TOKEN : undefined,
    typeof process !== 'undefined'
      ? process.env?.SPIRIT_SYNC_TOKEN ?? process.env?.SPIRIT_SYNC_SECRET ?? process.env?.PRAYER_SYNC_SECRET
      : undefined,
    nativeEnv.token,
    typeof window !== 'undefined' ? window.spiritSyncToken : undefined,
    typeof globalThis !== 'undefined' ? (globalThis as Record<string, unknown>).spiritSyncToken : undefined,
  );

export const getSyncApiBase = (): string => {
  const override = resolveGlobalSyncApi();
  if (override) {
    return override.replace(/\/+$/, '');
  }
  return DEFAULT_BASE_URL;
};

export const resolveUrl = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getSyncApiBase().replace(/\/+$/, '');
  return `${base}${JOURNAL_PREFIX}${normalized}`;
};

export const getSyncAuthToken = (): string | undefined => resolveGlobalSyncToken();

export const withSyncAuthHeaders = (
  headers: Record<string, string>,
): Record<string, string> => {
  const token = getSyncAuthToken();
  if (!token) {
    return headers;
  }
  return {
    ...headers,
    'X-Spirit-Sync-Token': token,
  };
};

export {};
