import { useStore } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { createProgressStore, type ProgressState } from './progressCore';

/** App-wide progress store, bound to AsyncStorage. See lib/progressCore.ts. */
export const progressStore = createProgressStore(AsyncStorage);

type ProgressHook = {
  <T>(selector: (s: ProgressState) => T): T;
  getState: typeof progressStore.getState;
  setState: typeof progressStore.setState;
};

export const useProgressStore = (<T,>(selector: (s: ProgressState) => T) =>
  useStore(progressStore, selector)) as ProgressHook;
useProgressStore.getState = progressStore.getState;
useProgressStore.setState = progressStore.setState;
