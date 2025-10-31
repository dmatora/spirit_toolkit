const DEFAULT_BASE_URL = 'http://localhost:4200';
const JOURNAL_PREFIX = '/api/journal';

declare global {
  // eslint-disable-next-line no-var
  var __SPIRIT_SYNC_API__?: string;
  interface Window {
    __SPIRIT_SYNC_API__?: string;
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

export {};
