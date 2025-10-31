import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  getUnsyncedEntries,
  markEntriesSynced,
  upsertEntries,
  getPendingDeletions,
  removePendingDeletions,
  applyRemoteDeletions,
} from './journalDb';
import { resolveUrl } from './syncConfig';

type Listener = () => void;

const LAST_SYNC_KEY = 'journal/lastSyncedAt';
const UPLOAD_ENDPOINT = '/upload';
const PULL_ENDPOINT = '/pull';
const DELETE_ENDPOINT = '/delete';
const BACKGROUND_INTERVAL_MS = 120_000;

let inFlightSync: Promise<void> | null = null;
let stopBackground: (() => void) | null = null;

const listeners = new Set<Listener>();

const notifySynced = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn('[journalSync] Listener threw during notify', error);
    }
  });
};

const readLastSyncedAt = async (): Promise<number> => {
  try {
    const raw = await AsyncStorage.getItem(LAST_SYNC_KEY);
    if (!raw) {
      return 0;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch (error) {
    console.warn('[journalSync] Failed to read lastSyncedAt', error);
    return 0;
  }
};

const writeLastSyncedAt = async (value: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(value));
  } catch (error) {
    console.warn('[journalSync] Failed to persist lastSyncedAt', error);
  }
};

const debounce = (fn: () => void, delay: number) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      timeout = null;
      fn();
    }, delay);
  };
};

const debouncedTrigger = debounce(() => {
  void syncNow();
}, 1_000);

export const onSynced = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const syncNow = async (): Promise<void> => {
  if (inFlightSync) {
    return inFlightSync;
  }

  inFlightSync = performSync().finally(() => {
    inFlightSync = null;
  });

  return inFlightSync;
};

const performSync = async (): Promise<void> => {
  const since = await readLastSyncedAt();

  try {
    const [unsynced, pendingDeletions] = await Promise.all([
      getUnsyncedEntries(),
      getPendingDeletions(),
    ]);

    if (unsynced.length > 0) {
      const response = await fetch(resolveUrl(UPLOAD_ENDPOINT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: unsynced.map((entry) => ({
            prayer_id: entry.prayer_id,
            timestamp: entry.timestamp,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      await markEntriesSynced(unsynced.map((entry) => entry.id));
    }

    if (pendingDeletions.length > 0) {
      const response = await fetch(resolveUrl(DELETE_ENDPOINT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entries: pendingDeletions.map((item) => ({
            prayer_id: item.prayer_id,
            timestamp: item.timestamp,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Delete sync failed: ${response.status}`);
      }

      const deletionIds = pendingDeletions
        .map((item) => item.id)
        .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
      await removePendingDeletions(deletionIds);
    }

    const pullResponse = await fetch(
      resolveUrl(`${PULL_ENDPOINT}?since=${since || 0}`),
      {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );

    if (!pullResponse.ok) {
      throw new Error(`Pull failed: ${pullResponse.status}`);
    }

    const payload = (await pullResponse.json()) as {
      entries?: Array<{ prayer_id: string; timestamp: number }>;
      deletions?: Array<{ prayer_id: string; timestamp: number; deletedAt?: number }>;
      syncedUntil?: number;
    };

    const pulledEntries = Array.isArray(payload.entries)
      ? payload.entries.filter(
          (entry): entry is { prayer_id: string; timestamp: number } =>
            !!entry &&
            typeof entry === 'object' &&
            typeof entry.prayer_id === 'string' &&
            typeof entry.timestamp === 'number',
        )
      : [];

    if (pulledEntries.length > 0) {
      await upsertEntries(
        pulledEntries.map((entry) => ({
          prayer_id: entry.prayer_id,
          timestamp: entry.timestamp,
        })),
      );
    }

    const pulledDeletions = Array.isArray(payload.deletions)
      ? payload.deletions.filter(
          (item): item is { prayer_id: string; timestamp: number; deletedAt?: number } =>
            !!item &&
            typeof item === 'object' &&
            typeof item.prayer_id === 'string' &&
            typeof item.timestamp === 'number',
        )
      : [];

    if (pulledDeletions.length > 0) {
      await applyRemoteDeletions(
        pulledDeletions.map((item) => ({
          prayer_id: item.prayer_id,
          timestamp: item.timestamp,
        })),
      );
    }

    const maxPulledTimestamp = pulledEntries.reduce(
      (max, entry) => Math.max(max, entry.timestamp),
      since,
    );
    const maxDeletionTimestamp = pulledDeletions.reduce(
      (max, item) =>
        Math.max(max, typeof item.deletedAt === 'number' ? item.deletedAt : since),
      since,
    );
    const serverSyncedUntil =
      typeof payload.syncedUntil === 'number' && Number.isFinite(payload.syncedUntil)
        ? Math.max(since, payload.syncedUntil)
        : Math.max(maxPulledTimestamp, maxDeletionTimestamp);

    await writeLastSyncedAt(serverSyncedUntil);
    notifySynced();
  } catch (error) {
    console.warn('[journalSync] Sync failed', error);
  }
};

export const triggerSync = (): void => {
  debouncedTrigger();
};

export const startBackgroundSync = (): (() => void) => {
  if (stopBackground) {
    return stopBackground;
  }

  const interval = setInterval(() => {
    void syncNow();
  }, BACKGROUND_INTERVAL_MS);

  stopBackground = () => {
    clearInterval(interval);
    stopBackground = null;
  };

  return stopBackground;
};
