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

const ensureNativeInitialized = async () => {
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
        initialized = true;
      } catch (error) {
        console.warn('[journalDb] Failed to initialize SQLite database', error);
      }
    })().finally(() => {
      initPromise = null;
    });
  }

  return initPromise;
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
    console.warn('[journalDb] SQLite database connection not available for insert');
    return;
  }

  try {
    await db.executeSql(
      `INSERT INTO ${tableName} (prayer_id, timestamp, synced) VALUES (?, ?, ?);`,
      [prayerId, timestampSec, synced],
    );
  } catch (error) {
    console.warn('[journalDb] Failed to add journal entry', error);
  }
};

export const getAllJournalEntries = async (): Promise<JournalEntry[]> => {
  if (isWeb) {
    return [...webStore];
  }

  await ensureNativeInitialized();

  if (!db) {
    console.warn('[journalDb] SQLite database connection not available for select');
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
    console.warn('[journalDb] Failed to fetch journal entries', error);
    return [];
  }
};

