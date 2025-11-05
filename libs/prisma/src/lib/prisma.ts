import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaNeon } from '@prisma/adapter-neon';
import { neon, neonConfig } from '@neondatabase/serverless';
import { load } from 'ts-dotenv';

const { NODE_ENV, LOG_PRETTY } = load({
  NODE_ENV: ['dev' as const, 'prod' as const],
  LOG_PRETTY: Boolean,
});

const isDevEnv = NODE_ENV !== 'prod';

const createClientOptions = (): Prisma.PrismaClientOptions => {
  const options: Prisma.PrismaClientOptions = {
    log: isDevEnv ? ['query', 'error', 'warn'] : ['error', 'warn'],
    errorFormat: LOG_PRETTY ? 'pretty' : 'colorless',
  };

  const pooledUrl =
    process.env.DATABASE_URL_POOLING ?? process.env.DATABASE_URL ?? undefined;

  const unpooledUrl =
    process.env.DATABASE_URL_UNPOOLED ??
    process.env.DATABASE_URL_NON_POOLING ??
    undefined;

  const datasourceUrl = pooledUrl ?? unpooledUrl;

  if (!datasourceUrl) {
    return options;
  }

  options.datasourceUrl = datasourceUrl;

  const shouldUseNeonAdapter =
    !process.env.PRISMA_DISABLE_NEON_ADAPTER &&
    (pooledUrl?.includes('neon.tech') ||
      datasourceUrl.includes('neon.tech'));

  if (shouldUseNeonAdapter) {
    neonConfig.fetchConnectionCache = true;
    options.adapter = new PrismaNeon(neon(datasourceUrl));
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

export type ActivityWithMemoAndImages = Prisma.activityGetPayload<{
  include: { memo: true };
}> & {
  thumbnail: string;
  screenshot: string;
};
