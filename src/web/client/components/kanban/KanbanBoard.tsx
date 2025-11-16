import { useState } from 'react';
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
import { KanbanColumn } from './KanbanColumn.jsx';
import { StoryCard } from './StoryCard.jsx';
import { SkeletonKanbanColumn } from '../common/Skeleton.jsx';
import { useStories, useKanbanConfig, useKanbanMutations } from '../../hooks/useStories.js';
import type { Story, StoryStatus, SubtaskStatus } from '../../../../kanban/types.js';
import clsx from 'clsx';

interface Column {
  id: StoryStatus;
  title: string;
  color: string;
}

interface KanbanBoardProps {
  stories?: Story[];
}

/**
 * Main kanban board component with drag-and-drop functionality
 * Displays stories in columns by status
 */
export function KanbanBoard({ stories: storiesProp }: KanbanBoardProps = {}): JSX.Element {
  const { data: storiesData = [], isLoading, error } = useStories();
  const stories = storiesProp ?? storiesData;
  const { data: config } = useKanbanConfig();
  const { updateStoryStatus } = useKanbanMutations();

  const [activeStory, setActiveStory] = useState<Story | null>(null);

  // Drag sensor with 5px activation distance to prevent accidental drags
  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Define columns based on config or use defaults
  const storyColumns: Column[] = config?.story?.map((status) => {
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

  const completedTaskStatuses: SubtaskStatus[] = config?.subtask?.filter(s => s === 'done') ?? ['done'];

  // Drag handlers
  const handleDragStart = (event: DragStartEvent): void => {
    const storyId = event.active.id as string;
    const story = stories.find((s) => s.id === storyId);
    if (story) {
      setActiveStory(story);
    }
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const storyId = active.id as string;
      const newStatus = over.id as StoryStatus;

      // Find the story being dragged
      const story = stories.find((s) => s.id === storyId);

      if (story && story.status !== newStatus) {
        // Update story status via mutation
        updateStoryStatus.mutate({
          storyId,
          status: newStatus,
        });
      }
    }

    setActiveStory(null);
  };

  // Loading state with skeleton screens
  if (isLoading) {
    return (
      <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700 p-6">
        <div className={clsx(
          'grid gap-6 min-h-[400px]',
          'grid-cols-1 lg:grid-cols-4'
        )}>
          <SkeletonKanbanColumn cardCount={2} />
          <SkeletonKanbanColumn cardCount={3} />
          <SkeletonKanbanColumn cardCount={1} />
          <SkeletonKanbanColumn cardCount={2} />
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-500 dark:text-red-400">
          Failed to load kanban board: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-neutral-900 rounded-lg border border-gray-200 dark:border-neutral-700 p-6">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className={clsx(
            'grid gap-6 min-h-[400px]',
            storyColumns.length === 3 && 'grid-cols-1 lg:grid-cols-3',
            storyColumns.length === 4 && 'grid-cols-1 lg:grid-cols-4',
            storyColumns.length === 5 && 'grid-cols-1 lg:grid-cols-5'
          )}>
            {storyColumns.map((column) => {
              const columnStories = stories.filter((story) => story.status === column.id);

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

          {/* Drag Overlay */}
          <DragOverlay>
            {activeStory && (
              <StoryCard
                story={activeStory}
                completedTaskStatuses={completedTaskStatuses}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
  );
}
