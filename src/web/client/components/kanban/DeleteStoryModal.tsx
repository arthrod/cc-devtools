import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../shared/Button.js';
import type { Story } from '../../../../kanban/types.js';

interface DeleteStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  story: Story | null;
  isDeleting: boolean;
}

/**
 * Confirmation modal for story deletion with impact warnings.
 * Displays story details and subtask count warnings.
 */
export function DeleteStoryModal({
  isOpen,
  onClose,
  onConfirm,
  story,
  isDeleting
}: DeleteStoryModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null);

  /**
   * Implements keyboard navigation focus trap for accessibility.
   */
  useEffect(() => {
    if (!isOpen) return;

    const modal = modalRef.current;
    if (!modal) return;

    const focusFirstElement = (): void => {
      const focusableElements = getFocusableElements();
      if (focusableElements.length > 0) {
        focusableElements[0]?.focus();
      }
    };

    const getFocusableElements = (): HTMLElement[] => {
      const selectors = [
        'input:not([disabled]):not([tabindex="-1"])',
        'button:not([disabled]):not([tabindex="-1"])',
        'textarea:not([disabled]):not([tabindex="-1"])',
        'select:not([disabled]):not([tabindex="-1"])',
        '[tabindex]:not([tabindex="-1"])',
        '[contenteditable]:not([contenteditable="false"])'
      ];

      const elements = modal.querySelectorAll(selectors.join(','));
      return Array.from(elements).filter((el): el is HTMLElement => {
        if (!(el instanceof HTMLElement)) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && el.offsetParent !== null;
      });
    };

    const handleKeyDown = (e: KeyboardEvent): void => {
      if (!modal.contains(e.target as Node)) return;

      if (e.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement?.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement?.focus();
          }
        }
      }

      if (e.key === 'Escape' && !isDeleting) {
        e.preventDefault();
        onClose();
      }
    };

    const timeoutId = setTimeout(focusFirstElement, 10);

    document.addEventListener('keydown', handleKeyDown, true);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, isDeleting, onClose]);

  if (!isOpen || !story) return null;

  const totalSubtasks = story.subtasks?.length ?? 0;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div ref={modalRef} className="bg-white dark:bg-neutral-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center space-x-3 p-6 border-b border-neutral-200 dark:border-neutral-700">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h2 className="text-lg font-semibold text-neutral-900 dark:text-neutral-100">
            Delete Story
          </h2>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4">
            <h3 className="font-medium text-neutral-900 dark:text-neutral-100 mb-2">
              Story to Delete:
            </h3>
            <div className="space-y-1">
              <div className="text-sm">
                <span className="font-mono text-neutral-600 dark:text-neutral-400">{story.id}</span>
                <span className="ml-2 text-neutral-900 dark:text-neutral-100 font-medium">{story.title}</span>
              </div>
              {story.description && (
                <div className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                  {story.description}
                </div>
              )}
              {story.business_value && (
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Business Value: {story.business_value} • Effort: {story.effort_estimation_hours ?? 0}h
                </div>
              )}
            </div>
          </div>

          {totalSubtasks > 0 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
                    This story has {totalSubtasks} subtask{totalSubtasks !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                    All subtasks and their details will be permanently deleted along with the story.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-neutral-50 dark:bg-neutral-700 rounded-lg p-4">
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              <strong>This action cannot be undone.</strong> The story{totalSubtasks > 0 ? ' and all its subtasks' : ''} will be permanently deleted.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-neutral-200 dark:border-neutral-700">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? 'Deleting...' : 'Delete Story'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
