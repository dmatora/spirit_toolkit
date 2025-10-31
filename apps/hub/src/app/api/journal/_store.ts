import { promises as fs } from 'node:fs';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type ServerJournalEntry = {
  id: number;
  prayer_id: string;
  timestamp: number;
};

export type ServerJournalDeletion = {
  prayer_id: string;
  timestamp: number;
  deletedAt: number;
};

type DraftEntry = {
  prayer_id: string;
  timestamp: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, '../../../../var/journal-store.json');
const LOCK_PATH = `${STORE_PATH}.lock`;
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
      await fs.writeFile(
        STORE_PATH,
        JSON.stringify({ entries: [], deletions: [] }, null, 2),
        { encoding: 'utf8' },
      );
    } catch (err) {
      // ignore initialization failure; read/write callers will surface errors
      console.error('Failed to initialize journal store', err);
    }
  }
}

type StoreFile = {
  entries: ServerJournalEntry[];
  deletions: ServerJournalDeletion[];
};

async function readStore(): Promise<StoreFile> {
  await ensureStoreReady();
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return {
        entries: parsed.filter(isServerJournalEntry),
        deletions: [],
      };
    }

    if (parsed && typeof parsed === 'object') {
      const candidate = parsed as Partial<StoreFile>;
      const entries = Array.isArray(candidate.entries)
        ? candidate.entries.filter(isServerJournalEntry)
        : [];
      const deletions = Array.isArray(candidate.deletions)
        ? candidate.deletions.filter(isServerJournalDeletion)
        : [];
      return { entries, deletions };
    }

    return { entries: [], deletions: [] };
  } catch (err) {
    console.error('Failed to read journal store', err);
    return { entries: [], deletions: [] };
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

export async function writeAll(entries: ServerJournalEntry[]): Promise<void> {
  await mutateStore(async (state) => ({
    state: { entries, deletions: state.deletions },
    changed: true,
    result: undefined,
  }));
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
    let idCursor = current.entries.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;

    for (const draft of drafts) {
      if (!isDraftEntry(draft)) {
        continue;
      }
      const key = entryKey(draft);
      if (currentExisting.has(key)) {
        continue;
      }
      additions.push({
        id: idCursor++,
        prayer_id: draft.prayer_id,
        timestamp: draft.timestamp,
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
      (a, b) => a.deletedAt - b.deletedAt,
    );

    return {
      state: { entries: remainingEntries, deletions },
      changed: true,
      result: recorded,
    };
  });
}

export async function getSince(
  ts: number,
): Promise<{
  entries: ServerJournalEntry[];
  deletions: ServerJournalDeletion[];
  syncedUntil: number;
}> {
  const threshold = Number.isFinite(ts) ? ts : 0;
  const state = await readStore();
  const entries = state.entries.filter((entry) => entry.timestamp > threshold);
  const deletions = state.deletions.filter(
    (deletion) => deletion.deletedAt > threshold,
  );

  const maxEntryTimestamp = entries.reduce(
    (max, entry) => Math.max(max, entry.timestamp),
    threshold,
  );
  const maxDeletionTimestamp = deletions.reduce(
    (max, deletion) => Math.max(max, deletion.deletedAt),
    threshold,
  );

  const syncedUntil = Math.max(threshold, maxEntryTimestamp, maxDeletionTimestamp);

  return { entries, deletions, syncedUntil };
}

function entryKey(entry: { prayer_id: string; timestamp: number }): string {
  return `${entry.prayer_id}:${entry.timestamp}`;
}

function isServerJournalEntry(value: unknown): value is ServerJournalEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ServerJournalEntry>;
  return (
    typeof candidate.id === 'number' &&
    typeof candidate.prayer_id === 'string' &&
    typeof candidate.timestamp === 'number'
  );
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

function isServerJournalDeletion(value: unknown): value is ServerJournalDeletion {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<ServerJournalDeletion>;
  return (
    typeof candidate.prayer_id === 'string' &&
    typeof candidate.timestamp === 'number' &&
    typeof candidate.deletedAt === 'number'
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
