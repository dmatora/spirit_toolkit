import { SPIRIT_SYNC_API, SPIRIT_SYNC_TOKEN } from '@env';

type MaybeString = string | undefined;

const normalize = (value?: string | null): MaybeString => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const envConfig = {
  syncApi: normalize(SPIRIT_SYNC_API ?? undefined),
  syncToken: normalize(SPIRIT_SYNC_TOKEN ?? undefined),
};

export type EnvConfig = typeof envConfig;
