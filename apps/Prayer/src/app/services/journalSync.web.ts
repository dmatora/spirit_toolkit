import {
  getUnsyncedEntries,
  markEntriesSynced,
  upsertEntries,
} from './journalDb.web';
import { resolveUrl } from './syncConfig';

type Listener = () => void;

const LAST_SYNC_KEY = 'journal/lastSyncedAt';
const UPLOAD_ENDPOINT = '/upload';
const PULL_ENDPOINT = '/pull';
const BACKGROUND_INTERVAL_MS = 60_000;

let inFlightSync: Promise<void> | null = null;
let stopBackground: (() => void) | null = null;

const listeners = new Set<Listener>();

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

const readLastSyncedAt = (): number => {
  if (!hasWindow || !window.localStorage) {
    return 0;
  }

  const raw = window.localStorage.getItem(LAST_SYNC_KEY);
  if (!raw) {
    return 0;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : 0;
};

const writeLastSyncedAt = (value: number): void => {
  if (!hasWindow || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(LAST_SYNC_KEY, String(value));
  } catch (error) {
    console.warn('[journalSync:web] Failed to persist lastSyncedAt', error);
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
  const since = readLastSyncedAt();

  try {
    const unsynced = await getUnsyncedEntries();

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
    };

    if (Array.isArray(payload.entries) && payload.entries.length > 0) {
      await upsertEntries(
        payload.entries.map((entry) => ({
          prayer_id: entry.prayer_id,
          timestamp: entry.timestamp,
        })),
      );
    }

    writeLastSyncedAt(Math.floor(Date.now() / 1000));
    notifySynced();
  } catch (error) {
    console.warn('[journalSync:web] Sync failed', error);
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
