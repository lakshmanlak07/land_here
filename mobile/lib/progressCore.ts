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
  /** True once the bound user's progress has been loaded. */
  hydrated: boolean;
  toggle: (id: string) => void;
  isCompleted: (id: string) => boolean;
  completedCount: (ids: string[]) => number;
  /** Bind to a user (or null when signed out) and load their progress. */
  setUser: (userId: string | null) => Promise<void>;
  /** Delete a user's stored progress (account deletion). */
  forget: (userId: string) => Promise<void>;
}

export function createProgressStore(storage: KeyValueStorage) {
  return createStore<ProgressState>((set, get) => ({
    userId: null,
    completedIds: {},
    hydrated: false,

    toggle: (id) => {
      const { userId, completedIds } = get();
      const next = { ...completedIds };
      if (next[id]) delete next[id];
      else next[id] = true;
      set({ completedIds: next });
      if (userId) storage.setItem(progressStorageKey(userId), JSON.stringify(next)).catch(() => {});
    },

    isCompleted: (id) => !!get().completedIds[id],

    completedCount: (ids) => ids.filter((id) => !!get().completedIds[id]).length,

    setUser: async (userId) => {
      // Clear immediately so the previous account's ticks are never on screen
      // for the next one, even for a frame while storage loads.
      set({ userId, completedIds: {}, hydrated: false });
      // The old shared key cannot be attributed to an account; drop it.
      await storage.removeItem(LEGACY_PROGRESS_KEY).catch(() => {});
      if (!userId) {
        set({ hydrated: true });
        return;
      }
      const raw = await storage.getItem(progressStorageKey(userId)).catch(() => null);
      // Ignore a load that finished after the user changed again.
      if (get().userId !== userId) return;
      set({ completedIds: parseProgress(raw), hydrated: true });
    },

    forget: async (userId) => {
      await storage.removeItem(progressStorageKey(userId)).catch(() => {});
      if (get().userId === userId) set({ completedIds: {} });
    },
  }));
}
