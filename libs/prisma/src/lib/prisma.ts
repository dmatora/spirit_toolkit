import { Prisma, PrismaClient } from '@prisma/client';
import { load } from 'ts-dotenv';

const { NODE_ENV, LOG_PRETTY } = load({
  NODE_ENV: ['dev' as const, 'prod' as const],
  LOG_PRETTY: Boolean,
});

const isDevEnv = NODE_ENV !== 'prod';

export const prisma = new PrismaClient({
  log: isDevEnv ? ['query', 'error', 'warn'] : ['error', 'warn'],
  errorFormat: LOG_PRETTY ? 'pretty' : 'colorless',
});

export const prismaResetCachedPlan = async () => {
  return prisma.$executeRawUnsafe(`DISCARD PLANS`);
};

export type ActivityWithMemoAndImages = Prisma.activityGetPayload<{
  include: { memo: true };
}> & {
  thumbnail: string;
  screenshot: string;
};
