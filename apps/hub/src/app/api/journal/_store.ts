import { promises as fs } from 'node:fs';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';

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

type StoreMeta = {
  nextCursor: number;
};

type StoreFile = {
  entries: ServerJournalEntry[];
  deletions: ServerJournalDeletion[];
  meta: StoreMeta;
};

const resolveStorePath = (): { storePath: string; lockPath: string } => {
  const rawFile = process.env.SPIRIT_SYNC_STORE_PATH;
  if (rawFile) {
    const storePath = path.isAbsolute(rawFile)
      ? rawFile
      : path.resolve(process.cwd(), rawFile);
    return { storePath, lockPath: `${storePath}.lock` };
  }

  const rawDir = process.env.SPIRIT_SYNC_STORE_DIR;
  const baseDir = rawDir
    ? path.isAbsolute(rawDir)
      ? rawDir
      : path.resolve(process.cwd(), rawDir)
    : path.resolve(process.cwd(), 'var');

  const storePath = path.join(baseDir, 'journal-store.json');
  return { storePath, lockPath: `${storePath}.lock` };
};

const { storePath: STORE_PATH, lockPath: LOCK_PATH } = resolveStorePath();
const LOCK_TIMEOUT_MS = 2_000;
const LOCK_RETRY_DELAY_MS = 25;

async function ensureStoreReady(): Promise<void> {
  const dir = path.dirname(STORE_PATH);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // ignore mkdir errors; will surface on file ops if critical
  }

  try {
    await fs.access(STORE_PATH, fsConstants.F_OK);
  } catch {
    try {
      const initial: StoreFile = {
        entries: [],
        deletions: [],
        meta: { nextCursor: 1 },
      };
      await fs.writeFile(STORE_PATH, JSON.stringify(initial, null, 2), {
        encoding: 'utf8',
      });
    } catch (err) {
      console.error('Failed to initialize journal store', err);
    }
  }
}

async function readStore(): Promise<StoreFile> {
  await ensureStoreReady();
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return normalizeStore(parsed);
  } catch (err) {
    console.error('Failed to read journal store', err);
    return { entries: [], deletions: [], meta: { nextCursor: 1 } };
  }
}

async function writeStore(state: StoreFile): Promise<void> {
  await ensureStoreReady();
  const tempPath = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;

  try {
    const serialized = JSON.stringify(state, null, 2);
    await fs.writeFile(tempPath, serialized, { encoding: 'utf8' });
    await fs.rename(tempPath, STORE_PATH);
  } catch (err) {
    console.error('Failed to write journal store', err);
    try {
      await fs.unlink(tempPath);
    } catch {
      // swallow cleanup errors
    }
    throw err;
  }
}

export async function readAll(): Promise<ServerJournalEntry[]> {
  const { entries } = await readStore();
  return entries;
}

export async function appendMany(
  drafts: DraftEntry[],
): Promise<ServerJournalEntry[]> {
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return [];
  }

  return mutateStore(async (current) => {
    const currentExisting = new Set(current.entries.map(entryKey));
    const additions: ServerJournalEntry[] = [];
    let nextId = current.entries.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;
    let cursor = current.meta.nextCursor;
    const now = Date.now();

    for (const draft of drafts) {
      if (!isDraftEntry(draft)) {
        continue;
      }
      const key = entryKey(draft);
      if (currentExisting.has(key)) {
        continue;
      }
      additions.push({
        id: nextId++,
        cursor: cursor++,
        prayer_id: draft.prayer_id,
        timestamp: draft.timestamp,
        createdAt: now,
      });
      currentExisting.add(key);
    }

    if (additions.length === 0) {
      return { state: current, changed: false, result: [] };
    }

    const addedKeys = new Set(additions.map(entryKey));
    const filteredDeletions = current.deletions.filter(
      (deletion) => !addedKeys.has(entryKey(deletion)),
    );

    return {
      state: {
        entries: [...current.entries, ...additions],
        deletions: filteredDeletions,
        meta: { nextCursor: cursor },
      },
      changed: true,
      result: additions,
    };
  });
}

export async function registerDeletions(
  drafts: DraftEntry[],
): Promise<ServerJournalDeletion[]> {
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return [];
  }

  return mutateStore(async (state) => {
    const deletionsMap = new Map(
      state.deletions.map((item) => [entryKey(item), item]),
    );

    let changed = false;
    const recorded: ServerJournalDeletion[] = [];
    const now = Math.floor(Date.now() / 1000);
    let cursor = state.meta.nextCursor;

    const remainingEntries = state.entries.filter((entry) => {
      const key = entryKey(entry);
      const shouldDelete = drafts.some(
        (draft) => entryKey(draft) === key && isDraftEntry(draft),
      );
      if (!shouldDelete) {
        return true;
      }

      const existing = deletionsMap.get(key);
      const deletion: ServerJournalDeletion = existing
        ? { ...existing, deletedAt: Math.max(existing.deletedAt, now) }
        : {
            cursor: cursor++,
            prayer_id: entry.prayer_id,
            timestamp: entry.timestamp,
            deletedAt: now,
          };

      deletionsMap.set(key, deletion);
      recorded.push(deletion);
      changed = true;
      return false;
    });

    for (const draft of drafts) {
      if (!isDraftEntry(draft)) {
        continue;
      }
      const key = entryKey(draft);
      if (deletionsMap.has(key)) {
        continue;
      }
      const deletion: ServerJournalDeletion = {
        cursor: cursor++,
        prayer_id: draft.prayer_id,
        timestamp: draft.timestamp,
        deletedAt: now,
      };
      deletionsMap.set(key, deletion);
      recorded.push(deletion);
      changed = true;
    }

    if (!changed) {
      return { state, changed: false, result: recorded };
    }

    const deletions = Array.from(deletionsMap.values()).sort(
      (a, b) => a.cursor - b.cursor,
    );

    return {
      state: {
        entries: remainingEntries,
        deletions,
        meta: { nextCursor: cursor },
      },
      changed: true,
      result: recorded,
    };
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
  const state = await readStore();
  const entries = state.entries.filter((entry) => entry.cursor > threshold);
  const deletions = state.deletions.filter(
    (deletion) => deletion.cursor > threshold,
  );

  const maxEntryCursor = entries.reduce(
    (max, entry) => Math.max(max, entry.cursor),
    threshold,
  );
  const maxDeletionCursor = deletions.reduce(
    (max, deletion) => Math.max(max, deletion.cursor),
    threshold,
  );

  const syncedUntil = Math.max(threshold, maxEntryCursor, maxDeletionCursor);

  return { entries, deletions, syncedUntil };
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

async function mutateStore<T>(
  mutator: (
    current: StoreFile,
  ) => Promise<{ state: StoreFile; changed: boolean; result: T }> | {
    state: StoreFile;
    changed: boolean;
    result: T;
  },
): Promise<T> {
  const handle = await acquireLock();
  try {
    const current = await readStore();
    const { state, changed, result } = await mutator(current);
    if (changed) {
      await writeStore(state);
    }
    return result;
  } finally {
    await releaseLock(handle);
  }
}

async function acquireLock(): Promise<fs.FileHandle> {
  const start = Date.now();

  while (true) {
    try {
      return await fs.open(LOCK_PATH, 'wx');
    } catch (error) {
      const err = error as NodeJS.ErrnoException;
      if (err.code !== 'EEXIST') {
        throw err;
      }
      const ageOk = await ensureLockFreshness();
      if (ageOk) {
        continue;
      }
      if (Date.now() - start > LOCK_TIMEOUT_MS) {
        throw new Error('Timed out acquiring journal store lock');
      }
      await delay(LOCK_RETRY_DELAY_MS);
    }
  }
}

async function releaseLock(handle: fs.FileHandle): Promise<void> {
  try {
    await handle.close();
  } catch {
    // ignore
  }
  try {
    await fs.unlink(LOCK_PATH);
  } catch {
    // ignore
  }
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureLockFreshness(): Promise<boolean> {
  try {
    const stats = await fs.stat(LOCK_PATH);
    const age = Date.now() - stats.mtimeMs;
    if (age > LOCK_TIMEOUT_MS * 5) {
      await fs.unlink(LOCK_PATH);
      return false;
    }
    await delay(LOCK_RETRY_DELAY_MS);
    return true;
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return true;
    }
    throw error;
  }
}

function normalizeStore(raw: unknown): StoreFile {
  if (Array.isArray(raw)) {
    const entries = raw
      .map((value, index) => ensureEntry(value, index + 1))
      .filter((value): value is ServerJournalEntry => value !== null);
    let nextCursor = entries.reduce(
      (max, entry) => Math.max(max, entry.cursor + 1),
      1,
    );
    return {
      entries,
      deletions: [],
      meta: { nextCursor },
    };
  }

  if (!raw || typeof raw !== 'object') {
    return { entries: [], deletions: [], meta: { nextCursor: 1 } };
  }

  const parsed = raw as Record<string, unknown>;
  const entries = Array.isArray(parsed.entries)
    ? parsed.entries
        .map((value, index) => ensureEntry(value, index + 1))
        .filter((value): value is ServerJournalEntry => value !== null)
    : [];
  const deletions = Array.isArray(parsed.deletions)
    ? parsed.deletions
        .map((value) => ensureDeletion(value))
        .filter((value): value is ServerJournalDeletion => value !== null)
    : [];

  let nextCursor = 1;
  for (const entry of entries) {
    nextCursor = Math.max(nextCursor, entry.cursor + 1);
  }
  for (const deletion of deletions) {
    nextCursor = Math.max(nextCursor, deletion.cursor + 1);
  }

  const metaCandidate = parsed.meta;
  if (metaCandidate && typeof metaCandidate === 'object') {
    const candidateCursor = (metaCandidate as Record<string, unknown>).nextCursor;
    if (typeof candidateCursor === 'number' && Number.isFinite(candidateCursor)) {
      nextCursor = Math.max(nextCursor, candidateCursor);
    }
  }

  return { entries, deletions, meta: { nextCursor } };
}

function ensureEntry(value: unknown, fallbackId: number): ServerJournalEntry | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.prayer_id !== 'string' || typeof candidate.timestamp !== 'number') {
    return null;
  }
  const idRaw = candidate.id;
  const id = typeof idRaw === 'number' && Number.isFinite(idRaw) ? idRaw : fallbackId;
  const cursorRaw = candidate.cursor;
  const cursor = typeof cursorRaw === 'number' && Number.isFinite(cursorRaw)
    ? cursorRaw
    : id;
  const createdRaw = candidate.createdAt;
  const createdAt =
    typeof createdRaw === 'number' && Number.isFinite(createdRaw)
      ? createdRaw
      : Date.now();
  return {
    id,
    cursor,
    prayer_id: candidate.prayer_id,
    timestamp: candidate.timestamp,
    createdAt,
  };
}

function ensureDeletion(value: unknown): ServerJournalDeletion | null {
  if (!value || typeof value !== 'object') {
    return null;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.prayer_id !== 'string' || typeof candidate.timestamp !== 'number') {
    return null;
  }
  const cursorRaw = candidate.cursor;
  const deletedAtRaw = candidate.deletedAt;
  const deletedAt =
    typeof deletedAtRaw === 'number' && Number.isFinite(deletedAtRaw)
      ? deletedAtRaw
      : Math.floor(Date.now() / 1000);
  const cursor =
    typeof cursorRaw === 'number' && Number.isFinite(cursorRaw)
      ? cursorRaw
      : deletedAt;
  return {
    cursor,
    prayer_id: candidate.prayer_id,
    timestamp: candidate.timestamp,
    deletedAt,
  };
}
