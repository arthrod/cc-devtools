import { create } from 'zustand';

/**
 * Progress information for a running config
 */
export interface RunProgress {
  configId: string;
  configName: string;
  currentFile: string | null;
  filesProcessed: number;
  filesSucceeded: number;
  filesFailed: number;
  totalFiles: number;
  recentFiles: Array<{ file: string; success: boolean; duration: number; output?: string }>;
  startTime: number;
  cancelling?: boolean;
}

interface PerFileRunnerState {
  expandedConfigId: string | null;
  setExpandedConfigId: (id: string | null) => void;

  runningConfigs: Map<string, RunProgress>;
  setRunProgress: (id: string, progress: RunProgress) => void;
  updateRunProgress: (
    id: string,
    update: Partial<RunProgress> | ((prev: RunProgress) => RunProgress)
  ) => void;
  clearRunProgress: (id: string) => void;
  isConfigRunning: (id: string) => boolean;
}

/**
 * Per-File-Runner specific state store.
 * Manages expanded configs and running state.
 */
export const usePerFileRunnerStore = create<PerFileRunnerState>((set, get) => ({
  expandedConfigId: null,
  runningConfigs: new Map(),

  setExpandedConfigId: (id: string | null): void => set({ expandedConfigId: id }),

  setRunProgress: (id: string, progress: RunProgress): void =>
    set((state) => {
      const newRunningConfigs = new Map(state.runningConfigs);
      newRunningConfigs.set(id, progress);
      return { runningConfigs: newRunningConfigs };
    }),

  updateRunProgress: (
    id: string,
    update: Partial<RunProgress> | ((prev: RunProgress) => RunProgress)
  ): void =>
    set((state) => {
      const currentProgress = state.runningConfigs.get(id);
      if (!currentProgress) return state;

      const newProgress =
        typeof update === 'function'
          ? update(currentProgress)
          : { ...currentProgress, ...update };

      const newRunningConfigs = new Map(state.runningConfigs);
      newRunningConfigs.set(id, newProgress);
      return { runningConfigs: newRunningConfigs };
    }),

  clearRunProgress: (id: string): void =>
    set((state) => {
      const newRunningConfigs = new Map(state.runningConfigs);
      newRunningConfigs.delete(id);
      return { runningConfigs: newRunningConfigs };
    }),

  isConfigRunning: (id: string): boolean => {
    return get().runningConfigs.has(id);
  },
}));
