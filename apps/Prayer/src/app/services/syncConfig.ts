const DEFAULT_BASE_URL = 'http://localhost:4200';
const JOURNAL_PREFIX = '/api/journal';

declare global {
  // eslint-disable-next-line no-var
  var __SPIRIT_SYNC_API__: string | undefined;
  // eslint-disable-next-line no-var
  var __SPIRIT_SYNC_TOKEN__: string | undefined;
  interface Window {
    __SPIRIT_SYNC_API__?: string;
    __SPIRIT_SYNC_TOKEN__?: string;
  }
}

export const getSyncApiBase = (): string => {
  const override =
    typeof globalThis !== 'undefined' && typeof globalThis.__SPIRIT_SYNC_API__ === 'string'
      ? globalThis.__SPIRIT_SYNC_API__
      : undefined;

  const trimmed = override?.trim();
  if (trimmed) {
    return trimmed.replace(/\/+$/, '');
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
    typeof globalThis !== 'undefined' && typeof globalThis.__SPIRIT_SYNC_TOKEN__ === 'string'
      ? globalThis.__SPIRIT_SYNC_TOKEN__
      : undefined;

  const fromWindow =
    typeof window !== 'undefined' && typeof window.__SPIRIT_SYNC_TOKEN__ === 'string'
      ? window.__SPIRIT_SYNC_TOKEN__
      : undefined;

  const fromEnv =
    typeof process !== 'undefined' && process?.env
      ? process.env.SPIRIT_SYNC_SECRET ?? process.env.PRAYER_SYNC_SECRET
      : undefined;

  const token = fromGlobal ?? fromWindow ?? fromEnv;
  const trimmed = token?.trim();
  return trimmed || undefined;
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
