import { create } from 'zustand';

interface KanbanState {
  // Selected story for task filtering (dual-panel layout)
  selectedStoryId: string | null;

  // Selected phase for filtering stories
  selectedPhase: string;

  // UI state for collapsible sections (desktop)
  storiesExpanded: boolean;
  tasksExpanded: boolean;

  // Mobile view mode: stories (default) or subtasks
  mobileViewMode: 'stories' | 'subtasks';

  // Selected story for mobile subtask view (separate from desktop dual-panel selection)
  mobileSelectedStoryId: string | null;

  // Actions
  setSelectedStoryId: (storyId: string | null) => void;
  setSelectedPhase: (phase: string) => void;
  setStoriesExpanded: (expanded: boolean) => void;
  setTasksExpanded: (expanded: boolean) => void;

  // Toggle selected story (for filtering tasks)
  toggleStorySelection: (storyId: string) => void;

  // Mobile view mode actions
  setMobileViewMode: (mode: 'stories' | 'subtasks') => void;
  setMobileSelectedStoryId: (storyId: string | null) => void;
  enterSubtaskView: (storyId: string) => void;
  exitSubtaskView: () => void;

  // Reset all filters
  resetFilters: () => void;
}

/**
 * Kanban-specific state store.
 * Manages story selection, phase filtering, and dual-panel layout state.
 */
export const useKanbanStore = create<KanbanState>((set) => ({
  selectedStoryId: null,
  selectedPhase: 'all',
  storiesExpanded: true,
  tasksExpanded: true,
  mobileViewMode: 'stories',
  mobileSelectedStoryId: null,

  setSelectedStoryId: (storyId: string | null): void => set({ selectedStoryId: storyId }),

  setSelectedPhase: (phase: string): void => set({ selectedPhase: phase }),

  setStoriesExpanded: (expanded: boolean): void => set({ storiesExpanded: expanded }),

  setTasksExpanded: (expanded: boolean): void => set({ tasksExpanded: expanded }),

  toggleStorySelection: (storyId: string): void =>
    set((state) => ({
      selectedStoryId: state.selectedStoryId === storyId ? null : storyId,
      // Collapse stories panel when a story is selected
      storiesExpanded: state.selectedStoryId === storyId ? true : false
    })),

  setMobileViewMode: (mode: 'stories' | 'subtasks'): void => set({ mobileViewMode: mode }),

  setMobileSelectedStoryId: (storyId: string | null): void => set({ mobileSelectedStoryId: storyId }),

  enterSubtaskView: (storyId: string): void =>
    set({
      mobileViewMode: 'subtasks',
      mobileSelectedStoryId: storyId
    }),

  exitSubtaskView: (): void =>
    set({
      mobileViewMode: 'stories',
      mobileSelectedStoryId: null
    }),

  resetFilters: (): void =>
    set({
      selectedStoryId: null,
      selectedPhase: 'all',
      storiesExpanded: true,
      tasksExpanded: true,
      mobileViewMode: 'stories',
      mobileSelectedStoryId: null
    })
}));
