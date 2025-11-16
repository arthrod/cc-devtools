import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { Clock, CheckCircle2, Edit2, Trash2, Plus, Tag, Filter, FileText } from 'lucide-react';
import type { Story, SubtaskStatus } from '../../../../kanban/types.js';
import clsx from 'clsx';
import { StoryForm } from './StoryForm';
import { SubtaskForm } from './SubtaskForm';
import { DeleteStoryModal } from './DeleteStoryModal';
import { useDeleteStory } from '../../hooks/useStories';
import { useKanbanStore } from '../../stores/kanbanStore';
import { useQuery } from '@tanstack/react-query';
import { fetchStoryReviews } from '../../services/kanban.service';

interface StoryCardProps {
  story: Story;
  completedTaskStatuses?: SubtaskStatus[];
}

/**
 * Draggable story card displaying story details
 * Shows title, description, business value, effort, and subtask progress
 */
export function StoryCard({ story, completedTaskStatuses = ['done'] }: StoryCardProps): JSX.Element {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showSubtaskForm, setShowSubtaskForm] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const deleteStory = useDeleteStory();
  const { toggleStorySelection } = useKanbanStore();

  const { data: reviews = [] } = useQuery({
    queryKey: ['story-reviews', story.id],
    queryFn: () => fetchStoryReviews(story.id),
    staleTime: 5 * 60 * 1000,
  });

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: story.id });

  // Track drag state to prevent click handlers from firing during drag operations
  if (transform && !hasDragged) {
    setHasDragged(true);
  }

  if (!isDragging && hasDragged) {
    setHasDragged(false);
  }

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  // Handle context menu clicks outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setShowContextMenu(false);
      }
    };

    const handleEscape = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setShowContextMenu(false);
      }
    };

    if (showContextMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showContextMenu]);

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenuPosition({ x: e.clientX, y: e.clientY });
    setShowContextMenu(true);
  };

  const handleFilterSubtasks = (): void => {
    toggleStorySelection(story.id);
    setShowContextMenu(false);
  };

  // Calculate subtask completion
  const completedSubtasks = story.subtasks?.filter(s =>
    s.status && completedTaskStatuses.includes(s.status)
  ).length ?? 0;
  const totalSubtasks = story.subtasks?.length ?? 0;
  const hasSubtasks = totalSubtasks > 0;

  // Business value color mapping
  const getBusinessValueColor = (value?: string): string => {
    const colors: Record<string, string> = {
      'XS': 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      'S': 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      'M': 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      'L': 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
      'XL': 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };
    return colors[value ?? 'M'] ?? colors.M;
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        {...listeners}
        onContextMenu={handleContextMenu}
        className={clsx(
          'bg-white dark:bg-neutral-800 rounded-lg p-4',
          'cursor-grab active:cursor-grabbing',
          'hover:shadow-md transition-all duration-200 group',
          'border border-neutral-200 dark:border-neutral-700',
          'select-none',
          isDragging && 'opacity-50 rotate-2 shadow-xl'
        )}
      >
      {/* Story ID and Actions */}
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded pointer-events-none">
          {story.id}
        </span>
        <div className="flex items-center space-x-1">
          {hasSubtasks && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleFilterSubtasks();
              }}
              className="opacity-0 hover:opacity-100 group-hover:opacity-60 p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border hover:border-gray-300 dark:hover:border-neutral-600 group-hover:border group-hover:border-gray-300 dark:group-hover:border-neutral-600 transition-all duration-200 pointer-events-auto"
              title="Filter subtasks for this story"
              aria-label="Filter subtasks for this story"
            >
              <Filter className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowEditForm(true);
            }}
            className="opacity-0 hover:opacity-100 group-hover:opacity-60 p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border hover:border-gray-300 dark:hover:border-neutral-600 group-hover:border group-hover:border-gray-300 dark:group-hover:border-neutral-600 transition-all duration-200 pointer-events-auto"
            title="Edit story"
            aria-label="Edit story"
          >
            <Edit2 className="h-3 w-3 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSubtaskForm(true);
            }}
            className="opacity-0 hover:opacity-100 group-hover:opacity-60 p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border hover:border-gray-300 dark:hover:border-neutral-600 group-hover:border group-hover:border-gray-300 dark:group-hover:border-neutral-600 transition-all duration-200 pointer-events-auto"
            title="Add subtask"
            aria-label="Add subtask"
          >
            <Plus className="h-3 w-3 text-gray-500 dark:text-gray-400" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
            className="opacity-0 hover:opacity-100 group-hover:opacity-60 p-1 rounded-sm hover:bg-red-50 dark:hover:bg-red-900/20 hover:border hover:border-red-300 dark:hover:border-red-700 group-hover:border group-hover:border-gray-300 dark:group-hover:border-neutral-600 transition-all duration-200 pointer-events-auto"
            title="Delete story"
            aria-label="Delete story"
          >
            <Trash2 className="h-3 w-3 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
          </button>
        </div>
      </div>

      {/* Title and Description */}
      <div className="mb-3 pointer-events-none">
        <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-5 line-clamp-2 mb-1">
          {story.title}
        </h4>
        {story.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
            {story.description}
          </p>
        )}
      </div>

      {/* Metadata */}
      <div className="flex items-center justify-between text-xs pointer-events-none">
        <div className="flex items-center space-x-2">
          {story.business_value && (
            <span className={clsx('px-2 py-1 rounded text-xs font-medium', getBusinessValueColor(story.business_value))}>
              {story.business_value}
            </span>
          )}

          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{story.effort_estimation_hours ?? 0}h</span>
          </div>

          {reviews.length > 0 && (
            <div className="flex items-center space-x-1 text-purple-600 dark:text-purple-400">
              <FileText className="h-3 w-3" />
              <span>{reviews.length} {reviews.length === 1 ? 'Review' : 'Reviews'}</span>
            </div>
          )}
        </div>

        {hasSubtasks && (
          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
            <CheckCircle2 className="h-3 w-3" />
            <span>{completedSubtasks}/{totalSubtasks}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {story.labels && story.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {story.labels.map((label, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded text-xs"
            >
              <Tag className="h-2 w-2 mr-1" />
              {label}
            </span>
          ))}
        </div>
      )}

      {/* Progress Bar */}
      {hasSubtasks && (
        <div className="mt-2 pointer-events-none">
          <div className="w-full bg-gray-200 dark:bg-neutral-700 rounded-full h-1">
            <div
              className="bg-green-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${(completedSubtasks / totalSubtasks) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Subtasks Preview (first 3) */}
      {hasSubtasks && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-700 pointer-events-none">
          <div className="space-y-1">
            {story.subtasks?.slice(0, 3).map((subtask) => (
              <div key={subtask.id} className="flex items-center text-xs">
                <div className={clsx(
                  'w-2 h-2 rounded-full mr-2',
                  subtask.status && completedTaskStatuses.includes(subtask.status)
                    ? 'bg-green-500'
                    : 'bg-gray-300 dark:bg-neutral-600'
                )} />
                <span className={clsx(
                  'flex-1',
                  subtask.status && completedTaskStatuses.includes(subtask.status)
                    ? 'line-through text-gray-400 dark:text-gray-500'
                    : 'text-gray-700 dark:text-gray-300'
                )}>
                  {subtask.title}
                </span>
                <span className="text-gray-400 dark:text-gray-500 text-xs ml-1">
                  {subtask.effort_estimation_hours ?? 0}h
                </span>
              </div>
            ))}
            {totalSubtasks > 3 && (
              <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-1">
                +{totalSubtasks - 3} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Dependencies */}
      {story.dependent_upon && story.dependent_upon.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-700 pointer-events-none">
          <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
            Blocked by:
          </div>
          <div className="flex flex-wrap gap-1">
            {story.dependent_upon.map((depId) => (
              <span
                key={depId}
                className="inline-block px-2 py-1 text-xs font-mono bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200 rounded"
                title={`This story depends on ${depId}`}
              >
                {depId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Forms */}
      {showEditForm && (
        <StoryForm
          story={story}
          onClose={() => setShowEditForm(false)}
        />
      )}
      {showSubtaskForm && (
        <SubtaskForm
          storyId={story.id}
          onClose={() => setShowSubtaskForm(false)}
        />
      )}
      </div>

      {/* Delete Modal */}
      <DeleteStoryModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          await deleteStory.mutateAsync(story.id);
          setShowDeleteModal(false);
        }}
        story={story}
        isDeleting={deleteStory.isPending}
      />

      {/* Context Menu */}
      {showContextMenu && createPortal(
        <div
          ref={contextMenuRef}
          className="fixed bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 z-50 min-w-[180px]"
          style={{
            left: `${contextMenuPosition.x}px`,
            top: `${contextMenuPosition.y}px`,
          }}
        >
          <button
            onClick={() => {
              setShowEditForm(true);
              setShowContextMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-2"
          >
            <Edit2 className="h-4 w-4" />
            Edit Story
          </button>
          <button
            onClick={() => {
              setShowSubtaskForm(true);
              setShowContextMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Subtask
          </button>
          {hasSubtasks && (
            <button
              onClick={handleFilterSubtasks}
              className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-neutral-700 flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filter Subtasks
            </button>
          )}
          <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
          <button
            onClick={() => {
              setShowDeleteModal(true);
              setShowContextMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Story
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
