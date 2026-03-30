import { create } from 'zustand';

const MAX_LOG_LINES = 2000;

interface ConsoleStoreState {
  serverLogs: Record<string, string[]>;
  appendServerLog: (serverId: string, line: string) => void;
  removeServerLogs: (serverId: string) => void;
  clearServerLogs: () => void;
}

export const useConsoleStore = create<ConsoleStoreState>((set) => ({
  serverLogs: {},
  appendServerLog: (serverId, line) => {
    set((state) => {
      const current = state.serverLogs[serverId] ?? [];
      const nextLogs = [...current, line];
      if (nextLogs.length > MAX_LOG_LINES) {
        nextLogs.shift();
      }

      return {
        serverLogs: {
          ...state.serverLogs,
          [serverId]: nextLogs,
        },
      };
    });
  },
  removeServerLogs: (serverId) => {
    set((state) => {
      const next = { ...state.serverLogs };
      delete next[serverId];
      return { serverLogs: next };
    });
  },
  clearServerLogs: () => {
    set({ serverLogs: {} });
  },
}));
