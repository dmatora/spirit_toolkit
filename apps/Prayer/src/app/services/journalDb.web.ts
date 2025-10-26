type SyncedFlag = 0 | 1;

export type JournalEntry = {
  id: number;
  prayer_id: string;
  timestamp: number;
  synced: SyncedFlag;
};

const DB_NAME = 'prayer-web';
const DB_VERSION = 1;
const STORE_NAME = 'journal_entries';

const hasIndexedDb = typeof indexedDB !== 'undefined';
const memoryStore: JournalEntry[] = [];
let memoryIdCounter = 1;

let db: IDBDatabase | null = null;
let initPromise: Promise<void> | null = null;

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error('[journalDb:web] IndexedDB request failed'));
  });

const openDatabase = async (): Promise<void> => {
  if (!hasIndexedDb || db) {
    return;
  }

  await new Promise<void>((resolve) => {
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = () => {
        const database = request.result;
        if (!database.objectStoreNames.contains(STORE_NAME)) {
          database.createObjectStore(STORE_NAME, {
            keyPath: 'id',
            autoIncrement: true,
          });
        }
      };

      request.onsuccess = () => {
        db = request.result;
        resolve();
      };

      request.onerror = () => {
        console.warn('[journalDb:web] Failed to open IndexedDB', request.error);
        resolve();
      };
    } catch (error) {
      console.warn('[journalDb:web] Error while opening IndexedDB', error);
      resolve();
    }
  });
};

export const ensureInitialized = async (): Promise<void> => {
  if (!hasIndexedDb) {
    if (typeof window === 'undefined') {
      console.warn('[journalDb:web] IndexedDB is unavailable during SSR, using memory store');
    } else {
      console.warn('[journalDb:web] IndexedDB not available, falling back to memory store');
    }
    return;
  }

  if (db || initPromise) {
    await initPromise;
    return;
  }

  initPromise = openDatabase().finally(() => {
    initPromise = null;
  });
  await initPromise;
};

const addToMemoryStore = (prayerId: string, timestampSec: number, synced: SyncedFlag): void => {
  memoryStore.unshift({
    id: memoryIdCounter++,
    prayer_id: prayerId,
    timestamp: timestampSec,
    synced,
  });
};

const getFromMemoryStore = (): JournalEntry[] => [...memoryStore];

export const addJournalEntry = async (
  prayerId: string,
  timestampSec: number = Math.floor(Date.now() / 1000),
  synced: SyncedFlag = 0,
): Promise<void> => {
  if (!hasIndexedDb) {
    addToMemoryStore(prayerId, timestampSec, synced);
    return;
  }

  await ensureInitialized();
  if (!db) {
    console.warn('[journalDb:web] IndexedDB database not initialized, entry stored in memory');
    addToMemoryStore(prayerId, timestampSec, synced);
    return;
  }

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await requestToPromise(
      store.add({
        prayer_id: prayerId,
        timestamp: timestampSec,
        synced,
      }),
    );
  } catch (error) {
    console.warn('[journalDb:web] Failed to add journal entry', error);
  }
};

export const getAllJournalEntries = async (): Promise<JournalEntry[]> => {
  if (!hasIndexedDb) {
    return getFromMemoryStore();
  }

  await ensureInitialized();
  if (!db) {
    console.warn('[journalDb:web] IndexedDB database not initialized, returning memory entries');
    return getFromMemoryStore();
  }

  try {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const entries = await requestToPromise(store.getAll());

    return (entries as JournalEntry[])
      .map((entry) => ({
        id: entry.id,
        prayer_id: entry.prayer_id,
        timestamp: entry.timestamp,
        synced: (entry.synced ?? 0) as SyncedFlag,
      }))
      .sort((a, b) => b.id - a.id);
  } catch (error) {
    console.warn('[journalDb:web] Failed to fetch journal entries', error);
    return [];
  }
};

export const deleteJournalEntry = async (id: number): Promise<void> => {
  if (!hasIndexedDb) {
    const index = memoryStore.findIndex((entry) => entry.id === id);
    if (index !== -1) {
      memoryStore.splice(index, 1);
    }
    return;
  }

  await ensureInitialized();
  if (!db) {
    console.warn('[journalDb:web] IndexedDB database not initialized, cannot delete entry');
    return;
  }

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    await requestToPromise(store.delete(id));
  } catch (error) {
    console.warn('[journalDb:web] Failed to delete journal entry', error);
  }
};
