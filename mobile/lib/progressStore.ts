import { useStore } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from './api';
import { createProgressStore, type ProgressRemote, type ProgressState } from './progressCore';

type ProgressOut = { completed_step_ids: string[] };

// Server side of journey progress (GET/POST /progress). Errors propagate so the
// core keeps changes queued while offline.
const remote: ProgressRemote = {
  fetch: async () => (await api.get<ProgressOut>('/progress')).data.completed_step_ids,
  push: async (changes) =>
    (await api.post<ProgressOut>('/progress', { changes })).data.completed_step_ids,
};

/** App-wide progress store, bound to AsyncStorage + the API. See lib/progressCore.ts. */
export const progressStore = createProgressStore(AsyncStorage, remote);

type ProgressHook = {
  <T>(selector: (s: ProgressState) => T): T;
  getState: typeof progressStore.getState;
  setState: typeof progressStore.setState;
};

export const useProgressStore = (<T,>(selector: (s: ProgressState) => T) =>
  useStore(progressStore, selector)) as ProgressHook;
useProgressStore.getState = progressStore.getState;
useProgressStore.setState = progressStore.setState;
