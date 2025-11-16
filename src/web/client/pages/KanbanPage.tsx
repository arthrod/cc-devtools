import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { KanbanColumn } from '../components/kanban/KanbanColumn.jsx';
import { StoryCard } from '../components/kanban/StoryCard.jsx';
import { SubtaskCard } from '../components/kanban/SubtaskCard.jsx';
import { KanbanFilters } from '../components/kanban/KanbanFilters';
import { StoryForm } from '../components/kanban/StoryForm';
import { SubtaskForm } from '../components/kanban/SubtaskForm';
import { DeleteStoryModal } from '../components/kanban/DeleteStoryModal';
import { Button } from '../components/common/Button';
import { Select, SearchBar } from '../components/shared';
import { useStories, useTags, useKanbanConfig, useKanbanMutations, useSearchKanban, useDeleteStory } from '../hooks/useStories';
import { useUIStore } from '../stores/uiStore';
import { useKanbanStore } from '../stores/kanbanStore';
import { useDebounce } from '../hooks/useDebounce';
import { useIsMobile } from '../hooks/useIsMobile';
import { useAppStore } from '../stores/appStore';
import { MobileKanbanListView } from '../components/kanban/mobile/MobileKanbanListView';
import { MobileKanbanTabView } from '../components/kanban/mobile/MobileKanbanTabView';
import { MobileKanbanSwipeView } from '../components/kanban/mobile/MobileKanbanSwipeView';
import { MobileLayoutSwitcher } from '../components/kanban/mobile/MobileLayoutSwitcher';
import type { SubtaskWithParent } from '../components/kanban/mobile/MobileSubtaskCard';
import type { Story, Subtask, StoryStatus, SubtaskStatus } from '../../../kanban/types.js';

interface Column {
  id: StoryStatus | SubtaskStatus;
  title: string;
  color: string;
}

/**
 * Kanban Board page - dual-panel layout with stories + filtered tasks
 */
export function KanbanPage(): JSX.Element {
  const [showNewStoryForm, setShowNewStoryForm] = useState(false);
  const [storyToEdit, setStoryToEdit] = useState<Story | null>(null);
  const [subtaskStoryId, setSubtaskStoryId] = useState<string | null>(null);
  const [subtaskToEdit, setSubtaskToEdit] = useState<Subtask | null>(null);
  const [storyToDelete, setStoryToDelete] = useState<Story | null>(null);
  const { searchQuery, selectedTags, filteredStoryId, setSearchQuery, setFilteredStoryId } = useUIStore();
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const {
    selectedStoryId,
    selectedPhase,
    storiesExpanded,
    tasksExpanded,
    setSelectedStoryId,
    setSelectedPhase,
    setStoriesExpanded,
    setTasksExpanded
  } = useKanbanStore();

  // Mobile detection and layout mode
  const isMobile = useIsMobile();
  const { mobileLayoutMode, setMobileLayoutMode } = useAppStore();

  const searchInputRef = useRef<HTMLInputElement>(null);
  const cursorPositionRef = useRef<number | null>(null);

  // Preserve cursor position and focus across re-renders
  useEffect(() => {
    const input = searchInputRef.current;
    if (!input) return;

    // Restore focus and cursor if we had saved position
    if (document.activeElement !== input && cursorPositionRef.current !== null) {
      input.focus();
      input.setSelectionRange(cursorPositionRef.current, cursorPositionRef.current);
      cursorPositionRef.current = null;
    }
  });

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    // Save cursor position before state update
    cursorPositionRef.current = e.target.selectionStart;
    setSearchQuery(e.target.value);
  }, [setSearchQuery]);

  // Fetch ALL stories (no filtering by search - that happens on frontend)
  const { data: allStories = [], isLoading } = useStories();

  // Get search-qualifying story IDs when search query exists
  const { data: searchResults = [] } = useSearchKanban(debouncedSearchQuery);
  const searchMatchingIds = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return null;
    return new Set(searchResults.filter(r => r.type === 'story').map(r => r.id));
  }, [debouncedSearchQuery, searchResults]);

  const { data: allTags = [] } = useTags();
  const { data: config } = useKanbanConfig();
  const { updateStoryStatus, updateSubtaskStatus } = useKanbanMutations();
  const deleteStory = useDeleteStory();

  const [activeStory, setActiveStory] = useState<Story | null>(null);
  const [activeSubtask, setActiveSubtask] = useState<Subtask | null>(null);

  // Drag sensor with 5px activation distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Extract phase from story ID (e.g., "MVP-001" -> "MVP")
  const getStoryPhase = (story: Story): string => {
    const match = story.id.match(/^(.+)-(\d+)$/);
    return match ? match[1] : 'MISC';
  };

  // Cascading filter logic: search → phase ↔ tags
  // Both phase and tags see the search filter, and they see each other's selections

  // Step 1: Apply search filter only
  const storiesAfterSearch = useMemo(() => {
    return allStories.filter((story) => {
      // Search filter
      if (searchMatchingIds && !searchMatchingIds.has(story.id)) {
        return false;
      }
      // Story filter
      if (filteredStoryId && story.id !== filteredStoryId) {
        return false;
      }
      return true;
    });
  }, [allStories, searchMatchingIds, filteredStoryId]);

  // Step 2: Stories for phase counts (search + tags)
  const storiesForPhaseCounts = useMemo(() => {
    if (selectedTags.length === 0) {
      return storiesAfterSearch;
    }
    return storiesAfterSearch.filter((story) => {
      const storyTags = story.labels ?? [];
      return selectedTags.every((tag) => storyTags.includes(tag));
    });
  }, [storiesAfterSearch, selectedTags]);

  // Step 3: Stories for tag counts (search + phase)
  const storiesForTagCounts = useMemo(() => {
    if (selectedPhase === 'all') {
      return storiesAfterSearch;
    }
    return storiesAfterSearch.filter((story) =>
      getStoryPhase(story) === selectedPhase
    );
  }, [storiesAfterSearch, selectedPhase]);

  // Get available phases with counts
  const phases = useMemo(() => {
    const phaseCounts = new Map<string, number>();
    storiesForPhaseCounts.forEach((story) => {
      const phase = getStoryPhase(story);
      phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + 1);
    });
    return Array.from(phaseCounts.keys()).sort();
  }, [storiesForPhaseCounts]);

  const phaseOptions = useMemo(() => {
    const phaseCounts = new Map<string, number>();
    storiesForPhaseCounts.forEach((story) => {
      const phase = getStoryPhase(story);
      phaseCounts.set(phase, (phaseCounts.get(phase) ?? 0) + 1);
    });

    return [
      { value: 'all', label: `All Phases (${storiesForPhaseCounts.length})` },
      ...phases.map((phase) => ({
        value: phase,
        label: `${phase} (${phaseCounts.get(phase) ?? 0})`
      }))
    ];
  }, [phases, storiesForPhaseCounts]);

  // Step 4: Final filtered stories (search + phase + tags)
  const filteredStories = useMemo(() => {
    return storiesAfterSearch.filter((story) => {
      // Phase filter
      if (selectedPhase !== 'all' && getStoryPhase(story) !== selectedPhase) {
        return false;
      }
      // Tag filter (AND mode)
      if (selectedTags.length > 0) {
        const storyTags = story.labels ?? [];
        const hasAllTags = selectedTags.every((tag) => storyTags.includes(tag));
        if (!hasAllTags) {
          return false;
        }
      }
      return true;
    });
  }, [storiesAfterSearch, selectedPhase, selectedTags]);

  // Get tasks to show based on selected story
  const tasksToShow = useMemo(() => {
    if (selectedStoryId) {
      const selectedStory = filteredStories.find(s => s.id === selectedStoryId);
      return selectedStory?.subtasks ?? [];
    }
    return filteredStories.flatMap(story => story.subtasks ?? []);
  }, [selectedStoryId, filteredStories]);

  // Create a mapping of subtaskId → storyId for edit functionality
  const subtaskToStoryMap = useMemo(() => {
    const map = new Map<string, string>();
    filteredStories.forEach(story => {
      story.subtasks?.forEach(subtask => {
        map.set(subtask.id, story.id);
      });
    });
    return map;
  }, [filteredStories]);

  const selectedStory = selectedStoryId ? allStories.find(s => s.id === selectedStoryId) : null;
  const hasActiveFilters = debouncedSearchQuery.trim() !== '' || selectedTags.length > 0 || filteredStoryId !== null;
  const filteredStory = filteredStoryId ? allStories.find(s => s.id === filteredStoryId) : null;

  // Define columns based on config (memoized to prevent recreation on every render)
  const storyColumns: Column[] = useMemo(() => {
    return config?.story?.map((status) => {
      const titles: Record<string, string> = {
        'todo': 'To Do',
        'in_progress': 'In Progress',
        'in_review': 'In Review',
        'done': 'Done',
      };
      const colors: Record<string, string> = {
        'todo': '#6b7280',
        'in_progress': '#3b82f6',
        'in_review': '#f59e0b',
        'done': '#10b981',
      };
      return {
        id: status,
        title: titles[status] ?? status,
        color: colors[status] ?? '#6b7280',
      };
    }) ?? [
      { id: 'todo' as StoryStatus, title: 'To Do', color: '#6b7280' },
      { id: 'in_progress' as StoryStatus, title: 'In Progress', color: '#3b82f6' },
      { id: 'in_review' as StoryStatus, title: 'In Review', color: '#f59e0b' },
      { id: 'done' as StoryStatus, title: 'Done', color: '#10b981' },
    ];
  }, [config?.story]);

  const subtaskColumns: Column[] = useMemo(() => {
    return config?.subtask?.map((status) => {
      const titles: Record<string, string> = {
        'todo': 'To Do',
        'in_progress': 'In Progress',
        'done': 'Done',
      };
      const colors: Record<string, string> = {
        'todo': '#6b7280',
        'in_progress': '#3b82f6',
        'done': '#10b981',
      };
      return {
        id: status,
        title: titles[status] ?? status,
        color: colors[status] ?? '#6b7280',
      };
    }) ?? [
      { id: 'todo' as SubtaskStatus, title: 'To Do', color: '#6b7280' },
      { id: 'in_progress' as SubtaskStatus, title: 'In Progress', color: '#3b82f6' },
      { id: 'done' as SubtaskStatus, title: 'Done', color: '#10b981' },
    ];
  }, [config?.subtask]);

  const completedTaskStatuses: SubtaskStatus[] = useMemo(
    () => config?.subtask?.filter(s => s === 'done') ?? ['done'],
    [config?.subtask]
  );

  // Drag handlers
  const handleDragStart = (event: DragStartEvent): void => {
    const id = event.active.id as string;

    // Check if it's a story
    const story = filteredStories.find((s) => s.id === id);
    if (story) {
      setActiveStory(story);
      setActiveSubtask(null);
      return;
    }

    // Check if it's a subtask
    const subtask = tasksToShow.find((t) => t.id === id);
    if (subtask) {
      setActiveSubtask(subtask);
      setActiveStory(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeId = active.id as string;
      const overId = over.id as string;

      // Handle story drag
      const story = filteredStories.find((s) => s.id === activeId);
      if (story) {
        const newStatus = overId as StoryStatus;
        if (story.status !== newStatus) {
          updateStoryStatus.mutate({ storyId: activeId, status: newStatus });
        }
      }

      // Handle subtask drag (prefix with 'subtask-' to distinguish)
      const subtask = tasksToShow.find((t) => t.id === activeId);
      if (subtask && overId.startsWith('subtask-')) {
        const newStatus = overId.replace('subtask-', '') as SubtaskStatus;
        if (subtask.status !== newStatus) {
          updateSubtaskStatus.mutate({ subtaskId: activeId, status: newStatus });
        }
      }
    }

    setActiveStory(null);
    setActiveSubtask(null);
  };

  // Mobile handlers (placeholders for features that require additional implementation)
  const handleStoryEdit = useCallback((story: Story): void => {
    setStoryToEdit(story);
  }, []);

  const handleStoryMoveStatus = useCallback((story: Story, newStatus: StoryStatus): void => {
    updateStoryStatus.mutate({ storyId: story.id, status: newStatus });
  }, [updateStoryStatus]);

  const handleStoryFilter = useCallback((story: Story): void => {
    setFilteredStoryId(story.id);
  }, [setFilteredStoryId]);

  const handleStoryDelete = useCallback((story: Story): void => {
    setStoryToDelete(story);
  }, []);

  const handleAddSubtask = useCallback((story: Story): void => {
    setSubtaskStoryId(story.id);
    setSubtaskToEdit(null); // Clear any existing subtask being edited
  }, []);

  const handleSubtaskEdit = useCallback((subtask: SubtaskWithParent): void => {
    // Open subtask form with the subtask's parent story for editing
    if (subtask.parentStoryId) {
      setSubtaskStoryId(subtask.parentStoryId);
      setSubtaskToEdit(subtask);
    }
  }, []);

  const handleSubtaskMoveStatus = useCallback((subtask: SubtaskWithParent, newStatus: SubtaskStatus): void => {
    updateSubtaskStatus.mutate({ subtaskId: subtask.id, status: newStatus });
  }, [updateSubtaskStatus]);

  const handleSubtaskDelete = useCallback((subtask: SubtaskWithParent): void => {
    // For now, subtask deletion is handled through the subtask form
    // Could implement a separate modal in the future
    if (subtask.parentStoryId) {
      setSubtaskStoryId(subtask.parentStoryId);
    }
  }, []);

  const handleConfirmDelete = useCallback(async (): Promise<void> => {
    if (!storyToDelete) return;
    await deleteStory.mutateAsync(storyToDelete.id);
    setStoryToDelete(null);
  }, [storyToDelete, deleteStory]);

  // Mobile view
  if (isMobile) {
    const mobileProps = {
      stories: filteredStories,
      storyColumns: storyColumns.map(c => c.id),
      onStoryEdit: handleStoryEdit,
      onStoryMoveStatus: handleStoryMoveStatus,
      onStoryFilter: handleStoryFilter,
      onStoryDelete: handleStoryDelete,
      onAddSubtask: handleAddSubtask,
      onSubtaskEdit: handleSubtaskEdit,
      onSubtaskMoveStatus: handleSubtaskMoveStatus,
      onSubtaskDelete: handleSubtaskDelete,
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        {/* Mobile Header */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Kanban Board</h1>
            <div className="flex items-center gap-2">
              <MobileLayoutSwitcher
                currentLayout={mobileLayoutMode}
                onLayoutChange={setMobileLayoutMode}
              />
              <Button
                onClick={() => setShowNewStoryForm(true)}
                size="sm"
                className="flex items-center space-x-1"
              >
                <Plus className="h-4 w-4" />
                <span>New</span>
              </Button>
            </div>
          </div>

          {/* Mobile Search and Filters */}
          <div className="space-y-2">
            <SearchBar
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search stories..."
              inputRef={searchInputRef}
            />
            {hasActiveFilters && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing {filteredStories.length} of {allStories.length} stories
              </p>
            )}
          </div>
        </div>

        {/* Mobile Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 dark:text-gray-400">Loading stories...</p>
            </div>
          ) : mobileLayoutMode === 'list' ? (
            <MobileKanbanListView {...mobileProps} />
          ) : mobileLayoutMode === 'tabs' ? (
            <MobileKanbanTabView {...mobileProps} />
          ) : (
            <MobileKanbanSwipeView {...mobileProps} />
          )}
        </div>

        {/* New Story Form */}
        {showNewStoryForm && (
          <StoryForm
            onClose={() => setShowNewStoryForm(false)}
            defaultPhase={selectedPhase === 'all' ? undefined : selectedPhase}
          />
        )}

        {/* Edit Story Form */}
        {storyToEdit && (
          <StoryForm
            story={storyToEdit}
            onClose={() => setStoryToEdit(null)}
          />
        )}

        {/* Add/Edit Subtask Form */}
        {subtaskStoryId && (
          <SubtaskForm
            storyId={subtaskStoryId}
            subtask={subtaskToEdit ?? undefined}
            onClose={() => {
              setSubtaskStoryId(null);
              setSubtaskToEdit(null);
            }}
          />
        )}

        {/* Delete Story Modal */}
        <DeleteStoryModal
          isOpen={!!storyToDelete}
          onClose={() => setStoryToDelete(null)}
          onConfirm={() => void handleConfirmDelete()}
          story={storyToDelete}
          isDeleting={deleteStory.isPending}
        />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header with Search, Phase, and Actions */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 space-y-4">
        <div className="max-w-7xl mx-auto">
          {/* Row 1: Search, Phase Dropdown, New Story Button */}
          <div className="flex items-center gap-4">
            {/* Search Bar - flex-1 to take available space, remove bottom margin for alignment */}
            <div className="flex-1 [&_.search-container]:mb-0">
              <SearchBar
                value={searchQuery}
                onChange={handleSearchChange}
                placeholder="Search stories..."
                inputRef={searchInputRef}
              />
            </div>

            {/* Phase Selector */}
            <div className="w-64 flex-shrink-0">
              <Select
                value={selectedPhase}
                onChange={(value) => setSelectedPhase(value)}
                options={phaseOptions}
                placeholder="Select phase..."
              />
            </div>

            {/* New Story Button */}
            <Button
              onClick={() => setShowNewStoryForm(true)}
              className="flex items-center space-x-2 flex-shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>New Story</span>
            </Button>
          </div>

          {/* Row 2: Tag Filters */}
          <div className="flex items-center gap-4">
            <KanbanFilters availableTags={allTags} storiesForCounts={storiesForTagCounts} />
            {hasActiveFilters && (
              <p className="text-sm text-gray-500 dark:text-gray-400 flex-shrink-0">
                Showing {filteredStories.length} of {allStories.length} stories
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Story Filter Banner */}
      {filteredStoryId && filteredStory && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
          <div className="max-w-7xl mx-auto px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Filtering subtasks for story:
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                  {filteredStory.id} - {filteredStory.title}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilteredStoryId(null)}
                className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 hover:bg-blue-100 dark:hover:bg-blue-900/40"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filter
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dual-Panel Layout */}
      <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              Loading stories...
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Stories Panel */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => {
                    if (!storiesExpanded && selectedStoryId) {
                      setSelectedStoryId(null);
                    }
                    setStoriesExpanded(!storiesExpanded);
                  }}
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedStoryId && !storiesExpanded
                      ? `Story - ${selectedStory?.id} - ${selectedStory?.title}`
                      : 'Stories'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1"
                    aria-label={storiesExpanded ? "Collapse stories section" : "Expand stories section"}
                  >
                    {storiesExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {storiesExpanded && (
                  <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
                    <div className="results-viewport">
                      <div className="grid gap-6 min-h-[400px] grid-cols-1 lg:grid-cols-4">
                        {storyColumns.map((column) => {
                          const columnStories = filteredStories.filter((story) => story.status === column.id);
                          return (
                            <KanbanColumn
                              key={column.id}
                              column={column}
                              stories={columnStories}
                              completedTaskStatuses={completedTaskStatuses}
                            />
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tasks Panel */}
              <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  onClick={() => setTasksExpanded(!tasksExpanded)}
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {selectedStoryId ? `Tasks - ${selectedStory?.id}` : 'Tasks'}
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="p-1"
                    aria-label={tasksExpanded ? "Collapse tasks section" : "Expand tasks section"}
                  >
                    {tasksExpanded ? (
                      <ChevronUp className="h-5 w-5" />
                    ) : (
                      <ChevronDown className="h-5 w-5" />
                    )}
                  </Button>
                </div>

                {tasksExpanded && (
                  <div className="p-4 border-t border-gray-200 dark:border-neutral-700">
                    <div className="results-viewport">
                      <div className="grid gap-6 min-h-[300px] grid-cols-1 lg:grid-cols-3">
                        {subtaskColumns.map((column) => {
                          const columnTasks = tasksToShow.filter((task) => task.status === column.id);
                          return (
                            <KanbanColumn
                              key={`subtask-${column.id}`}
                              column={{ ...column, id: `subtask-${String(column.id)}` as StoryStatus }}
                              stories={[]}
                              subtasks={columnTasks}
                              completedTaskStatuses={completedTaskStatuses}
                              subtaskToStoryMap={subtaskToStoryMap}
                            />
                          );
                        })}
                      </div>
                      {tasksToShow.length === 0 && (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                          <p>No tasks available</p>
                          {selectedStoryId && (
                            <p className="text-sm mt-2">
                              Select a different story or add subtasks to {selectedStory?.id}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Drag Overlays */}
              <DragOverlay>
                {activeStory && (
                  <StoryCard
                    story={activeStory}
                    completedTaskStatuses={completedTaskStatuses}
                  />
                )}
                {activeSubtask && (
                  <SubtaskCard subtask={activeSubtask} />
                )}
              </DragOverlay>
            </DndContext>
          )}
      </div>

      {/* New Story Form */}
      {showNewStoryForm && (
        <StoryForm
          onClose={() => setShowNewStoryForm(false)}
          defaultPhase={selectedPhase === 'all' ? undefined : selectedPhase}
        />
      )}
    </div>
  );
}
