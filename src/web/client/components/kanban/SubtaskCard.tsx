import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useDraggable } from '@dnd-kit/core';
import { Clock, Edit2, Trash2, AlertCircle } from 'lucide-react';
import type { Subtask } from '../../../../kanban/types.js';
import clsx from 'clsx';
import { SubtaskForm } from './SubtaskForm';
import { DeleteSubtaskModal } from './DeleteSubtaskModal';
import { useDeleteSubtask } from '../../hooks/useStories';

interface SubtaskCardProps {
  subtask: Subtask;
  storyId?: string;
}

/**
 * Draggable subtask card displaying subtask details
 */
export function SubtaskCard({ subtask, storyId }: SubtaskCardProps): JSX.Element {
  const [showEditForm, setShowEditForm] = useState(false);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [hasDragged, setHasDragged] = useState(false);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const deleteSubtask = useDeleteSubtask();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({ id: subtask.id });

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
        {/* Subtask ID and Actions */}
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-neutral-700 px-2 py-1 rounded pointer-events-none">
            {subtask.id}
          </span>
          <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowEditForm(true)}
              className="opacity-0 hover:opacity-100 group-hover:opacity-60 p-1 rounded-sm hover:bg-gray-100 dark:hover:bg-neutral-700 hover:border hover:border-gray-300 dark:hover:border-neutral-600 group-hover:border group-hover:border-gray-300 dark:group-hover:border-neutral-600 transition-all duration-200 pointer-events-auto"
              title="Edit subtask"
              aria-label="Edit subtask"
            >
              <Edit2 className="h-3 w-3 text-gray-500 dark:text-gray-400" />
            </button>
            <button
              onClick={() => {
                setShowDeleteModal(true);
              }}
              className="opacity-0 hover:opacity-100 group-hover:opacity-60 p-1 rounded-sm hover:bg-red-50 dark:hover:bg-red-900/20 hover:border hover:border-red-300 dark:hover:border-red-700 group-hover:border group-hover:border-gray-300 dark:group-hover:border-neutral-600 transition-all duration-200 pointer-events-auto"
              title="Delete subtask"
              aria-label="Delete subtask"
            >
              <Trash2 className="h-3 w-3 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400" />
            </button>
          </div>
        </div>

        {/* Title and Description */}
        <div className="mb-3 pointer-events-none">
          <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm leading-5 line-clamp-2 mb-1">
            {subtask.title}
          </h4>
          {subtask.description && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
              {subtask.description}
            </p>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center justify-between text-xs pointer-events-none">
          <div className="flex items-center space-x-1 text-gray-500 dark:text-gray-400">
            <Clock className="h-3 w-3" />
            <span>{subtask.effort_estimation_hours ?? 0}h</span>
          </div>
        </div>

        {/* Dependencies */}
        {subtask.dependent_upon && subtask.dependent_upon.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-neutral-700 pointer-events-none">
            <div className="flex items-center gap-2 text-xs text-yellow-700 dark:text-yellow-300">
              <AlertCircle className="h-3 w-3" />
              <span>Blocked by: {subtask.dependent_upon.join(', ')}</span>
            </div>
          </div>
        )}

        {/* Forms */}
        {showEditForm && storyId && (
          <SubtaskForm
            subtask={subtask}
            storyId={storyId}
            onClose={() => setShowEditForm(false)}
          />
        )}
      </div>

      {/* Delete Modal */}
      <DeleteSubtaskModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={async () => {
          await deleteSubtask.mutateAsync(subtask.id);
          setShowDeleteModal(false);
        }}
        subtask={subtask}
        isDeleting={deleteSubtask.isPending}
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
            Edit Subtask
          </button>
          <div className="border-t border-neutral-200 dark:border-neutral-700 my-1" />
          <button
            onClick={() => {
              setShowDeleteModal(true);
              setShowContextMenu(false);
            }}
            className="w-full text-left px-4 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Subtask
          </button>
        </div>,
        document.body
      )}
    </>
  );
}
