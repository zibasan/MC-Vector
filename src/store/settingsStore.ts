import { create } from 'zustand';

export type AppTheme =
  | 'dark'
  | 'darkBlue'
  | 'grey'
  | 'forest'
  | 'sunset'
  | 'neon'
  | 'coffee'
  | 'ocean'
  | 'system';

interface SettingsStoreState {
  appTheme: AppTheme;
  systemPrefersDark: boolean;
  setAppTheme: (theme: AppTheme) => void;
  setSystemPrefersDark: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsStoreState>((set) => ({
  appTheme: 'system',
  systemPrefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  setAppTheme: (theme) => set({ appTheme: theme }),
  setSystemPrefersDark: (value) => set({ systemPrefersDark: value }),
}));
