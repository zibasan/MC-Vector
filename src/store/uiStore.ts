import { create } from 'zustand';
import type { AppView } from '../renderer/shared/server declaration';

export interface ServerContextMenuState {
  x: number;
  y: number;
  serverId: string;
}

interface UiStoreState {
  currentView: AppView;
  isSidebarOpen: boolean;
  showAddServerModal: boolean;
  contextMenu: ServerContextMenuState | null;
  setCurrentView: (view: AppView) => void;
  setIsSidebarOpen: (open: boolean) => void;
  setShowAddServerModal: (open: boolean) => void;
  setContextMenu: (menu: ServerContextMenuState | null) => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  currentView: 'dashboard',
  isSidebarOpen: true,
  showAddServerModal: false,
  contextMenu: null,
  setCurrentView: (view) => set({ currentView: view }),
  setIsSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setShowAddServerModal: (open) => set({ showAddServerModal: open }),
  setContextMenu: (menu) => set({ contextMenu: menu }),
}));
