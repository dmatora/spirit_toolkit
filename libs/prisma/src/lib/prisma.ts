import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { load } from 'ts-dotenv';

const { NODE_ENV: rawNodeEnv, LOG_PRETTY } = load({
  NODE_ENV: ['dev' as const, 'prod' as const, 'production' as const],
  LOG_PRETTY: { type: Boolean, optional: true },
});

const normalizedNodeEnv = rawNodeEnv === 'production' ? 'prod' : rawNodeEnv;
const isDevEnv = normalizedNodeEnv !== 'prod';
const prettyLogsEnabled = LOG_PRETTY ?? false;

const createClientOptions = (): Prisma.PrismaClientOptions => {
  const options: Prisma.PrismaClientOptions = {
    log: isDevEnv ? ['query', 'error', 'warn'] : ['error', 'warn'],
    errorFormat: prettyLogsEnabled ? 'pretty' : 'colorless',
  };

  const pooledUrl =
    process.env.DATABASE_URL_POOLING ?? process.env.DATABASE_URL ?? undefined;

  const unpooledUrl =
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL_NON_POOLING ??
    undefined;

  const datasourceUrl = pooledUrl ?? unpooledUrl;

  if (datasourceUrl) {
    const shouldUseNeonAdapter =
      !process.env.PRISMA_DISABLE_NEON_ADAPTER &&
      (pooledUrl?.includes('neon.tech') ||
        datasourceUrl.includes('neon.tech'));

    if (shouldUseNeonAdapter) {
      neonConfig.fetchConnectionCache = true;
      const pool = new Pool({ connectionString: datasourceUrl });
      options.adapter = new PrismaNeon(pool);
    } else {
      options.datasourceUrl = datasourceUrl;
    }
  }

  return options;
};

const prismaClientSingleton = () => new PrismaClient(createClientOptions());

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

declare global {
  // eslint-disable-next-line no-var
  var __spiritPrisma: PrismaClientSingleton | undefined;
}

export const prisma: PrismaClientSingleton =
  globalThis.__spiritPrisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.__spiritPrisma = prisma;
}

export const prismaResetCachedPlan = async () => {
  return prisma.$executeRawUnsafe(`DISCARD PLANS`);
};
