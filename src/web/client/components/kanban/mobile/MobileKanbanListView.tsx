import { MobileKanbanCard } from './MobileKanbanCard';
import { MobileSubtaskCard, type SubtaskWithParent } from './MobileSubtaskCard';
import { MobileSubtaskViewHeader } from './MobileSubtaskViewHeader';
import { MobileSubtaskViewEmptyState } from './MobileSubtaskViewEmptyState';
import { BottomSheet, type BottomSheetAction } from '../../common/BottomSheet';
import { useState, useMemo } from 'react';
import { Pencil, Plus, Filter, Trash2, List } from 'lucide-react';
import { formatColumnDisplayName } from '../../../utils/column-utils';
import { useKanbanStore } from '../../../stores/kanbanStore.js';
import type { Story, StoryStatus, SubtaskStatus } from '../../../../../kanban/types.js';

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

interface MobileKanbanListViewProps {
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
 * Mobile-optimized list view for kanban stories.
 * Displays all stories in a single column grouped by status with status chips.
 * Each story shows current status as a colored chip and provides touch-friendly interactions.
 */
export function MobileKanbanListView({
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
}: MobileKanbanListViewProps): JSX.Element {
  const { mobileViewMode, mobileSelectedStoryId, enterSubtaskView } = useKanbanStore();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [selectedSubtask, setSelectedSubtask] = useState<SubtaskWithParent | null>(null);
  const [showBottomSheet, setShowBottomSheet] = useState(false);

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
      const nextStatus = storyColumns[currentIndex + 1];
      return nextStatus ?? null;
    }
    return null;
  };

  const getPreviousStatus = (currentStatus: StoryStatus): StoryStatus | null => {
    const currentIndex = storyColumns.indexOf(currentStatus);
    if (currentIndex > 0) {
      const prevStatus = storyColumns[currentIndex - 1];
      return prevStatus ?? null;
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
      return subtaskColumns.reduce((acc: Record<SubtaskStatus, SubtaskWithParent[]>, status: SubtaskStatus) => {
        acc[status] = (currentStory.subtasks ?? [])
          .map(subtask => ({
            ...subtask,
            parentStoryId: currentStory.id,
            parentStoryTitle: currentStory.title,
          }))
          .filter((subtask: SubtaskWithParent) => subtask.status === status);
        return acc;
      }, {} as Record<SubtaskStatus, SubtaskWithParent[]>);
    }
    return {} as Record<SubtaskStatus, SubtaskWithParent[]>;
  }, [mobileViewMode, currentStory]);

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

  const storiesByStatus = storyColumns.reduce((acc: Record<StoryStatus, Story[]>, status: StoryStatus) => {
    acc[status] = stories.filter((story: Story) => story.status === status);
    return acc;
  }, {} as Record<StoryStatus, Story[]>);

  if (mobileViewMode === 'subtasks' && currentStory) {
    const totalSubtasks = currentStory.subtasks?.length ?? 0;

    return (
      <>
        <MobileSubtaskViewHeader story={currentStory} />
        {totalSubtasks === 0 ? (
          <MobileSubtaskViewEmptyState story={currentStory} onAddSubtask={onAddSubtask} />
        ) : (
          <div className="space-y-6 py-4">
            {(['todo', 'in_progress', 'done'] as SubtaskStatus[]).map((status: SubtaskStatus) => {
              const statusSubtasks = subtasksByStatus[status] ?? [];
              if (statusSubtasks.length === 0) return null;

              return (
                <div key={status} className="space-y-3">
                  {/* Status Header */}
                  <div className="flex items-center space-x-3 px-4 pt-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getSubtaskStatusColor(status) }}
                    />
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {getSubtaskStatusDisplayName(status)}
                    </h3>
                    <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                      {statusSubtasks.length}
                    </span>
                  </div>

                  {/* Subtasks in this status */}
                  <div className="space-y-3 px-4">
                    {statusSubtasks.map((subtask: SubtaskWithParent) => (
                      <MobileSubtaskCard
                        key={subtask.id}
                        subtask={subtask}
                        onEdit={onSubtaskEdit}
                        onLongPress={handleSubtaskLongPress}
                        onDragMove={handleSubtaskDragMove}
                        completedTaskStatuses={['done']}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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
      </>
    );
  }

  return (
    <div className="space-y-6 py-4">
      {storyColumns.map((status: StoryStatus) => {
        const statusStories = storiesByStatus[status] ?? [];
        if (statusStories.length === 0) return null;

        return (
          <div key={status} className="space-y-3">
            {/* Status Header */}
            <div className="flex items-center space-x-3 px-4 pt-2">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: getStatusColor(status) }}
              />
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                {getStatusDisplayName(status)}
              </h3>
              <span className="text-xs text-gray-500 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded-full">
                {statusStories.length}
              </span>
            </div>

            {/* Stories in this status */}
            <div className="space-y-3 px-4">
              {statusStories.map((story: Story) => (
                <MobileKanbanCard
                  key={story.id}
                  story={story}
                  onEdit={onStoryEdit}
                  onLongPress={handleLongPress}
                  onDragMove={handleDragMove}
                  completedTaskStatuses={['done']}
                />
              ))}
            </div>
          </div>
        );
      })}

      {/* Empty State */}
      {stories.length === 0 && (
        <div className="text-center py-12 px-4">
          <p className="text-gray-500 dark:text-gray-400">No stories found</p>
        </div>
      )}

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
