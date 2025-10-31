type SyncedFlag = 0 | 1;

type PendingDeletionId = IDBValidKey | number;

type PendingDeletion = {
  id: PendingDeletionId;
  prayer_id: string;
  timestamp: number;
};

export type JournalEntry = {
  id: number;
  prayer_id: string;
  timestamp: number;
  synced: SyncedFlag;
};

const DB_NAME = 'prayer-web';
const DB_VERSION = 1;
const STORE_NAME = 'journal_entries';
const DELETION_STORE_NAME = 'journal_entry_deletions';

const hasIndexedDb = typeof indexedDB !== 'undefined';
const memoryStore: JournalEntry[] = [];
let memoryIdCounter = 1;
const memoryDeletionQueue: PendingDeletion[] = [];
let memoryDeletionIdCounter = 1;

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
        if (!database.objectStoreNames.contains(DELETION_STORE_NAME)) {
          database.createObjectStore(DELETION_STORE_NAME, {
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
      const entry = memoryStore[index];
      if (entry.synced === 1) {
        queueDeletionInMemory(entry.prayer_id, entry.timestamp);
      }
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
    const tx = db.transaction([STORE_NAME, DELETION_STORE_NAME], 'readwrite');
    const entryStore = tx.objectStore(STORE_NAME);
    const deletionStore = tx.objectStore(DELETION_STORE_NAME);

    const record = (await requestToPromise(entryStore.get(id))) as
      | JournalEntry
      | undefined;

    if (!record) {
      await transactionDone(tx);
      return;
    }

    if ((record.synced ?? 0) === 1) {
      try {
        const key = await requestToPromise(
          deletionStore.add({
            prayer_id: record.prayer_id,
            timestamp: record.timestamp,
          }),
        );
        queueDeletionInMemory(record.prayer_id, record.timestamp, key as PendingDeletionId);
      } catch (error) {
        console.warn('[journalDb:web] Failed to queue deletion before removing entry', error);
        tx.abort();
        throw error;
      }
    }

    await requestToPromise(entryStore.delete(id));
    await transactionDone(tx);
  } catch (error) {
    console.warn('[journalDb:web] Failed to delete journal entry', error);
  }
};

export const getUnsyncedEntries = async (): Promise<JournalEntry[]> => {
  if (!hasIndexedDb) {
    return memoryStore.filter((entry) => entry.synced === 0);
  }

  await ensureInitialized();
  if (!db) {
    console.warn('[journalDb:web] IndexedDB database not initialized, returning memory entries');
    return memoryStore.filter((entry) => entry.synced === 0);
  }

  try {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const entries = (await requestToPromise(store.getAll())) as JournalEntry[];
    return entries
      .filter((entry) => (entry.synced ?? 0) === 0)
      .map((entry) => ({
        id: entry.id,
        prayer_id: entry.prayer_id,
        timestamp: entry.timestamp,
        synced: 0,
      }));
  } catch (error) {
    console.warn('[journalDb:web] Failed to fetch unsynced journal entries', error);
    return [];
  }
};

export const markEntriesSynced = async (ids: number[]): Promise<void> => {
  if (!ids.length) {
    return;
  }

  if (!hasIndexedDb) {
    const idSet = new Set(ids);
    memoryStore.forEach((entry) => {
      if (idSet.has(entry.id)) {
        entry.synced = 1;
      }
    });
    return;
  }

  await ensureInitialized();
  if (!db) {
    console.warn('[journalDb:web] IndexedDB database not initialized, cannot mark synced');
    return;
  }

  try {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    for (const id of ids) {
      try {
        const record = (await requestToPromise(store.get(id))) as JournalEntry | undefined;
        if (!record) {
          continue;
        }
        record.synced = 1;
        await requestToPromise(store.put(record));
      } catch (error) {
        console.warn('[journalDb:web] Failed to mark entry as synced', error);
      }
    }
  } catch (error) {
    console.warn('[journalDb:web] Failed to open transaction for markEntriesSynced', error);
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

  if (!hasIndexedDb) {
    let inserted = 0;
    const existingKeys = new Set(memoryStore.map((entry) => key(entry.prayer_id, entry.timestamp)));

    for (const entry of validEntries) {
      const entryKey = key(entry.prayer_id, entry.timestamp);
      if (existingKeys.has(entryKey)) {
        continue;
      }
      memoryStore.unshift({
        id: memoryIdCounter++,
        prayer_id: entry.prayer_id,
        timestamp: entry.timestamp,
        synced: 1,
      });
      existingKeys.add(entryKey);
      inserted += 1;
    }
    return inserted;
  }

  await ensureInitialized();
  if (!db) {
    console.warn('[journalDb:web] IndexedDB database not initialized, storing in memory');
    return upsertEntriesInMemory(validEntries);
  }

  try {
    const existing = await getAllJournalEntries();
    const existingKeys = new Set(existing.map((entry) => key(entry.prayer_id, entry.timestamp)));

    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let inserted = 0;

    for (const entry of validEntries) {
      const entryKey = key(entry.prayer_id, entry.timestamp);
      if (existingKeys.has(entryKey)) {
        continue;
      }
      await requestToPromise(
        store.add({
          prayer_id: entry.prayer_id,
          timestamp: entry.timestamp,
          synced: 1,
        }),
      );
      existingKeys.add(entryKey);
      inserted += 1;
    }

    return inserted;
  } catch (error) {
    console.warn('[journalDb:web] Failed to upsert journal entries', error);
    return 0;
  }
};

const upsertEntriesInMemory = (entries: UpsertDraft[]): number => {
  let inserted = 0;
  const existingKeys = new Set(memoryStore.map((entry) => key(entry.prayer_id, entry.timestamp)));

  for (const entry of entries) {
    const entryKey = key(entry.prayer_id, entry.timestamp);
    if (existingKeys.has(entryKey)) {
      continue;
    }
    memoryStore.unshift({
      id: memoryIdCounter++,
      prayer_id: entry.prayer_id,
      timestamp: entry.timestamp,
      synced: 1,
    });
    existingKeys.add(entryKey);
    inserted += 1;
  }

  return inserted;
};

const key = (prayerId: string, timestamp: number) => `${prayerId}:${timestamp}`;

const normalizeDeletionKey = (value: PendingDeletionId): string => {
  if (typeof value === 'string') {
    return `str:${value}`;
  }
  if (typeof value === 'number') {
    return `num:${value}`;
  }
  if (value instanceof Date) {
    return `date:${value.toISOString()}`;
  }
  if (Array.isArray(value)) {
    return `arr:${JSON.stringify(value)}`;
  }
  return `other:${String(value)}`;
};

const transactionDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error ?? new Error('[journalDb:web] Transaction aborted'));
    tx.onerror = () => reject(tx.error ?? new Error('[journalDb:web] Transaction failed'));
  });

const queueDeletionInMemory = (
  prayerId: string,
  timestamp: number,
  id?: PendingDeletionId,
): void => {
  const exists = memoryDeletionQueue.some(
    (item) => item.prayer_id === prayerId && item.timestamp === timestamp,
  );
  if (exists) {
    return;
  }
  const resolvedId = id ?? memoryDeletionIdCounter++;
  if (typeof resolvedId === 'number' && Number.isFinite(resolvedId)) {
    memoryDeletionIdCounter = Math.max(memoryDeletionIdCounter, resolvedId + 1);
  }
  memoryDeletionQueue.push({
    id: resolvedId,
    prayer_id: prayerId,
    timestamp,
  });
};

export const queueDeletion = async (
  prayerId: string,
  timestamp: number,
): Promise<void> => {
  const exists = memoryDeletionQueue.some(
    (item) => item.prayer_id === prayerId && item.timestamp === timestamp,
  );
  if (exists) {
    return;
  }

  if (!hasIndexedDb) {
    queueDeletionInMemory(prayerId, timestamp);
    return;
  }

  await ensureInitialized();
  if (!db) {
    console.warn('[journalDb:web] IndexedDB database not initialized, cannot queue deletion');
    queueDeletionInMemory(prayerId, timestamp);
    return;
  }

  try {
    const tx = db.transaction(DELETION_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DELETION_STORE_NAME);
    const key = await requestToPromise(
      store.add({
        prayer_id: prayerId,
        timestamp,
      }),
    );
    queueDeletionInMemory(prayerId, timestamp, key as PendingDeletionId);
  } catch (error) {
    console.warn('[journalDb:web] Failed to queue deletion', error);
  }
};

export const getPendingDeletions = async (): Promise<PendingDeletion[]> => {
  if (!hasIndexedDb) {
    return [...memoryDeletionQueue];
  }

  await ensureInitialized();
  if (!db) {
    console.warn('[journalDb:web] IndexedDB database not initialized, returning memory deletions');
    return [...memoryDeletionQueue];
  }

  try {
    const tx = db.transaction(DELETION_STORE_NAME, 'readonly');
    const store = tx.objectStore(DELETION_STORE_NAME);
    const entries = (await requestToPromise(store.getAll())) as PendingDeletion[];

    memoryDeletionQueue.length = 0;
    let maxNumericId = memoryDeletionIdCounter;
    for (const entry of entries) {
      const id = (entry as PendingDeletion).id as PendingDeletionId;
      memoryDeletionQueue.push({
        id,
        prayer_id: entry.prayer_id,
        timestamp: entry.timestamp,
      });
      if (typeof id === 'number' && Number.isFinite(id)) {
        maxNumericId = Math.max(maxNumericId, id + 1);
      }
    }
    memoryDeletionIdCounter = Math.max(memoryDeletionIdCounter, maxNumericId);

    return [...memoryDeletionQueue];
  } catch (error) {
    console.warn('[journalDb:web] Failed to fetch pending deletions', error);
    return [...memoryDeletionQueue];
  }
};

export const removePendingDeletions = async (ids: PendingDeletionId[]): Promise<void> => {
  if (!ids.length) {
    return;
  }

  const idSet = new Set(ids.map(normalizeDeletionKey));
  for (let i = memoryDeletionQueue.length - 1; i >= 0; i -= 1) {
    if (idSet.has(normalizeDeletionKey(memoryDeletionQueue[i].id))) {
      memoryDeletionQueue.splice(i, 1);
    }
  }

  if (!hasIndexedDb) {
    return;
  }

  await ensureInitialized();
  if (!db) {
    console.warn('[journalDb:web] IndexedDB database not initialized, cannot remove deletions');
    return;
  }

  try {
    const tx = db.transaction(DELETION_STORE_NAME, 'readwrite');
    const store = tx.objectStore(DELETION_STORE_NAME);
    for (const id of ids) {
      await requestToPromise(store.delete(id));
    }
  } catch (error) {
    console.warn('[journalDb:web] Failed to remove pending deletions', error);
  }
};

export const applyRemoteDeletions = async (
  deletions: Array<{ prayer_id: string; timestamp: number }>,
): Promise<void> => {
  if (!Array.isArray(deletions) || deletions.length === 0) {
    return;
  }

  const keys = new Set(deletions.map((item) => key(item.prayer_id, item.timestamp)));

  if (!hasIndexedDb) {
    for (let i = memoryStore.length - 1; i >= 0; i -= 1) {
      if (keys.has(key(memoryStore[i].prayer_id, memoryStore[i].timestamp))) {
        memoryStore.splice(i, 1);
      }
    }
    for (let i = memoryDeletionQueue.length - 1; i >= 0; i -= 1) {
      if (
        keys.has(key(memoryDeletionQueue[i].prayer_id, memoryDeletionQueue[i].timestamp))
      ) {
        memoryDeletionQueue.splice(i, 1);
      }
    }
    return;
  }

  await ensureInitialized();
  if (!db) {
    console.warn('[journalDb:web] IndexedDB database not initialized, cannot apply deletions');
    return;
  }

  try {
    const tx = db.transaction([STORE_NAME, DELETION_STORE_NAME], 'readwrite');
    const entryStore = tx.objectStore(STORE_NAME);
    const deletionStore = tx.objectStore(DELETION_STORE_NAME);

    for (const deletion of deletions) {
      const cursorRequest = entryStore.openCursor();
      await new Promise<void>((resolveCursor) => {
        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (!cursor) {
            resolveCursor();
            return;
          }
          const value = cursor.value as JournalEntry;
          if (
            value.prayer_id === deletion.prayer_id &&
            value.timestamp === deletion.timestamp
          ) {
            cursor.delete();
          }
          cursor.continue();
        };
        cursorRequest.onerror = () => resolveCursor();
      });

      const deletionCursorRequest = deletionStore.openCursor();
      await new Promise<void>((resolveCursor) => {
        deletionCursorRequest.onsuccess = () => {
          const cursor = deletionCursorRequest.result;
          if (!cursor) {
            resolveCursor();
            return;
          }
          const value = cursor.value as PendingDeletion;
          if (
            value.prayer_id === deletion.prayer_id &&
            value.timestamp === deletion.timestamp
          ) {
            cursor.delete();
          }
          cursor.continue();
        };
        deletionCursorRequest.onerror = () => resolveCursor();
      });
    }
  } catch (error) {
    console.warn('[journalDb:web] Failed to apply remote deletions', error);
  }
};
