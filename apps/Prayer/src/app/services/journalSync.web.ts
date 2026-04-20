import {
  getUnsyncedEntries,
  markEntriesSynced,
  upsertEntries,
  getPendingDeletions,
  removePendingDeletions,
  applyRemoteDeletions,
} from './journalDb.web';
import {
  getSyncDiagnostics,
  isSyncEnabled,
  resolveUrl,
  withSyncAuthHeaders,
} from './syncConfig';

type Listener = () => void;
type SyncStateListener = (isSyncing: boolean) => void;
type SyncRequestDiagnostics = {
  operation: 'upload' | 'delete' | 'pull';
  url: string;
};

const LAST_SYNC_CURSOR_KEY = 'journal/lastSyncedCursor';
const LEGACY_SYNC_KEY = 'journal/lastSyncedAt';
const UPLOAD_ENDPOINT = '/upload';
const PULL_ENDPOINT = '/pull';
const DELETE_ENDPOINT = '/delete';
const BACKGROUND_INTERVAL_MS = 60_000;

let inFlightSync: Promise<void> | null = null;
let stopBackground: (() => void) | null = null;
let isSyncing = false;
let lastMissingSecretWarning: string | null = null;

const listeners = new Set<Listener>();
const syncStateListeners = new Set<SyncStateListener>();

const hasWindow = typeof window !== 'undefined';

const notifySynced = () => {
  listeners.forEach((listener) => {
    try {
      listener();
    } catch (error) {
      console.warn('[journalSync:web] Listener threw during notify', error);
    }
  });
};

const notifySyncState = () => {
  syncStateListeners.forEach((listener) => {
    try {
      listener(isSyncing);
    } catch (error) {
      console.warn(
        '[journalSync:web] Sync state listener threw during notify',
        error
      );
    }
  });
};

const setSyncing = (nextValue: boolean) => {
  if (isSyncing === nextValue) {
    return;
  }

  isSyncing = nextValue;
  notifySyncState();
};

const readLastSyncedCursor = (): number => {
  if (!hasWindow || !window.localStorage) {
    return 0;
  }

  const raw = window.localStorage.getItem(LAST_SYNC_CURSOR_KEY);
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  const legacy = window.localStorage.getItem(LEGACY_SYNC_KEY);
  if (legacy) {
    window.localStorage.removeItem(LEGACY_SYNC_KEY);
  }
  return 0;
};

const writeLastSyncedCursor = (value: number): void => {
  if (!hasWindow || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(LAST_SYNC_CURSOR_KEY, String(value));
  } catch (error) {
    console.warn('[journalSync:web] Failed to persist lastSyncedCursor', error);
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
}, 750);

const getSyncLogContext = (
  since = 0,
  lastRequest?: SyncRequestDiagnostics
) => ({
  ...getSyncDiagnostics(),
  syncUrls: {
    upload: resolveUrl(UPLOAD_ENDPOINT),
    delete: resolveUrl(DELETE_ENDPOINT),
    pull: resolveUrl(`${PULL_ENDPOINT}?since=${since || 0}`),
  },
  lastRequest,
});

const warnSyncSkippedMissingSecret = (): void => {
  const context = getSyncLogContext();
  const signature = JSON.stringify(context);
  if (signature === lastMissingSecretWarning) {
    return;
  }

  lastMissingSecretWarning = signature;
  console.warn('[journalSync:web] Sync skipped: missing sync secret', context);
};

export const onSynced = {
  subscribe(listener: Listener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const onSyncStateChange = {
  subscribe(listener: SyncStateListener): () => void {
    syncStateListeners.add(listener);
    return () => {
      syncStateListeners.delete(listener);
    };
  },
};

export const getIsSyncing = (): boolean => isSyncing;

export const syncNow = async (): Promise<void> => {
  if (!isSyncEnabled()) {
    warnSyncSkippedMissingSecret();
    return;
  }
  if (inFlightSync) {
    return inFlightSync;
  }

  setSyncing(true);
  inFlightSync = performSync().finally(() => {
    inFlightSync = null;
    setSyncing(false);
  });

  return inFlightSync;
};

const performSync = async (): Promise<void> => {
  if (!isSyncEnabled()) {
    warnSyncSkippedMissingSecret();
    return;
  }

  const since = readLastSyncedCursor();
  let lastRequest: SyncRequestDiagnostics | undefined;

  try {
    const [unsynced, pendingDeletions] = await Promise.all([
      getUnsyncedEntries(),
      getPendingDeletions(),
    ]);

    if (unsynced.length > 0) {
      const uploadUrl = resolveUrl(UPLOAD_ENDPOINT);
      lastRequest = { operation: 'upload', url: uploadUrl };
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: withSyncAuthHeaders({
          'Content-Type': 'application/json',
        }),
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
      const deleteUrl = resolveUrl(DELETE_ENDPOINT);
      lastRequest = { operation: 'delete', url: deleteUrl };
      const response = await fetch(deleteUrl, {
        method: 'POST',
        headers: withSyncAuthHeaders({
          'Content-Type': 'application/json',
        }),
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

      await removePendingDeletions(pendingDeletions.map((item) => item.id));
    }

    const pullUrl = resolveUrl(`${PULL_ENDPOINT}?since=${since || 0}`);
    lastRequest = { operation: 'pull', url: pullUrl };
    const pullResponse = await fetch(pullUrl, {
      method: 'GET',
      headers: withSyncAuthHeaders({
        'Cache-Control': 'no-store',
      }),
    });

    if (!pullResponse.ok) {
      throw new Error(`Pull failed: ${pullResponse.status}`);
    }

    const payload = (await pullResponse.json()) as {
      entries?: Array<{
        prayer_id: string;
        timestamp: number;
        cursor?: number;
      }>;
      deletions?: Array<{
        prayer_id: string;
        timestamp: number;
        deletedAt?: number;
        cursor?: number;
      }>;
      syncedUntil?: number;
    };

    const pulledEntries = Array.isArray(payload.entries)
      ? payload.entries.filter(
          (
            entry
          ): entry is {
            prayer_id: string;
            timestamp: number;
            cursor?: number;
          } =>
            !!entry &&
            typeof entry === 'object' &&
            typeof entry.prayer_id === 'string' &&
            typeof entry.timestamp === 'number'
        )
      : [];

    if (pulledEntries.length > 0) {
      await upsertEntries(
        pulledEntries.map((entry) => ({
          prayer_id: entry.prayer_id,
          timestamp: entry.timestamp,
        }))
      );
    }

    const pulledDeletions = Array.isArray(payload.deletions)
      ? payload.deletions.filter(
          (
            item
          ): item is {
            prayer_id: string;
            timestamp: number;
            deletedAt?: number;
            cursor?: number;
          } =>
            !!item &&
            typeof item === 'object' &&
            typeof item.prayer_id === 'string' &&
            typeof item.timestamp === 'number'
        )
      : [];

    if (pulledDeletions.length > 0) {
      await applyRemoteDeletions(
        pulledDeletions.map((item) => ({
          prayer_id: item.prayer_id,
          timestamp: item.timestamp,
        }))
      );
    }

    const maxPulledCursor = pulledEntries.reduce(
      (max, entry) =>
        Math.max(max, typeof entry.cursor === 'number' ? entry.cursor : since),
      since
    );
    const maxDeletionCursor = pulledDeletions.reduce(
      (max, item) =>
        Math.max(max, typeof item.cursor === 'number' ? item.cursor : since),
      since
    );
    const serverSyncedUntil =
      typeof payload.syncedUntil === 'number' &&
      Number.isFinite(payload.syncedUntil)
        ? payload.syncedUntil
        : Math.max(maxPulledCursor, maxDeletionCursor, since);

    writeLastSyncedCursor(serverSyncedUntil);
    notifySynced();
  } catch (error) {
    console.warn(
      '[journalSync:web] Sync failed',
      getSyncLogContext(since, lastRequest),
      error
    );
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
