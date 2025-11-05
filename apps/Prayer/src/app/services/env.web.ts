type MaybeString = string | undefined;

const normalize = (value?: string | null): MaybeString => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
};

const runtimeEnv = (): NodeJS.ProcessEnv => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env;
  }
  return {};
};

const env = runtimeEnv();

export const envConfig = {
  syncApi: normalize(env.NEXT_PUBLIC_SPIRIT_SYNC_API ?? env.SPIRIT_SYNC_API),
  syncToken: normalize(
    env.NEXT_PUBLIC_SPIRIT_SYNC_TOKEN ??
      env.SPIRIT_SYNC_TOKEN ??
      env.SPIRIT_SYNC_SECRET ??
      env.PRAYER_SYNC_SECRET,
  ),
};

export type EnvConfig = typeof envConfig;
