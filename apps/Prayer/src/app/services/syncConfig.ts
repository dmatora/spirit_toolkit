import { envConfig } from './env';

const DEFAULT_BASE_URL = 'http://localhost:4200';
const JOURNAL_PREFIX = '/api/journal';
export const SYNC_SECRET_STORAGE_KEY = 'spirit/sync-secret';

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

const { syncApi: buildTimeSyncApi, syncToken: buildTimeSyncToken } = envConfig;

const resolveBuildTimeSyncToken = (): MaybeString =>
  normalize(buildTimeSyncToken);

export const hasBuildTimeSyncToken = (): boolean =>
  Boolean(resolveBuildTimeSyncToken());

const resolveGlobalSyncApi = (): MaybeString =>
  pickFirst(
    normalize(buildTimeSyncApi),
    typeof window !== 'undefined' ? window.spiritSyncApi : undefined,
    typeof globalThis !== 'undefined' ? globalThis.spiritSyncApi : undefined,
  );

const resolveGlobalSyncToken = (): MaybeString => {
  const buildTimeToken = resolveBuildTimeSyncToken();
  if (buildTimeToken) {
    return buildTimeToken;
  }
  return pickFirst(
    typeof window !== 'undefined' ? window.spiritSyncToken : undefined,
    typeof globalThis !== 'undefined' ? globalThis.spiritSyncToken : undefined,
  );
};

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

export const setRuntimeSyncToken = (token?: string): void => {
  const normalized = normalize(token);
  if (typeof window !== 'undefined') {
    if (normalized) {
      window.spiritSyncToken = normalized;
    } else {
      delete window.spiritSyncToken;
    }
  }
  if (typeof globalThis !== 'undefined') {
    if (normalized) {
      globalThis.spiritSyncToken = normalized;
    } else {
      delete globalThis.spiritSyncToken;
    }
  }
};

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

export const isSyncEnabled = (): boolean => !!getSyncAuthToken();

export {};
