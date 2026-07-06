import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const KEY = 'jrdr-paige-mode';

// Paige mode is a UI restriction, not a separate auth identity: the device is
// handed to Paige with only the Home (chores) tab visible and edit controls
// hidden; completions log completed_by='paige'. Same model as the web app's
// ?mode=paige flag. Exit is a long-press on the pane title (with confirm).
interface PaigeModeStore {
  active: boolean;
  hydrate: () => void;
  enable: () => void;
  disable: () => void;
}

export const usePaigeModeStore = create<PaigeModeStore>((set) => ({
  active: false,
  hydrate: async () => {
    try {
      const v = await AsyncStorage.getItem(KEY);
      if (v === '1') set({ active: true });
    } catch {
      // ignore — default to owner mode
    }
  },
  enable: () => {
    set({ active: true });
    AsyncStorage.setItem(KEY, '1').catch(() => {});
  },
  disable: () => {
    set({ active: false });
    AsyncStorage.removeItem(KEY).catch(() => {});
  },
}));
