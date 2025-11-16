import { create } from 'zustand';

interface UIState {
  // Filter state
  searchQuery: string;
  selectedTags: string[];
  filteredStoryId: string | null; // For filtering subtasks by story

  // Actions
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
  setFilteredStoryId: (storyId: string | null) => void;
  clearFilters: () => void;
}

/**
 * UI state store for client-side filter state.
 * Manages search queries and tag filtering for kanban board.
 */
export const useUIStore = create<UIState>((set) => ({
  searchQuery: '',
  selectedTags: [],
  filteredStoryId: null,

  setSearchQuery: (query: string): void => set({ searchQuery: query }),

  toggleTag: (tag: string): void =>
    set((state) => ({
      selectedTags: state.selectedTags.includes(tag)
        ? state.selectedTags.filter((t) => t !== tag)
        : [...state.selectedTags, tag]
    })),

  setFilteredStoryId: (storyId: string | null): void => set({ filteredStoryId: storyId }),

  clearFilters: (): void => set({ searchQuery: '', selectedTags: [], filteredStoryId: null })
}));
