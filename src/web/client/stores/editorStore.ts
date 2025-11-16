import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface OpenFile {
  path: string;
  content: string;
  language: string;
  isDirty: boolean;
  lastModified?: string;
}

export interface RecentFile {
  path: string;
  lastAccessed: string;
  language: string;
}

export interface EditorPreferences {
  theme: 'vs-dark' | 'light';
  fontSize: number;
  tabSize: number;
  wordWrap: boolean;
  minimap: boolean;
  autoSave: boolean;
  autoSaveDelay: number;
}

export interface SplitViewState {
  enabled: boolean;
  orientation: 'horizontal' | 'vertical';
  leftFile: string | null;
  rightFile: string | null;
  leftSize: number; // Percentage (0-100)
}

interface EditorState {
  // File management
  openFiles: Map<string, OpenFile>;
  activeFile: string | null;
  dirtyFiles: Set<string>;
  recentFiles: RecentFile[];
  favoriteFiles: string[];

  // Split view state
  splitView: SplitViewState;

  // Search state
  searchHistory: string[];

  // Preferences
  preferences: EditorPreferences;

  // Actions
  openFile: (path: string, content: string, language: string) => void;
  closeFile: (path: string) => void;
  setActiveFile: (path: string | null) => void;
  updateFileContent: (path: string, content: string) => void;
  markFileDirty: (path: string) => void;
  markFileClean: (path: string) => void;
  isFileDirty: (path: string) => boolean;

  // Recent files
  addRecentFile: (file: RecentFile) => void;
  clearRecentFiles: () => void;

  // Favorite files
  toggleFavorite: (path: string) => void;
  clearFavorites: () => void;

  // Split view
  enableSplitView: (orientation: 'horizontal' | 'vertical') => void;
  disableSplitView: () => void;
  setSplitFiles: (leftFile: string | null, rightFile: string | null) => void;
  setSplitSize: (size: number) => void;

  // Search
  addSearchQuery: (query: string) => void;
  clearSearchHistory: () => void;

  // Preferences
  updatePreferences: (updates: Partial<EditorPreferences>) => void;
  resetPreferences: () => void;
}

const defaultPreferences: EditorPreferences = {
  theme: 'vs-dark',
  fontSize: 14,
  tabSize: 2,
  wordWrap: true,
  minimap: true,
  autoSave: false,
  autoSaveDelay: 2000,
};

export const useEditorStore = create<EditorState>()(
  persist(
    (set, get) => ({
      // Initial state
      openFiles: new Map(),
      activeFile: null,
      dirtyFiles: new Set(),
      recentFiles: [],
      favoriteFiles: [],
      splitView: {
        enabled: false,
        orientation: 'horizontal',
        leftFile: null,
        rightFile: null,
        leftSize: 50,
      },
      searchHistory: [],
      preferences: { ...defaultPreferences },

      // File management actions
      openFile: (path: string, content: string, language: string): void => {
        set((state) => {
          const newOpenFiles = new Map(state.openFiles);
          newOpenFiles.set(path, {
            path,
            content,
            language,
            isDirty: false,
            lastModified: new Date().toISOString(),
          });

          // Add to recent files
          const recentFile: RecentFile = {
            path,
            lastAccessed: new Date().toISOString(),
            language,
          };

          const newRecentFiles = [
            recentFile,
            ...state.recentFiles.filter(f => f.path !== path)
          ].slice(0, 50);

          return {
            openFiles: newOpenFiles,
            activeFile: path,
            recentFiles: newRecentFiles,
          };
        });
      },

      closeFile: (path: string): void => {
        set((state) => {
          const newOpenFiles = new Map(state.openFiles);
          newOpenFiles.delete(path);

          const newDirtyFiles = new Set(state.dirtyFiles);
          newDirtyFiles.delete(path);

          let newActiveFile: string | null = state.activeFile;

          // Update split view if closing a split file
          let newSplitView = { ...state.splitView };
          if (state.splitView.enabled) {
            if (state.splitView.leftFile === path) {
              newSplitView.leftFile = null;
            }
            if (state.splitView.rightFile === path) {
              newSplitView.rightFile = null;
            }
            // Disable split view if both files are closed
            if (!newSplitView.leftFile && !newSplitView.rightFile) {
              newSplitView.enabled = false;
            }
          }

          // Update active file if closing the active file
          if (state.activeFile === path) {
            const remainingFiles = Array.from(newOpenFiles.keys());
            newActiveFile = remainingFiles.length > 0 ? remainingFiles[0] ?? null : null;
          }

          return {
            openFiles: newOpenFiles,
            activeFile: newActiveFile,
            dirtyFiles: newDirtyFiles,
            splitView: newSplitView,
          };
        });
      },

      setActiveFile: (path: string | null): void => {
        set({ activeFile: path });

        // Update recent files timestamp
        if (path) {
          set((state) => {
            const fileContent = state.openFiles.get(path);
            if (fileContent) {
              const recentFile: RecentFile = {
                path,
                lastAccessed: new Date().toISOString(),
                language: fileContent.language,
              };

              const newRecentFiles = [
                recentFile,
                ...state.recentFiles.filter(f => f.path !== path)
              ].slice(0, 50);

              return { recentFiles: newRecentFiles };
            }
            return {};
          });
        }
      },

      updateFileContent: (path: string, content: string): void => {
        set((state) => {
          const newOpenFiles = new Map(state.openFiles);
          const currentFile = newOpenFiles.get(path);

          if (currentFile) {
            newOpenFiles.set(path, {
              ...currentFile,
              content,
              lastModified: new Date().toISOString(),
            });

            const newDirtyFiles = new Set(state.dirtyFiles);
            newDirtyFiles.add(path);

            return {
              openFiles: newOpenFiles,
              dirtyFiles: newDirtyFiles,
            };
          }

          return {};
        });
      },

      markFileDirty: (path: string): void => {
        set((state) => {
          const newDirtyFiles = new Set(state.dirtyFiles);
          newDirtyFiles.add(path);
          return { dirtyFiles: newDirtyFiles };
        });
      },

      markFileClean: (path: string): void => {
        set((state) => {
          const newDirtyFiles = new Set(state.dirtyFiles);
          newDirtyFiles.delete(path);

          const newOpenFiles = new Map(state.openFiles);
          const file = newOpenFiles.get(path);
          if (file) {
            newOpenFiles.set(path, { ...file, isDirty: false });
          }

          return {
            dirtyFiles: newDirtyFiles,
            openFiles: newOpenFiles,
          };
        });
      },

      isFileDirty: (path: string): boolean => {
        return get().dirtyFiles.has(path);
      },

      // Recent files management
      addRecentFile: (file: RecentFile): void => {
        set((state) => {
          const newRecentFiles = [
            file,
            ...state.recentFiles.filter(f => f.path !== file.path)
          ].slice(0, 50);

          return { recentFiles: newRecentFiles };
        });
      },

      clearRecentFiles: (): void => {
        set({ recentFiles: [] });
      },

      // Favorite files management
      toggleFavorite: (path: string): void => {
        set((state) => {
          const newFavorites = state.favoriteFiles.includes(path)
            ? state.favoriteFiles.filter(f => f !== path)
            : [...state.favoriteFiles, path];

          return { favoriteFiles: newFavorites };
        });
      },

      clearFavorites: (): void => {
        set({ favoriteFiles: [] });
      },

      // Split view management
      enableSplitView: (orientation: 'horizontal' | 'vertical'): void => {
        set((state) => ({
          splitView: {
            ...state.splitView,
            enabled: true,
            orientation,
          },
        }));
      },

      disableSplitView: (): void => {
        set((state) => ({
          splitView: {
            ...state.splitView,
            enabled: false,
            leftFile: null,
            rightFile: null,
          },
        }));
      },

      setSplitFiles: (leftFile: string | null, rightFile: string | null): void => {
        set((state) => ({
          splitView: {
            ...state.splitView,
            leftFile,
            rightFile,
          },
        }));
      },

      setSplitSize: (size: number): void => {
        set((state) => ({
          splitView: {
            ...state.splitView,
            leftSize: Math.max(20, Math.min(80, size)), // Clamp between 20-80%
          },
        }));
      },

      // Search management
      addSearchQuery: (query: string): void => {
        set((state) => {
          if (!query.trim()) return {};

          const newSearchHistory = [
            query,
            ...state.searchHistory.filter(q => q !== query)
          ].slice(0, 20);

          return { searchHistory: newSearchHistory };
        });
      },

      clearSearchHistory: (): void => {
        set({ searchHistory: [] });
      },

      // Preferences management
      updatePreferences: (updates: Partial<EditorPreferences>): void => {
        set((state) => ({
          preferences: { ...state.preferences, ...updates },
        }));
      },

      resetPreferences: (): void => {
        set({ preferences: { ...defaultPreferences } });
      },
    }),
    {
      name: 'cc-devtools-editor-storage',
      partialize: (state) => ({
        preferences: state.preferences,
        recentFiles: state.recentFiles,
        favoriteFiles: state.favoriteFiles,
        searchHistory: state.searchHistory,
        // Note: openFiles, dirtyFiles, and splitView are session state (not persisted)
      }),
    }
  )
);
