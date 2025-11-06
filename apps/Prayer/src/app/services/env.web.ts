type MaybeString = string | undefined;

const normalize = (value?: string | null): MaybeString => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

export const envConfig = {
  syncApi: normalize(
    process.env.NEXT_PUBLIC_SPIRIT_SYNC_API ?? process.env.SPIRIT_SYNC_API,
  ),
  syncToken: normalize(
    process.env.NEXT_PUBLIC_SPIRIT_SYNC_TOKEN ??
      process.env.SPIRIT_SYNC_TOKEN ??
      process.env.SPIRIT_SYNC_SECRET ??
      process.env.PRAYER_SYNC_SECRET,
  ),
};

export type EnvConfig = typeof envConfig;
