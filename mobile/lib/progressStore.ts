import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'journey_completed_ids';

interface ProgressState {
  completedIds: Record<string, true>;
  /** True once the persisted state has been loaded from AsyncStorage. */
  hydrated: boolean;
  toggle: (id: string) => void;
  isCompleted: (id: string) => boolean;
  completedCount: (ids: string[]) => number;
  /** Load persisted progress from AsyncStorage — call once at app start. */
  hydrate: () => Promise<void>;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  completedIds: {},
  hydrated: false,

  toggle: (id) => {
    const cur = get().completedIds;
    let next: Record<string, true>;
    if (cur[id]) {
      next = { ...cur };
      delete next[id];
    } else {
      next = { ...cur, [id]: true };
    }
    set({ completedIds: next });
    // Persist in the background — never block the UI on storage.
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => {});
  },

  isCompleted: (id) => !!get().completedIds[id],

  completedCount: (ids) => ids.filter((id) => !!get().completedIds[id]).length,

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          set({ completedIds: parsed as Record<string, true>, hydrated: true });
          return;
        }
      }
    } catch {
      // Corrupt / missing storage — start fresh, don't block the app.
    }
    set({ hydrated: true });
  },
}));
