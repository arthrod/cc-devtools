import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { Button } from '../shared/Button.js';

interface Memory {
  id: string;
  summary: string;
}

interface DeleteMemoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  memory: Memory | null;
  isDeleting: boolean;
}

/**
 * Confirmation modal for permanently deleting a stored memory.
 * Provides warnings about data loss and disables interaction during deletion process.
 */
export function DeleteMemoryModal({
  isOpen,
  onClose,
  onConfirm,
  memory,
  isDeleting,
}: DeleteMemoryModalProps): JSX.Element | null {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    const modal = modalRef.current;
    if (!modal) return undefined;

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
        '[contenteditable]:not([contenteditable="false"])',
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

    return (): void => {
      clearTimeout(timeoutId);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [isOpen, onClose, isDeleting]);

  if (!isOpen || !memory) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        ref={modalRef}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center space-x-3 p-6 border-b border-gray-200 dark:border-gray-700">
          <AlertTriangle className="w-6 h-6 text-red-500" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Delete Memory
          </h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              Memory to Delete:
            </h3>
            <div className="space-y-1">
              <div className="text-sm">
                <span className="text-gray-900 dark:text-gray-100 font-medium">
                  {memory.summary}
                </span>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                ID: {memory.id}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>This action cannot be undone.</strong> The memory will be
              permanently deleted.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <Button variant="secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete Memory'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
