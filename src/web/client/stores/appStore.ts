import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Toast } from '../types/toast';

interface AppState {
  sidebarCollapsed: boolean;
  darkMode: boolean;
  isConnected: boolean;
  workingDirectory: string | null;
  directoryName: string | null;
  mobileLayoutMode: 'list' | 'tabs' | 'swipe';
  toasts: Toast[];
  liveMessage: string;

  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleDarkMode: () => void;
  setConnected: (connected: boolean) => void;
  setMobileLayoutMode: (mode: 'list' | 'tabs' | 'swipe') => void;
  fetchSystemInfo: () => Promise<void>;
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
  setLiveMessage: (message: string) => void;
}

/**
 * Global application store with persistence for user preferences.
 * Manages UI state, dark mode, sidebar collapse, and system information.
 */
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      sidebarCollapsed: false,
      darkMode: false,
      isConnected: false,
      workingDirectory: null,
      directoryName: null,
      mobileLayoutMode: 'list',
      toasts: [],
      liveMessage: '',

      toggleSidebar: (): void => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),

      setSidebarCollapsed: (collapsed: boolean): void => set({ sidebarCollapsed: collapsed }),

      toggleDarkMode: (): void => {
        const newMode = !get().darkMode;
        set({ darkMode: newMode });

        if (newMode) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      },

      setConnected: (connected: boolean): void => set({ isConnected: connected }),

      setMobileLayoutMode: (mode: 'list' | 'tabs' | 'swipe'): void => set({ mobileLayoutMode: mode }),

      fetchSystemInfo: async (): Promise<void> => {
        try {
          const response = await fetch('/cc-api/project/system-info');

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = (await response.json()) as {
            success: boolean;
            data?: { workingDirectory: string; directoryName: string };
          };

          if (result.success && result.data) {
            set({
              workingDirectory: result.data.workingDirectory,
              directoryName: result.data.directoryName
            });
          }
        } catch (_error) {
          // Silently fail to avoid blocking app startup
        }
      },

      addToast: (toast: Omit<Toast, 'id'>): void => {
        const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
        const newToast: Toast = { ...toast, id };
        set((state) => ({ toasts: [...state.toasts, newToast] }));
      },

      removeToast: (id: string): void => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      },

      clearToasts: (): void => {
        set({ toasts: [] });
      },

      setLiveMessage: (message: string): void => {
        set({ liveMessage: message });
        // Clear message after announcement to allow repeated announcements
        setTimeout(() => {
          set({ liveMessage: '' });
        }, 1000);
      }
    }),
    {
      name: 'cc-devtools-app-storage',
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        darkMode: state.darkMode,
        mobileLayoutMode: state.mobileLayoutMode
      })
    }
  )
);
