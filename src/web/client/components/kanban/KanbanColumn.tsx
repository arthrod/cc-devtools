import { useDroppable } from '@dnd-kit/core';
import { StoryCard } from './StoryCard.jsx';
import { SubtaskCard } from './SubtaskCard.jsx';
import type { Story, Subtask, StoryStatus, SubtaskStatus } from '../../../../kanban/types.js';
import clsx from 'clsx';

interface Column {
  id: StoryStatus | string;
  title: string;
  color: string;
}

interface KanbanColumnProps {
  column: Column;
  stories?: Story[];
  subtasks?: Subtask[];
  completedTaskStatuses?: SubtaskStatus[];
  subtaskToStoryMap?: Map<string, string>;
}

/**
 * Droppable kanban column displaying stories or subtasks
 * Uses @dnd-kit for drag-and-drop functionality
 */
export function KanbanColumn({
  column,
  stories = [],
  subtasks = [],
  completedTaskStatuses = ['done'],
  subtaskToStoryMap,
}: KanbanColumnProps): JSX.Element {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const itemCount = stories.length + subtasks.length;
  const isSubtaskColumn = subtasks.length > 0;

  return (
    <div
      ref={setNodeRef}
      className={clsx(
        'border-2 border-dashed rounded-lg p-4 min-h-[500px]',
        'transition-colors duration-200',
        'bg-gray-50 dark:bg-neutral-900/50',
        isOver && 'border-solid shadow-lg bg-blue-50 dark:bg-blue-900/20'
      )}
      style={{ borderColor: isOver ? '#3b82f6' : column.color }}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: column.color }}
          />
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {column.title}
          </h3>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-neutral-700 px-2 py-1 rounded-full">
          {itemCount}
        </span>
      </div>

      {/* Story Cards */}
      {!isSubtaskColumn && (
        <div className="space-y-3">
          {stories.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              completedTaskStatuses={completedTaskStatuses}
            />
          ))}

          {stories.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No stories</p>
            </div>
          )}
        </div>
      )}

      {/* Subtask Cards */}
      {isSubtaskColumn && (
        <div className="space-y-3">
          {subtasks.map((subtask) => (
            <SubtaskCard
              key={subtask.id}
              subtask={subtask}
              storyId={subtaskToStoryMap?.get(subtask.id)}
            />
          ))}

          {subtasks.length === 0 && (
            <div className="text-center py-8 text-gray-400 dark:text-gray-500">
              <p className="text-sm">No tasks</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
