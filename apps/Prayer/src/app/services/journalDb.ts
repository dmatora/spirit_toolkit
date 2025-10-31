import { Platform } from 'react-native';
import SQLite, { SQLiteDatabase } from 'react-native-sqlite-storage';

type SyncedFlag = 0 | 1;

export type JournalEntry = {
  id: number;
  prayer_id: string;
  timestamp: number;
  synced: SyncedFlag;
};

const isWeb = Platform.OS === 'web';
const tableName = 'journal_entries';

let db: SQLiteDatabase | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

const webStore: JournalEntry[] = [];
let webIdCounter = 1;

const ensureNativeInitialized = async (): Promise<void> => {
  if (initialized || isWeb) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        if (typeof SQLite.enablePromise === 'function') {
          SQLite.enablePromise(true);
        }

        db = await SQLite.openDatabase({ name: 'prayer.db', location: 'default' });
        await db.executeSql(
          `CREATE TABLE IF NOT EXISTS ${tableName} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            prayer_id TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            synced INTEGER NOT NULL DEFAULT 0
          );`,
        );
        console.log('[journalDb] SQLite initialized: database opened and table ensured');
        initialized = true;
      } catch (error) {
        console.error('[journalDb] Failed to initialize SQLite database', error);
      }
    })().finally(() => {
      initPromise = null;
    });
  }

  return initPromise ?? Promise.resolve();
};

export const ensureInitialized = async (): Promise<void> => {
  if (isWeb) {
    return;
  }
  await ensureNativeInitialized();
};

export const addJournalEntry = async (
  prayerId: string,
  timestampSec: number = Math.floor(Date.now() / 1000),
  synced: SyncedFlag = 0,
): Promise<void> => {
  if (isWeb) {
    webStore.unshift({
      id: webIdCounter++,
      prayer_id: prayerId,
      timestamp: timestampSec,
      synced,
    });
    return;
  }

  await ensureNativeInitialized();

  if (!db) {
    console.error('[journalDb] SQLite database connection not available for insert');
    return;
  }

  try {
    await db.executeSql(
      `INSERT INTO ${tableName} (prayer_id, timestamp, synced) VALUES (?, ?, ?);`,
      [prayerId, timestampSec, synced],
    );
  } catch (error) {
    console.error('[journalDb] Failed to add journal entry', error);
  }
};

export const getAllJournalEntries = async (): Promise<JournalEntry[]> => {
  if (isWeb) {
    return [...webStore];
  }

  await ensureNativeInitialized();

  if (!db) {
    console.error('[journalDb] SQLite database connection not available for select');
    return [];
  }

  try {
    const [result] = await db.executeSql(
      `SELECT id, prayer_id, timestamp, synced FROM ${tableName} ORDER BY id DESC;`,
    );

    const entries: JournalEntry[] = [];
    for (let i = 0; i < result.rows.length; i += 1) {
      const row = result.rows.item(i) as JournalEntry;
      entries.push({
        id: row.id,
        prayer_id: row.prayer_id,
        timestamp: row.timestamp,
        synced: (row.synced ?? 0) as SyncedFlag,
      });
    }
    return entries;
  } catch (error) {
    console.error('[journalDb] Failed to fetch journal entries', error);
    return [];
  }
};

export const deleteJournalEntry = async (id: number): Promise<void> => {
  if (isWeb) {
    const index = webStore.findIndex((entry) => entry.id === id);
    if (index !== -1) {
      webStore.splice(index, 1);
    }
    return;
  }

  await ensureNativeInitialized();

  if (!db) {
    console.error('[journalDb] SQLite database connection not available for delete');
    return;
  }

  try {
    await db.executeSql(`DELETE FROM ${tableName} WHERE id = ?;`, [id]);
  } catch (error) {
    console.error('[journalDb] Failed to delete journal entry', error);
  }
};

export const getUnsyncedEntries = async (): Promise<JournalEntry[]> => {
  if (isWeb) {
    return webStore.filter((entry) => entry.synced === 0);
  }

  await ensureNativeInitialized();

  if (!db) {
    console.error('[journalDb] SQLite database connection not available for unsynced select');
    return [];
  }

  try {
    const [result] = await db.executeSql(
      `SELECT id, prayer_id, timestamp, synced FROM ${tableName} WHERE synced = 0 ORDER BY id ASC;`,
    );

    const entries: JournalEntry[] = [];
    for (let i = 0; i < result.rows.length; i += 1) {
      const row = result.rows.item(i) as JournalEntry;
      entries.push({
        id: row.id,
        prayer_id: row.prayer_id,
        timestamp: row.timestamp,
        synced: (row.synced ?? 0) as SyncedFlag,
      });
    }
    return entries;
  } catch (error) {
    console.error('[journalDb] Failed to fetch unsynced journal entries', error);
    return [];
  }
};

export const markEntriesSynced = async (ids: number[]): Promise<void> => {
  if (!ids.length) {
    return;
  }

  if (isWeb) {
    const idSet = new Set(ids);
    webStore.forEach((entry) => {
      if (idSet.has(entry.id)) {
        entry.synced = 1;
      }
    });
    return;
  }

  await ensureNativeInitialized();

  if (!db) {
    console.error('[journalDb] SQLite database connection not available for mark synced');
    return;
  }

  const placeholders = ids.map(() => '?').join(', ');
  try {
    await db.executeSql(
      `UPDATE ${tableName} SET synced = 1 WHERE id IN (${placeholders});`,
      ids,
    );
  } catch (error) {
    console.error('[journalDb] Failed to mark entries as synced', error);
  }
};

type UpsertDraft = {
  prayer_id: string;
  timestamp: number;
};

export const upsertEntries = async (entries: UpsertDraft[]): Promise<number> => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return 0;
  }

  const validEntries = entries.filter(
    (entry) =>
      entry &&
      typeof entry.prayer_id === 'string' &&
      typeof entry.timestamp === 'number',
  );

  if (!validEntries.length) {
    return 0;
  }

  if (isWeb) {
    let inserted = 0;
    const existingKeys = new Set(webStore.map((entry) => key(entry.prayer_id, entry.timestamp)));

    for (const entry of validEntries) {
      const entryKey = key(entry.prayer_id, entry.timestamp);
      if (existingKeys.has(entryKey)) {
        continue;
      }

      webStore.unshift({
        id: webIdCounter++,
        prayer_id: entry.prayer_id,
        timestamp: entry.timestamp,
        synced: 1,
      });
      existingKeys.add(entryKey);
      inserted += 1;
    }
    return inserted;
  }

  await ensureNativeInitialized();

  if (!db) {
    console.error('[journalDb] SQLite database connection not available for upsert');
    return 0;
  }

  let inserted = 0;

  for (const entry of validEntries) {
    try {
      const [selectResult] = await db.executeSql(
        `SELECT id FROM ${tableName} WHERE prayer_id = ? AND timestamp = ? LIMIT 1;`,
        [entry.prayer_id, entry.timestamp],
      );

      if (selectResult.rows.length > 0) {
        continue;
      }

      await db.executeSql(
        `INSERT INTO ${tableName} (prayer_id, timestamp, synced) VALUES (?, ?, 1);`,
        [entry.prayer_id, entry.timestamp],
      );
      inserted += 1;
    } catch (error) {
      console.error('[journalDb] Failed to upsert journal entry', error);
    }
  }

  return inserted;
};

const key = (prayerId: string, timestamp: number) => `${prayerId}:${timestamp}`;
