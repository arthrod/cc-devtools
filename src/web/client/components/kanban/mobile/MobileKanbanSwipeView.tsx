import { useState, useRef, useMemo } from 'react';
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

interface MobileKanbanSwipeViewProps {
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
 * Mobile-optimized swipe view for kanban stories.
 * Displays columns horizontally with touch-friendly horizontal scrolling.
 * Each column is optimized for mobile with proper touch targets and spacing.
 */
export function MobileKanbanSwipeView({
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
}: MobileKanbanSwipeViewProps): JSX.Element {
  const { mobileViewMode, mobileSelectedStoryId, enterSubtaskView } = useKanbanStore();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState<SubtaskWithParent | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  const getStatusColor = (status: StoryStatus): string => {
    return STATUS_COLORS[status] ?? '#6b7280';
  };

  const getSubtaskStatusColor = (status: SubtaskStatus): string => {
    return SUBTASK_STATUS_COLORS[status] ?? '#6b7280';
  };

  const getStatusDisplayName = (status: StoryStatus): string => {
    return formatColumnDisplayName(status);
  };

  const getSubtaskStatusDisplayName = (status: SubtaskStatus): string => {
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

  const storiesByStatus = storyColumns.map((status: StoryStatus) => ({
    status,
    displayName: getStatusDisplayName(status),
    color: getStatusColor(status),
    stories: stories.filter((story: Story) => story.status === status),
  }));

  const handleLongPress = (story: Story): void => {
    setSelectedStory(story);
    setShowBottomSheet(true);
  };

  const handleSubtaskLongPress = (subtask: SubtaskWithParent): void => {
    setSelectedSubtask(subtask);
    setShowBottomSheet(true);
  };

  const handleDragMove = (story: Story, direction: 'left' | 'right'): void => {
    const targetStatus = direction === 'right'
      ? getNextStatus(story.status)
      : getPreviousStatus(story.status);

    if (targetStatus) {
      onStoryMoveStatus(story, targetStatus);
    }
  };

  const handleSubtaskDragMove = (subtask: SubtaskWithParent, direction: 'left' | 'right'): void => {
    const targetStatus = direction === 'right'
      ? getNextSubtaskStatus(subtask.status)
      : getPreviousSubtaskStatus(subtask.status);

    if (targetStatus && onSubtaskMoveStatus) {
      onSubtaskMoveStatus(subtask, targetStatus);
    }
  };

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

  if (mobileViewMode === 'subtasks' && currentStory) {
    const totalSubtasks = currentStory.subtasks?.length ?? 0;

    return (
      <div className="h-full flex flex-col">
        <MobileSubtaskViewHeader story={currentStory} />
        {totalSubtasks === 0 ? (
          <MobileSubtaskViewEmptyState story={currentStory} onAddSubtask={onAddSubtask} />
        ) : (
          <>
            {/* Horizontal Scroll Container */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
              style={{ scrollBehavior: 'smooth' }}
            >
              <div className="flex h-full" style={{ width: `${subtasksByStatus.length * 320}px` }}>
                {subtasksByStatus.map((statusGroup) => (
                  <div
                    key={statusGroup.status}
                    className="flex-shrink-0 w-80 h-full border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                  >
                    {/* Column Header */}
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: statusGroup.color }}
                          />
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                            {statusGroup.displayName}
                          </h3>
                        </div>
                        <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                          {statusGroup.subtasks.length}
                        </span>
                      </div>
                    </div>

                    {/* Column Content */}
                    <div className="p-4 h-full overflow-y-auto space-y-3 pb-20">
                      {statusGroup.subtasks.map((subtask: SubtaskWithParent) => (
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
                      {statusGroup.subtasks.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            No subtasks
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Scroll Indicators */}
            <div className="flex justify-center py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
              <div className="flex space-x-1">
                {subtasksByStatus.map((_: unknown, index: number) => (
                  <Button
                    key={index}
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      if (scrollRef.current) {
                        scrollRef.current.scrollLeft = index * 320;
                      }
                    }}
                    className="w-2 h-2 min-w-0 min-h-0 p-0 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-400"
                    aria-label={`Scroll to ${subtasksByStatus[index]?.displayName} column`}
                  />
                ))}
              </div>
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
    <div className="h-full flex flex-col">
      {/* Horizontal Scroll Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-hide"
        style={{ scrollBehavior: 'smooth' }}
      >
        <div className="flex h-full" style={{ width: `${storiesByStatus.length * 320}px` }}>
          {storiesByStatus.map((statusGroup) => (
            <div
              key={statusGroup.status}
              className="flex-shrink-0 w-80 h-full border-r border-gray-200 dark:border-gray-700 last:border-r-0"
            >
              {/* Column Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: statusGroup.color }}
                    />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {statusGroup.displayName}
                    </h3>
                  </div>
                  <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                    {statusGroup.stories.length}
                  </span>
                </div>
              </div>

              {/* Column Content */}
              <div className="p-4 h-full overflow-y-auto space-y-3 pb-20">
                {statusGroup.stories.map((story: Story) => (
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
                {statusGroup.stories.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">
                      No stories
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll Indicators */}
      <div className="flex justify-center py-2 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          {storiesByStatus.map((_: unknown, index: number) => (
            <Button
              key={index}
              variant="ghost"
              size="icon-sm"
              onClick={() => {
                if (scrollRef.current) {
                  scrollRef.current.scrollLeft = index * 320;
                }
              }}
              className="w-2 h-2 min-w-0 min-h-0 p-0 rounded-full bg-gray-300 dark:bg-gray-600 hover:bg-gray-500 dark:hover:bg-gray-400"
              aria-label={`Scroll to ${storiesByStatus[index]?.displayName} column`}
            />
          ))}
        </div>
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
