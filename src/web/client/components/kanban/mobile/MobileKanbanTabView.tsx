import { useState, useRef, useEffect, useMemo } from 'react';
import { MobileKanbanCard } from './MobileKanbanCard';
import { MobileSubtaskCard, type SubtaskWithParent } from './MobileSubtaskCard';
import { MobileSubtaskViewHeader } from './MobileSubtaskViewHeader';
import { MobileSubtaskViewEmptyState } from './MobileSubtaskViewEmptyState';
import { BottomSheet, type BottomSheetAction } from '../../common/BottomSheet';
import { Pencil, Plus, Filter, Trash2, List } from 'lucide-react';
import { formatColumnDisplayName } from '../../../utils/column-utils';
import { useKanbanStore } from '../../../stores/kanbanStore.js';
import type { Story, StoryStatus, SubtaskStatus } from '../../../../../kanban/types.js';
import { Button } from '../../shared/Button';

const STATUS_COLORS: Record<StoryStatus, string> = {
  'todo': '#6b7280',
  'in_progress': '#3b82f6',
  'in_review': '#f59e0b',
  'done': '#10b981',
};

const SUBTASK_STATUS_COLORS: Record<SubtaskStatus, string> = {
  'todo': '#6b7280',
  'in_progress': '#3b82f6',
  'done': '#10b981',
};

interface MobileKanbanTabViewProps {
  stories: Story[];
  storyColumns: StoryStatus[];
  onStoryEdit: (story: Story) => void;
  onStoryMoveStatus: (story: Story, newStatus: StoryStatus) => void;
  onStoryFilter: (story: Story) => void;
  onStoryDelete: (story: Story) => void;
  onAddSubtask: (story: Story) => void;
  onSubtaskEdit?: (subtask: SubtaskWithParent) => void;
  onSubtaskMoveStatus?: (subtask: SubtaskWithParent, newStatus: SubtaskStatus) => void;
  onSubtaskDelete?: (subtask: SubtaskWithParent) => void;
}

/**
 * Mobile-optimized tab view for kanban stories.
 * Each status gets its own tab with horizontal swipe navigation.
 * Shows stories in a single column within each tab for easy scrolling.
 */
export function MobileKanbanTabView({
  stories,
  storyColumns,
  onStoryEdit,
  onStoryMoveStatus,
  onStoryFilter: _onStoryFilter,
  onStoryDelete,
  onAddSubtask,
  onSubtaskEdit,
  onSubtaskMoveStatus,
  onSubtaskDelete,
}: MobileKanbanTabViewProps): JSX.Element {
  const { mobileViewMode, mobileSelectedStoryId, enterSubtaskView } = useKanbanStore();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState<SubtaskWithParent | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  const tabsRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const getStatusColor = (status: StoryStatus): string => {
    return STATUS_COLORS[status] ?? '#6b7280';
  };

  const getStatusDisplayName = (status: StoryStatus): string => {
    return formatColumnDisplayName(status);
  };

  const getNextStatus = (currentStatus: StoryStatus): StoryStatus | null => {
    const currentIndex = storyColumns.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < storyColumns.length - 1) {
      return storyColumns[currentIndex + 1] ?? null;
    }
    return null;
  };

  const getPreviousStatus = (currentStatus: StoryStatus): StoryStatus | null => {
    const currentIndex = storyColumns.indexOf(currentStatus);
    if (currentIndex > 0) {
      return storyColumns[currentIndex - 1] ?? null;
    }
    return null;
  };

  const getNextSubtaskStatus = (currentStatus: SubtaskStatus): SubtaskStatus | null => {
    const subtaskColumns: SubtaskStatus[] = ['todo', 'in_progress', 'done'];
    const currentIndex = subtaskColumns.indexOf(currentStatus);
    if (currentIndex >= 0 && currentIndex < subtaskColumns.length - 1) {
      return subtaskColumns[currentIndex + 1] ?? null;
    }
    return null;
  };

  const getPreviousSubtaskStatus = (currentStatus: SubtaskStatus): SubtaskStatus | null => {
    const subtaskColumns: SubtaskStatus[] = ['todo', 'in_progress', 'done'];
    const currentIndex = subtaskColumns.indexOf(currentStatus);
    if (currentIndex > 0) {
      return subtaskColumns[currentIndex - 1] ?? null;
    }
    return null;
  };

  const getSubtaskStatusColor = (status: SubtaskStatus): string => {
    return SUBTASK_STATUS_COLORS[status] ?? '#6b7280';
  };

  const getSubtaskStatusDisplayName = (status: SubtaskStatus): string => {
    return formatColumnDisplayName(status);
  };

  const storiesByStatus = storyColumns.map((status: StoryStatus) => ({
    status,
    displayName: getStatusDisplayName(status),
    color: getStatusColor(status),
    stories: stories.filter((story: Story) => story.status === status),
  }));

  const currentStory = useMemo(() => {
    if (mobileViewMode === 'subtasks' && mobileSelectedStoryId) {
      return stories.find(s => s.id === mobileSelectedStoryId) ?? null;
    }
    return null;
  }, [mobileViewMode, mobileSelectedStoryId, stories]);

  const subtasksByStatus = useMemo(() => {
    if (mobileViewMode === 'subtasks' && currentStory) {
      const subtaskColumns: SubtaskStatus[] = ['todo', 'in_progress', 'done'];
      return subtaskColumns.map((status: SubtaskStatus) => ({
        status,
        displayName: getSubtaskStatusDisplayName(status),
        color: getSubtaskStatusColor(status),
        subtasks: (currentStory.subtasks ?? []).map(subtask => ({
          ...subtask,
          parentStoryId: currentStory.id,
          parentStoryTitle: currentStory.title,
        })).filter((subtask: SubtaskWithParent) => subtask.status === status),
      }));
    }
    return [];
  }, [mobileViewMode, currentStory]);

  const handleLongPress = (story: Story): void => {
    setSelectedStory(story);
    setShowBottomSheet(true);
  };

  const handleDragMove = (story: Story, direction: 'left' | 'right'): void => {
    const targetStatus = direction === 'right'
      ? getNextStatus(story.status)
      : getPreviousStatus(story.status);

    if (targetStatus) {
      onStoryMoveStatus(story, targetStatus);

      const targetTabIndex = storyColumns.indexOf(targetStatus);
      if (targetTabIndex >= 0) {
        setActiveTab(targetTabIndex);
      }
    }
  };

  const handleSubtaskLongPress = (subtask: SubtaskWithParent): void => {
    setSelectedSubtask(subtask);
    setShowBottomSheet(true);
  };

  const handleSubtaskDragMove = (subtask: SubtaskWithParent, direction: 'left' | 'right'): void => {
    const targetStatus = direction === 'right'
      ? getNextSubtaskStatus(subtask.status)
      : getPreviousSubtaskStatus(subtask.status);

    if (targetStatus && onSubtaskMoveStatus) {
      onSubtaskMoveStatus(subtask, targetStatus);

      const targetTabIndex = subtasksByStatus.findIndex(group => group.status === targetStatus);
      if (targetTabIndex >= 0) {
        setActiveTab(targetTabIndex);
      }
    }
  };

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    let startX = 0;
    let startY = 0;
    let isScrolling = false;

    const handleTouchStart = (e: TouchEvent): void => {
      const firstTouch = e.touches[0];
      if (!firstTouch) return;
      startX = firstTouch.clientX;
      startY = firstTouch.clientY;
      isScrolling = false;
    };

    const handleTouchMove = (e: TouchEvent): void => {
      if (isScrolling) return;

      const firstTouch = e.touches[0];
      if (!firstTouch) return;
      const deltaX = firstTouch.clientX - startX;
      const deltaY = firstTouch.clientY - startY;

      if (Math.abs(deltaY) > Math.abs(deltaX)) {
        isScrolling = true;
      }
    };

    const handleTouchEnd = (e: TouchEvent): void => {
      if (isScrolling) return;

      const firstTouch = e.changedTouches[0];
      if (!firstTouch) return;
      const endX = firstTouch.clientX;
      const deltaX = endX - startX;

      if (Math.abs(deltaX) > 100) {
        if (deltaX > 0 && activeTab > 0) {
          setActiveTab(activeTab - 1);
        } else if (deltaX < 0 && activeTab < storiesByStatus.length - 1) {
          setActiveTab(activeTab + 1);
        }
      }
    };

    content.addEventListener('touchstart', handleTouchStart);
    content.addEventListener('touchmove', handleTouchMove);
    content.addEventListener('touchend', handleTouchEnd);

    return () => {
      content.removeEventListener('touchstart', handleTouchStart);
      content.removeEventListener('touchmove', handleTouchMove);
      content.removeEventListener('touchend', handleTouchEnd);
    };
  }, [activeTab, storiesByStatus.length]);

  const bottomSheetActions: BottomSheetAction[] = useMemo(() => {
    if (selectedSubtask && mobileViewMode === 'subtasks' && currentStory) {
      return [
        {
          id: 'story-view',
          label: 'Story View',
          icon: <List className="w-5 h-5" />,
          onClick: () => {
            const { exitSubtaskView } = useKanbanStore.getState();
            exitSubtaskView();
          },
        },
        {
          id: 'edit',
          label: 'Edit Subtask',
          icon: <Pencil className="w-5 h-5" />,
          onClick: () => onSubtaskEdit?.(selectedSubtask),
        },
        {
          id: 'add-subtask',
          label: 'Add Subtask',
          icon: <Plus className="w-5 h-5" />,
          onClick: () => onAddSubtask(currentStory),
        },
        {
          id: 'delete',
          label: 'Delete Subtask',
          icon: <Trash2 className="w-5 h-5" />,
          onClick: () => onSubtaskDelete?.(selectedSubtask),
          destructive: true,
        },
      ];
    } else if (selectedStory) {
      return [
        {
          id: 'edit',
          label: 'Edit Story',
          icon: <Pencil className="w-5 h-5" />,
          onClick: () => onStoryEdit(selectedStory),
        },
        {
          id: 'subtask-view',
          label: 'Subtask View',
          icon: <Filter className="w-5 h-5" />,
          onClick: () => enterSubtaskView(selectedStory.id),
          disabled: !selectedStory.subtasks || selectedStory.subtasks.length === 0,
        },
        {
          id: 'add-subtask',
          label: 'Add Subtask',
          icon: <Plus className="w-5 h-5" />,
          onClick: () => onAddSubtask(selectedStory),
        },
        {
          id: 'delete',
          label: 'Delete Story',
          icon: <Trash2 className="w-5 h-5" />,
          onClick: () => onStoryDelete(selectedStory),
          destructive: true,
        },
      ];
    }
    return [];
  }, [selectedStory, selectedSubtask, mobileViewMode, currentStory, enterSubtaskView, onStoryEdit, onAddSubtask, onStoryDelete, onSubtaskEdit, onSubtaskDelete]);

  const activeStatusGroup = storiesByStatus[activeTab];
  const activeSubtaskGroup = subtasksByStatus[activeTab];

  if (mobileViewMode === 'subtasks' && currentStory) {
    const totalSubtasks = currentStory.subtasks?.length ?? 0;

    return (
      <div className="flex flex-col h-full">
        {/* Context Header */}
        <MobileSubtaskViewHeader story={currentStory} />

        {/* Show empty state if no subtasks */}
        {totalSubtasks === 0 ? (
          <MobileSubtaskViewEmptyState story={currentStory} onAddSubtask={onAddSubtask} />
        ) : (
          <>
            {/* Tab Bar */}
            <div
              ref={tabsRef}
              className="flex overflow-x-auto scrollbar-hide bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
            >
              {subtasksByStatus.map((statusGroup, index: number) => (
                <Button
                  key={statusGroup.status}
                  variant="ghost"
                  onClick={() => setActiveTab(index)}
                  className={`
                    flex-shrink-0 px-4 py-3 min-w-[120px] text-sm font-medium h-auto rounded-none
                    ${activeTab === index
                      ? 'text-gray-900 dark:text-gray-100 border-b-2'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }
                  `}
                  style={{
                    borderBottomColor: activeTab === index ? statusGroup.color : 'transparent'
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: statusGroup.color }}
                    />
                    <span className="truncate">{statusGroup.displayName}</span>
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                      {statusGroup.subtasks.length}
                    </span>
                  </div>
                </Button>
              ))}
            </div>

            {/* Tab Content */}
            <div
              ref={contentRef}
              className="flex-1 overflow-y-auto"
            >
              <div className="p-4 space-y-3">
                {activeSubtaskGroup?.subtasks.map((subtask: SubtaskWithParent) => (
                  <MobileSubtaskCard
                    key={subtask.id}
                    subtask={subtask}
                    onEdit={onSubtaskEdit}
                    onLongPress={handleSubtaskLongPress}
                    onDragMove={handleSubtaskDragMove}
                    completedTaskStatuses={['done']}
                  />
                ))}

                {/* Empty State */}
                {activeSubtaskGroup?.subtasks.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400">
                      No subtasks in {activeSubtaskGroup?.displayName}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Swipe Indicator */}
            <div className="flex justify-center py-2 space-x-1">
              {subtasksByStatus.map((_: unknown, index: number) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${
                    activeTab === index
                      ? 'bg-gray-600 dark:bg-gray-300'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Bottom Sheet for Actions */}
        <BottomSheet
          isOpen={showBottomSheet}
          onClose={() => {
            setShowBottomSheet(false);
            setSelectedSubtask(null);
          }}
          title={selectedSubtask ? `Actions for ${selectedSubtask.id}` : 'Subtask Actions'}
          actions={bottomSheetActions}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Tab Bar */}
      <div
        ref={tabsRef}
        className="flex overflow-x-auto scrollbar-hide bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      >
        {storiesByStatus.map((statusGroup, index: number) => (
          <Button
            key={statusGroup.status}
            variant="ghost"
            onClick={() => setActiveTab(index)}
            className={`
              flex-shrink-0 px-4 py-3 min-w-[120px] text-sm font-medium h-auto rounded-none
              ${activeTab === index
                ? 'text-gray-900 dark:text-gray-100 border-b-2'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }
            `}
            style={{
              borderBottomColor: activeTab === index ? statusGroup.color : 'transparent'
            }}
          >
            <div className="flex items-center space-x-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: statusGroup.color }}
              />
              <span className="truncate">{statusGroup.displayName}</span>
              <span className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded-full">
                {statusGroup.stories.length}
              </span>
            </div>
          </Button>
        ))}
      </div>

      {/* Tab Content */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="p-4 space-y-3">
          {activeStatusGroup?.stories.map((story: Story) => (
            <MobileKanbanCard
              key={story.id}
              story={story}
              onEdit={onStoryEdit}
              onLongPress={handleLongPress}
              onDragMove={handleDragMove}
              completedTaskStatuses={['done']}
            />
          ))}

          {/* Empty State */}
          {activeStatusGroup?.stories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 dark:text-gray-400">
                No stories in {activeStatusGroup?.displayName}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Swipe Indicator */}
      <div className="flex justify-center py-2 space-x-1">
        {storiesByStatus.map((_: unknown, index: number) => (
          <div
            key={index}
            className={`w-1.5 h-1.5 rounded-full transition-colors ${
              activeTab === index
                ? 'bg-gray-600 dark:bg-gray-300'
                : 'bg-gray-300 dark:bg-gray-600'
            }`}
          />
        ))}
      </div>

      {/* Bottom Sheet for Actions */}
      <BottomSheet
        isOpen={showBottomSheet}
        onClose={() => {
          setShowBottomSheet(false);
          setSelectedStory(null);
        }}
        title={selectedStory ? `Actions for ${selectedStory.id}` : 'Story Actions'}
        actions={bottomSheetActions}
      />
    </div>
  );
}
