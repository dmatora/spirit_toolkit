import { promises as fs } from 'node:fs';
import { constants as fsConstants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export type ServerJournalEntry = {
  id: number;
  prayer_id: string;
  timestamp: number;
};

type DraftEntry = {
  prayer_id: string;
  timestamp: number;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STORE_PATH = path.resolve(__dirname, '../../../../var/journal-store.json');

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
      await fs.writeFile(STORE_PATH, '[]', { encoding: 'utf8' });
    } catch (err) {
      // ignore initialization failure; read/write callers will surface errors
      console.error('Failed to initialize journal store', err);
    }
  }
}

export async function readAll(): Promise<ServerJournalEntry[]> {
  await ensureStoreReady();
  try {
    const raw = await fs.readFile(STORE_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isServerJournalEntry);
    }
    return [];
  } catch (err) {
    console.error('Failed to read journal store', err);
    return [];
  }
}

export async function writeAll(entries: ServerJournalEntry[]): Promise<void> {
  await ensureStoreReady();
  const tempPath = `${STORE_PATH}.${process.pid}.${Date.now()}.tmp`;

  try {
    const serialized = JSON.stringify(entries, null, 2);
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

export async function appendMany(
  drafts: DraftEntry[],
): Promise<ServerJournalEntry[]> {
  if (!Array.isArray(drafts) || drafts.length === 0) {
    return [];
  }

  const current = await readAll();
  const existingKey = new Set(current.map(entryKey));
  let nextId = current.reduce((max, entry) => Math.max(max, entry.id), 0) + 1;

  const unique: ServerJournalEntry[] = [];
  for (const draft of drafts) {
    if (!isDraftEntry(draft)) {
      continue;
    }
    const key = entryKey(draft);
    if (existingKey.has(key)) {
      continue;
    }
    const entry: ServerJournalEntry = {
      id: nextId++,
      prayer_id: draft.prayer_id,
      timestamp: draft.timestamp,
    };
    unique.push(entry);
    existingKey.add(key);
  }

  if (unique.length === 0) {
    return [];
  }

  const updated = [...current, ...unique];
  await writeAll(updated);
  return unique;
}

export async function getSince(ts: number): Promise<ServerJournalEntry[]> {
  const threshold = Number.isFinite(ts) ? ts : 0;
  const entries = await readAll();
  return entries.filter((entry) => entry.timestamp > threshold);
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
