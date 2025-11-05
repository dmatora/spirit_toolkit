import { prisma } from '@spirit/prisma';
import type {
  Prisma,
  JournalDeletion as PrismaJournalDeletion,
  JournalEntry as PrismaJournalEntry,
} from '@prisma/client';

export type ServerJournalEntry = {
  id: number;
  cursor: number;
  prayer_id: string;
  timestamp: number;
  createdAt: number;
};

export type ServerJournalDeletion = {
  cursor: number;
  prayer_id: string;
  timestamp: number;
  deletedAt: number;
};

type DraftEntry = {
  prayer_id: string;
  timestamp: number;
};

export async function readAll(): Promise<ServerJournalEntry[]> {
  const entries = await prisma.journalEntry.findMany({
    orderBy: { cursor: 'asc' },
  });
  return entries.map(mapPrismaEntry);
}

export async function appendMany(
  drafts: DraftEntry[],
): Promise<ServerJournalEntry[]> {
  const uniqueDrafts = collectUniqueDrafts(drafts);
  if (uniqueDrafts.length === 0) {
    return [];
  }

  return prisma.$transaction(async (tx) => {
    const [entryMax, deletionMax, existingEntries] = await Promise.all([
      tx.journalEntry.aggregate({ _max: { cursor: true } }),
      tx.journalDeletion.aggregate({ _max: { cursor: true } }),
      tx.journalEntry.findMany({
        where: buildEntryWhere(uniqueDrafts),
        select: { prayer_id: true, timestamp: true },
      }),
    ]);

    const existingKeys = new Set(existingEntries.map(entryKey));
    const draftsToInsert = uniqueDrafts.filter(
      (draft) => !existingKeys.has(entryKey(draft)),
    );

    if (draftsToInsert.length === 0) {
      return [];
    }

    const currentMaxCursor = Math.max(
      entryMax._max.cursor ?? 0,
      deletionMax._max.cursor ?? 0,
    );
    const now = Date.now();
    let cursor = currentMaxCursor > 0 ? currentMaxCursor + 1 : 1;

    const createdEntries: PrismaJournalEntry[] = [];

    for (const draft of draftsToInsert) {
      const created = await tx.journalEntry.create({
        data: {
          cursor,
          prayer_id: draft.prayer_id,
          timestamp: draft.timestamp,
          createdAt: BigInt(now),
        },
      });
      createdEntries.push(created);
      cursor += 1;
    }

    const deletionsWhere = buildDeletionWhere(draftsToInsert);
    if (deletionsWhere) {
      await tx.journalDeletion.deleteMany({
        where: deletionsWhere,
      });
    }

    return createdEntries
      .sort((a, b) => a.cursor - b.cursor)
      .map(mapPrismaEntry);
  });
}

export async function registerDeletions(
  drafts: DraftEntry[],
): Promise<ServerJournalDeletion[]> {
  const uniqueDrafts = collectUniqueDrafts(drafts);
  if (uniqueDrafts.length === 0) {
    return [];
  }

  return prisma.$transaction(async (tx) => {
    const [entryMax, deletionMax, existingDeletions] = await Promise.all([
      tx.journalEntry.aggregate({ _max: { cursor: true } }),
      tx.journalDeletion.aggregate({ _max: { cursor: true } }),
      tx.journalDeletion.findMany({
        where: buildDeletionWhere(uniqueDrafts),
      }),
    ]);

    const entriesWhere = buildEntryWhere(uniqueDrafts);
    if (entriesWhere) {
      await tx.journalEntry.deleteMany({ where: entriesWhere });
    }

    const currentMaxCursor = Math.max(
      entryMax._max.cursor ?? 0,
      deletionMax._max.cursor ?? 0,
    );
    let cursor = currentMaxCursor > 0 ? currentMaxCursor + 1 : 1;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const nowBigInt = BigInt(nowSeconds);

    const existingMap = new Map(
      existingDeletions.map((item) => [entryKey(item), item]),
    );

    const results: ServerJournalDeletion[] = [];

    for (const draft of uniqueDrafts) {
      const key = entryKey(draft);
      const existing = existingMap.get(key);
      if (existing) {
        const mergedDeletedAt =
          existing.deletedAt > nowBigInt ? existing.deletedAt : nowBigInt;
        const persisted =
          mergedDeletedAt === existing.deletedAt
            ? existing
            : await tx.journalDeletion.update({
                where: {
                  prayer_id_timestamp: {
                    prayer_id: draft.prayer_id,
                    timestamp: draft.timestamp,
                  },
                },
                data: { deletedAt: mergedDeletedAt },
              });
        results.push(mapPrismaDeletion(persisted));
        continue;
      }

      const created = await tx.journalDeletion.create({
        data: {
          cursor,
          prayer_id: draft.prayer_id,
          timestamp: draft.timestamp,
          deletedAt: nowBigInt,
        },
      });
      results.push(mapPrismaDeletion(created));
      cursor += 1;
    }

    return results;
  });
}

export async function getSince(
  cursor: number,
): Promise<{
  entries: ServerJournalEntry[];
  deletions: ServerJournalDeletion[];
  syncedUntil: number;
}> {
  const threshold = Number.isFinite(cursor) ? cursor : 0;

  const [entries, deletions] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { cursor: { gt: threshold } },
      orderBy: { cursor: 'asc' },
    }),
    prisma.journalDeletion.findMany({
      where: { cursor: { gt: threshold } },
      orderBy: { cursor: 'asc' },
    }),
  ]);

  const mappedEntries = entries.map(mapPrismaEntry);
  const mappedDeletions = deletions.map(mapPrismaDeletion);

  const maxEntryCursor = mappedEntries.reduce(
    (max, entry) => Math.max(max, entry.cursor),
    threshold,
  );
  const maxDeletionCursor = mappedDeletions.reduce(
    (max, deletion) => Math.max(max, deletion.cursor),
    threshold,
  );

  const syncedUntil = Math.max(threshold, maxEntryCursor, maxDeletionCursor);

  return {
    entries: mappedEntries,
    deletions: mappedDeletions,
    syncedUntil,
  };
}

function entryKey(entry: { prayer_id: string; timestamp: number }): string {
  return `${entry.prayer_id}:${entry.timestamp}`;
}

function isDraftEntry(value: unknown): value is DraftEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<DraftEntry>;
  return (
    typeof candidate.prayer_id === 'string' &&
    typeof candidate.timestamp === 'number'
  );
}

function collectUniqueDrafts(values: DraftEntry[]): DraftEntry[] {
  const seen = new Set<string>();
  const result: DraftEntry[] = [];

  for (const value of values) {
    if (!isDraftEntry(value)) {
      continue;
    }
    const key = entryKey(value);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push({ prayer_id: value.prayer_id, timestamp: value.timestamp });
  }

  return result;
}

function mapPrismaEntry(entry: PrismaJournalEntry): ServerJournalEntry {
  return {
    id: entry.id,
    cursor: entry.cursor,
    prayer_id: entry.prayer_id,
    timestamp: entry.timestamp,
    createdAt: Number(entry.createdAt),
  };
}

function mapPrismaDeletion(
  deletion: PrismaJournalDeletion,
): ServerJournalDeletion {
  return {
    cursor: deletion.cursor,
    prayer_id: deletion.prayer_id,
    timestamp: deletion.timestamp,
    deletedAt: Number(deletion.deletedAt),
  };
}

function buildEntryWhere(
  drafts: DraftEntry[],
): Prisma.JournalEntryWhereInput | undefined {
  const conditions = drafts.map((draft) => ({
    prayer_id: draft.prayer_id,
    timestamp: draft.timestamp,
  }));

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    const [single] = conditions;
    return { prayer_id: single.prayer_id, timestamp: single.timestamp };
  }

  return { OR: conditions };
}

function buildDeletionWhere(
  drafts: DraftEntry[],
): Prisma.JournalDeletionWhereInput | undefined {
  const conditions = drafts.map((draft) => ({
    prayer_id: draft.prayer_id,
    timestamp: draft.timestamp,
  }));

  if (conditions.length === 0) {
    return undefined;
  }

  if (conditions.length === 1) {
    const [single] = conditions;
    return { prayer_id: single.prayer_id, timestamp: single.timestamp };
  }

  return { OR: conditions };
}
