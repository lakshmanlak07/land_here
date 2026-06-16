import { create } from 'zustand';

interface ProgressState {
  completedIds: Record<string, true>;
  toggle: (id: string) => void;
  isCompleted: (id: string) => boolean;
  completedCount: (ids: string[]) => number;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  completedIds: {},

  toggle: (id) => {
    const cur = get().completedIds;
    if (cur[id]) {
      const next = { ...cur };
      delete next[id];
      set({ completedIds: next });
    } else {
      set({ completedIds: { ...cur, [id]: true } });
    }
  },

  isCompleted: (id) => !!get().completedIds[id],

  completedCount: (ids) => ids.filter((id) => !!get().completedIds[id]).length,
}));
