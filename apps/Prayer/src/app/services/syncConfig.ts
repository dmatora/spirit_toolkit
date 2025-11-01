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

export const getSyncApiBase = (): string => {
  const override =
    typeof globalThis !== 'undefined' && typeof (globalThis as Record<string, unknown>).spiritSyncApi === 'string'
      ? String((globalThis as Record<string, unknown>).spiritSyncApi)
      : undefined;

  if (override) {
    const trimmed = override.trim();
    if (trimmed) {
      return trimmed.replace(/\/+$/, '');
    }
  }

  return DEFAULT_BASE_URL;
};

export const resolveUrl = (path: string): string => {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const base = getSyncApiBase().replace(/\/+$/, '');
  return `${base}${JOURNAL_PREFIX}${normalized}`;
};

export const getSyncAuthToken = (): string | undefined => {
  const fromGlobal =
    typeof globalThis !== 'undefined' && typeof (globalThis as Record<string, unknown>).spiritSyncToken === 'string'
      ? String((globalThis as Record<string, unknown>).spiritSyncToken)
      : undefined;

  const fromWindow =
    typeof window !== 'undefined' && typeof window.spiritSyncToken === 'string'
      ? window.spiritSyncToken
      : undefined;

  const fromEnv =
    typeof process !== 'undefined' && process?.env
      ? process.env.SPIRIT_SYNC_SECRET ?? process.env.PRAYER_SYNC_SECRET
      : undefined;

  const token = fromGlobal ?? fromWindow ?? fromEnv;
  if (typeof token === 'string') {
    const trimmed = token.trim();
    return trimmed || undefined;
  }
  return undefined;
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

export {};
