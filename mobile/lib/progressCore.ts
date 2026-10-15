/**
 * Journey progress, per account — pure logic with an injectable storage, so it
 * runs under node in lib/session.check.ts. lib/progressStore.ts binds it to
 * AsyncStorage for the app.
 *
 * Isolation design: progress is stored under `journey_completed_ids:<userId>`
 * and the store only ever reads/writes the key of the user it is bound to.
 * The root layout re-binds it whenever the signed-in user id changes — which
 * covers EVERY sign-out path (button, expired session, revoked refresh,
 * account deletion), not just the ones that remember to clear it.
 * While no user is bound, progress is empty and nothing is persisted.
 *
 * Sync (offline-first): every tick is applied locally first and queued as a
 * pending change under `journey_pending:<userId>`. `flush()` sends the queue to
 * the server (POST /progress) whenever it can; failures keep the queue for the
 * next attempt (next tick, app foreground, next launch). `pull` merges the
 * server's set with any still-pending local changes, so an offline edit is
 * never overwritten by older server state. The first sync for an account on a
 * device uploads that device's existing ticks (marker `journey_synced:<userId>`).
 */
import { createStore } from 'zustand/vanilla';

export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** The pre-Oct-2026 key shared by every account on the device. Never read. */
export const LEGACY_PROGRESS_KEY = 'journey_completed_ids';

export function progressStorageKey(userId: string): string {
  return `${LEGACY_PROGRESS_KEY}:${userId}`;
}

export function pendingStorageKey(userId: string): string {
  return `journey_pending:${userId}`;
}

export function syncedMarkerKey(userId: string): string {
  return `journey_synced:${userId}`;
}

export interface ProgressRemote {
  /** Server's completed step ids for the signed-in user. Throws when offline. */
  fetch(): Promise<string[]>;
  /** Apply changes; returns the server's full completed set. Throws when offline. */
  push(changes: { step_id: string; completed: boolean }[]): Promise<string[]>;
}

function parsePending(raw: string | null): Record<string, boolean> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed)) if (typeof v === 'boolean') out[k] = v;
    return out;
  } catch {
    return {};
  }
}

function applyPending(base: string[], pending: Record<string, boolean>): Record<string, true> {
  const out: Record<string, true> = {};
  for (const id of base) out[id] = true;
  for (const [id, done] of Object.entries(pending)) {
    if (done) out[id] = true;
    else delete out[id];
  }
  return out;
}

export function parseProgress(raw: string | null): Record<string, true> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, true> = {};
    for (const [k, v] of Object.entries(parsed)) if (v === true) out[k] = true;
    return out;
  } catch {
    return {};
  }
}

export interface ProgressState {
  userId: string | null;
  completedIds: Record<string, true>;
  /** Local changes not yet confirmed by the server. */
  pending: Record<string, boolean>;
  /** True once the bound user's progress has been loaded. */
  hydrated: boolean;
  toggle: (id: string) => void;
  isCompleted: (id: string) => boolean;
  completedCount: (ids: string[]) => number;
  /** Bind to a user (or null when signed out) and load their progress. */
  setUser: (userId: string | null) => Promise<void>;
  /** Send pending changes to the server; keeps them on failure. */
  flush: () => Promise<void>;
  /** Delete a user's stored progress (account deletion). */
  forget: (userId: string) => Promise<void>;
}

/** Server cap per POST /progress batch. */
export const MAX_BATCH = 200;

export function createProgressStore(storage: KeyValueStorage, remote?: ProgressRemote) {
  // Single-flight per account: a flush started for A is never joined by B.
  let flushing: { userId: string; promise: Promise<boolean> } | null = null;

  return createStore<ProgressState>((set, get) => {
    const persist = (userId: string) => {
      const { completedIds, pending } = get();
      storage.setItem(progressStorageKey(userId), JSON.stringify(completedIds)).catch(() => {});
      storage.setItem(pendingStorageKey(userId), JSON.stringify(pending)).catch(() => {});
    };

    /** One round: push up to MAX_BATCH pending changes (or pull). true = server answered. */
    const doFlush = async (userId: string): Promise<boolean> => {
      if (!remote) return false;
      const sending = Object.fromEntries(Object.entries(get().pending).slice(0, MAX_BATCH));
      const changes = Object.entries(sending).map(([step_id, completed]) => ({ step_id, completed }));
      try {
        const server = changes.length ? await remote.push(changes) : await remote.fetch();
        if (get().userId !== userId) return false;
        // Drop only what was sent and not changed again meanwhile.
        const still = { ...get().pending };
        for (const [id, v] of Object.entries(sending)) if (still[id] === v) delete still[id];
        set({ pending: still, completedIds: applyPending(server, still) });
        persist(userId);
        storage.setItem(syncedMarkerKey(userId), '1').catch(() => {});
        return true;
      } catch (e) {
        const status = (e as { response?: { status?: number } })?.response?.status;
        if ((status === 400 || status === 413 || status === 422) && get().userId === userId) {
          // The server refused the request itself (bad batch): retrying it would block every later change.
          // Drop it from the queue. A 403/404 from a proxy or misdeploy keeps the queue (could be temporary).
          const still = { ...get().pending };
          for (const [id, v] of Object.entries(sending)) if (still[id] === v) delete still[id];
          set({ pending: still });
          persist(userId);
          return true;
        }
        // Offline / server error / auth: keep the queue; the next trigger retries.
        return false;
      }
    };

    return {
      userId: null,
      completedIds: {},
      pending: {},
      hydrated: false,

      toggle: (id) => {
        const { userId, completedIds, pending, hydrated } = get();
        // Before this account's progress has loaded, a tap would persist a
        // one-tick snapshot over the stored set. Ignore it (UI shows loading).
        if (userId && !hydrated) return;
        const next = { ...completedIds };
        const done = !next[id];
        if (done) next[id] = true;
        else delete next[id];
        set({ completedIds: next, pending: { ...pending, [id]: done } });
        if (userId) {
          persist(userId);
          void get().flush();
        }
      },

      isCompleted: (id) => !!get().completedIds[id],

      completedCount: (ids) => ids.filter((id) => !!get().completedIds[id]).length,

      setUser: async (userId) => {
        // Clear immediately so the previous account's ticks are never on screen
        // for the next one, even for a frame while storage loads.
        set({ userId, completedIds: {}, pending: {}, hydrated: false });
        // The old shared key cannot be attributed to an account; drop it.
        await storage.removeItem(LEGACY_PROGRESS_KEY).catch(() => {});
        if (!userId) {
          set({ hydrated: true });
          return;
        }
        const [raw, rawPending, synced] = await Promise.all([
          storage.getItem(progressStorageKey(userId)).catch(() => null),
          storage.getItem(pendingStorageKey(userId)).catch(() => null),
          storage.getItem(syncedMarkerKey(userId)).catch(() => null),
        ]);
        // Ignore a load that finished after the user changed again.
        if (get().userId !== userId) return;
        const local = parseProgress(raw);
        const pending = parsePending(rawPending);
        if (!synced) {
          // First sync of this account on this device: upload existing ticks.
          for (const id of Object.keys(local)) if (!(id in pending)) pending[id] = true;
        }
        set({ completedIds: local, pending, hydrated: true });
        await get().flush();
      },

      flush: async () => {
        // Drain: keep sending while the server answers and changes remain
        // (including ones made during an in-flight request, and queues larger
        // than one batch). Bounded so a misbehaving server cannot spin.
        for (let round = 0; round < 10; round++) {
          const userId = get().userId;
          if (!userId) return;
          if (!flushing || flushing.userId !== userId) {
            const promise = doFlush(userId).finally(() => {
              if (flushing?.promise === promise) flushing = null;
            });
            flushing = { userId, promise };
          }
          const ok = await flushing.promise;
          if (!ok || Object.keys(get().pending).length === 0) return;
        }
      },

      forget: async (userId) => {
        await Promise.all([
          storage.removeItem(progressStorageKey(userId)).catch(() => {}),
          storage.removeItem(pendingStorageKey(userId)).catch(() => {}),
          storage.removeItem(syncedMarkerKey(userId)).catch(() => {}),
        ]);
        if (get().userId === userId) set({ completedIds: {}, pending: {} });
      },
    };
  });
}
